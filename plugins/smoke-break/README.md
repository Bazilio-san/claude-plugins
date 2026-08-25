# Smoke Break

A tiny Claude Code plugin that periodically nudges the agent to step back and reassess a long-running turn.
Every five minutes of an active turn (configurable), right after a tool call, the agent receives a gentle
checkpoint message: "is the work still progressing according to plan, or is it time to change approach or ask
the user?" The agent is explicitly told to simply continue if things look fine — the nudge is a checkpoint,
not an interruption.

Adapted for Claude Code from the Codex plugin [smoke-break](https://github.com/ElKornacio/agent-plugins/tree/main/plugins/smoke-break)
by [Daniel S (ElKornacio)](https://github.com/ElKornacio), MIT license.

## How it works

Three lifecycle hooks share one dependency-free Node.js script (`scripts/smoke-break.mjs`):

- **UserPromptSubmit** — when the user sends a prompt, the turn start time is written to a per-session state
  file under the system temp directory (`<tmpdir>/claude-smoke-break/<session_id>.json`).
- **PostToolUse** — after every tool call the script compares elapsed time against the interval. The first
  tool call inside each new interval bucket returns `additionalContext` with the reflection nudge; all other
  calls return nothing.
- **Stop** — when the turn ends, the session state file is removed. Files older than 24 hours are also
  cleaned up opportunistically.

The script performs no network requests, has no dependencies, and always exits with code 0 — an internal
error can never break the agent's turn.

## Requirements

Node.js 18+ available on `PATH`.

## Install

```shell
/plugin marketplace add Bazilio-san/claude-plugins
/plugin install smoke-break@bazilio-plugins
```

## Configuration

The reflection interval defaults to five minutes. Override it either with an environment variable:

```shell
SMOKE_BREAK_INTERVAL_MS=600000
```

or with a config file `~/.smoke-break.env` (path can be overridden via `SMOKE_BREAK_CONFIG_FILE`):

```
SMOKE_BREAK_INTERVAL_MS=600000
```

The environment variable takes precedence over the config file.

## License

MIT
