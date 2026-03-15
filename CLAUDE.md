# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Claude Code plugin marketplace** repository. It serves as a registry that lists available plugins users can install via the `/plugin` CLI commands. The marketplace itself contains no runnable application code — it is a metadata-only registry.

## Repository Structure

- `.claude-plugin/marketplace.json` — The core file. Defines the marketplace name (`bazilio-plugins`), owner info, and the array of available plugins with their GitHub source repos, descriptions, and keywords.
- `scripts/pre-commit` — Git pre-commit hook that auto-bumps patch version in `package.json` (skipped for branches ending in `_nap` or `_local`, or when `DONT_BUMP_VERSION=1`).
- `scripts/remove-nul.js` — Windows cleanup utility that removes accidental `nul`/`CON`/`AUX` files created by Windows shell redirections.

## Key Workflows

**Adding a new plugin to the marketplace**: Add an entry to the `plugins` array in `.claude-plugin/marketplace.json` with `name`, `source` (GitHub repo), `description`, `homepage`, `license`, and `keywords`.

**User-facing install commands** (documented in README):
```shell
# Add this marketplace
/plugin marketplace add Bazilio-san/claude-plugins

# Install a plugin from it
/plugin install claude-notification-plugin@bazilio-plugins
```

## Conventions

- Plugin source repos are always on GitHub under the `Bazilio-san` org.
- The marketplace identifier used in install commands is `bazilio-plugins` (the `name` field in `marketplace.json`).
- License: MIT.
