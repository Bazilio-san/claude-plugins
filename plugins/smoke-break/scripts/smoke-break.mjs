#!/usr/bin/env node
/**
 * Smoke Break — reflection nudges for long-running Claude Code turns.
 *
 * A single script serves three hook events:
 *   - UserPromptSubmit: remember when the turn started (state file per session);
 *   - PostToolUse: once per interval (default 5 min) emit an additionalContext nudge;
 *   - Stop: drop the session state file.
 *
 * State lives in <tmpdir>/claude-smoke-break/<session_id>.json because every hook
 * invocation is a fresh short-lived process. The script never fails the hook: any
 * internal error results in a silent exit 0.
 *
 * Adapted for Claude Code from the Codex plugin by Daniel S (ElKornacio/agent-plugins), MIT.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const STATE_DIR = join(tmpdir(), 'claude-smoke-break');
const STALE_STATE_MS = 24 * 60 * 60 * 1000;

const readStdinJson = () => {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const resolveIntervalMs = () => {
  const fromEnv = Number(process.env.SMOKE_BREAK_INTERVAL_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  const configFile = process.env.SMOKE_BREAK_CONFIG_FILE || join(homedir(), '.smoke-break.env');
  try {
    const match = readFileSync(configFile, 'utf8').match(/^\s*SMOKE_BREAK_INTERVAL_MS\s*=\s*(\d+)\s*$/m);
    if (match) {
      const value = Number(match[1]);
      if (value > 0) {
        return value;
      }
    }
  } catch {
    // no config file — fall through to the default
  }
  return DEFAULT_INTERVAL_MS;
};

const removeStaleStateFiles = (now) => {
  try {
    for (const name of readdirSync(STATE_DIR)) {
      const file = join(STATE_DIR, name);
      try {
        if (now - statSync(file).mtimeMs > STALE_STATE_MS) {
          unlinkSync(file);
        }
      } catch {
        // another process may have removed it already
      }
    }
  } catch {
    // state dir may not exist yet
  }
};

const writeState = (stateFile, state) => {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state));
};

const buildNudge = (elapsedMs) => {
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
  const minuteLabel = minutes === 1 ? 'minute' : 'minutes';
  return `Smoke break: this turn has been running for about ${minutes} ${minuteLabel}. This is only a gentle checkpoint. Consider whether the work is progressing reasonably and roughly according to plan. If so, or if any deviation seems modest, simply continue. Only if it appears substantially off course or the time spent feels disproportionate, consider whether changing approach or asking the user would help.`;
};

const main = () => {
  const input = readStdinJson();
  const sessionId = String(input.session_id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_');
  const stateFile = join(STATE_DIR, `${sessionId}.json`);
  const now = Date.now();

  switch (input.hook_event_name) {
    case 'UserPromptSubmit': {
      writeState(stateFile, { startedAt: now, notifiedBucket: 0 });
      removeStaleStateFiles(now);
      return;
    }
    case 'Stop': {
      try {
        unlinkSync(stateFile);
      } catch {
        // nothing to clean up
      }
      return;
    }
    case 'PostToolUse': {
      let state;
      try {
        state = JSON.parse(readFileSync(stateFile, 'utf8'));
      } catch {
        // session started before the plugin was installed — begin counting from here
        writeState(stateFile, { startedAt: now, notifiedBucket: 0 });
        return;
      }
      const elapsedMs = now - Number(state.startedAt || now);
      const bucket = Math.floor(elapsedMs / resolveIntervalMs());
      if (bucket > Number(state.notifiedBucket || 0)) {
        writeState(stateFile, { ...state, notifiedBucket: bucket });
        const output = {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: buildNudge(elapsedMs),
          },
        };
        process.stdout.write(JSON.stringify(output));
      }
      return;
    }
    default:
  }
};

try {
  main();
} catch {
  // a broken nudge must never break the agent's turn
}
process.exit(0);
