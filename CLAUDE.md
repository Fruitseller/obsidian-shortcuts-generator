# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Game Shortcuts Generator is a Deno/TypeScript CLI tool that automates creating Apple Shortcuts for managing video game sessions in Obsidian. It scans an Obsidian vault for game metadata, extracts frontmatter, and generates native `.shortcut` files that integrate with the [Actions for Obsidian](https://github.com/czottmann/obsidian-actions-uri) plugin.

## Commands

```bash
# Dry-run (analyze and preview, no files written)
deno run --allow-read --allow-write --allow-env --allow-run main.ts

# Generate shortcuts
deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply

# Filter to specific game
deno run --allow-read --allow-write --allow-env --allow-run main.ts --filter zelda --apply

# Run tests
deno test --allow-read --allow-env test.ts
```

## Architecture

```
main.ts (CLI orchestrator)
    │
    ├── config.ts      → Loads/validates configuration (vault paths, output dir)
    ├── scanner.ts     → Scans vault filesystem for game files
    ├── parser.ts      → Extracts YAML frontmatter, creates Game objects
    ├── actions.ts     → Builds WFWorkflow action arrays (8 actions per shortcut)
    └── generator.ts   → Converts workflow to plist, handles binary conversion & signing
```

**Data Flow:** vault files → scanner → parser → Game objects → actions → WFWorkflow JSON → XML Plist → Binary Plist → Signed .shortcut

**Supporting Files:**
- `types.ts` - TypeScript interfaces (Game, Config, CLIOptions, etc.)
- `deps.ts` - Inline utilities (path, YAML parser, CLI args) - no external dependencies

## Key Concepts

**Game Types:**
- `pokemon` - Files in `/hobbies/videospiele/pokemon/[game]/[game].md`
- `game` - Files in `/hobbies/videospiele/[game]/[game].md`

**Templates:** Located in `templates/` directory, used by Actions for Obsidian to create session notes.

**Generated Shortcuts:** Each shortcut creates 8 actions that get current date, create session note from template, append link to game file, create/update daily note.

## Configuration

Edit `config.ts` to customize paths:
- `vaultPath` - Obsidian vault root
- `gamesBasePath` - Relative path to games directory
- `shortcutsOutputDir` - Where shortcuts are saved
- `vaultName` - Vault name for Actions plugin

## Known Limitations

The `shortcuts sign` tool is broken on macOS Sonoma/Sequoia. See `NOTES.md` for details and potential workarounds (iCloud API, Cherri Compiler, iOS signing). Unsigned files are generated with `.unsigned` extension for debugging.
