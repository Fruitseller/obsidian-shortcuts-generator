# Game Shortcuts Generator

Ein Deno/TypeScript-Tool, das einen Obsidian Vault durchsucht, Frontmatter aus Spieldateien parst und Apple Shortcuts programmatisch generiert.

## Features

- 🔍 **Automatische Vault-Durchsuchung** - Findet Pokemon und reguläre Spiele
- 📝 **Frontmatter-Parsing** - Extrahiert Display-Namen aus Aliases
- 🎮 **Programmatische Shortcut-Generierung** - Keine manuellen Templates nötig
- 🛡️ **Dry-Run als Standard** - Sicher testen bevor etwas geschrieben wird
- 📱 **Native Binary Plist** - Kompatibel mit iOS/macOS Shortcuts App

## Requirements

- [Deno](https://deno.land/) v1.40+
- macOS (für Binary Plist Konvertierung via `plutil`)
- Obsidian Vault mit dem [Actions URI Plugin](https://github.com/czottmann/obsidian-actions-uri)

## Installation

```bash
# Repository klonen
git clone https://github.com/yourusername/obsidian-shortcuts-generator.git
cd obsidian-shortcuts-generator

# Oder direkt ausführen (Deno lädt Dependencies automatisch)
deno run --allow-read --allow-write --allow-env --allow-run main.ts
```

## Usage

### Dry-Run (Standard)

Zeigt was generiert würde, ohne Dateien zu schreiben:

```bash
deno run --allow-read --allow-write --allow-env --allow-run main.ts
```

### Shortcuts generieren

```bash
deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply
```

### Nur bestimmte Spiele

```bash
deno run --allow-read --allow-write --allow-env --allow-run main.ts --filter zelda --apply
```

### Hilfe anzeigen

```bash
deno run --allow-read --allow-write --allow-env --allow-run main.ts --help
```

## Vault-Struktur

Das Tool erwartet folgende Ordnerstruktur:

```
vault/
└── hobbies/
    └── videospiele/
        ├── pokemon/
        │   ├── pokemon-red/
        │   │   ├── pokemon-red.md      # Hauptdatei
        │   │   └── sessions/           # Session-Ordner
        │   └── pokemon-blue/
        │       └── pokemon-blue.md
        ├── zelda/
        │   ├── zelda.md                # Hauptdatei
        │   └── sessions/
        └── mario/
            └── mario.md
```

### Frontmatter-Format

```yaml
---
aliases:
  - "The Legend of Zelda"
release: "1986-02-21"
platforms:
  - NES
genre:
  - Action-Adventure
metacritic: 89
---
```

Der erste Eintrag in `aliases` wird als Display-Name verwendet. Ohne Aliases wird der Slug formatiert.

## Generierte Shortcuts

Jeder Shortcut führt folgende Aktionen aus:

1. Holt aktuelles Datum
2. Formatiert Datum als `yyyy-MM-dd`
3. Erstellt Session-Dateinamen: `[datum]_[slug]`
4. Erstellt Session-Note mit Template in Obsidian
5. Fügt Link zur Hauptspieldatei hinzu
6. Öffnet/erstellt Daily Note
7. Fügt Session-Link zur Daily Note hinzu
8. Öffnet die neue Session-Note

## Konfiguration

Die Standardkonfiguration in `config.ts` kann angepasst werden:

```typescript
{
  vaultPath: "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/my-vault",
  gamesBasePath: "hobbies/videospiele",
  shortcutsOutputDir: "~/Downloads/generated-shortcuts",
  vaultName: "my-vault"
}
```

## Projektstruktur

```
├── main.ts        # CLI Einstiegspunkt
├── scanner.ts     # Vault-Scanner
├── parser.ts      # Frontmatter-Parser
├── actions.ts     # WFWorkflow Action Builders
├── generator.ts   # Binary Plist Generierung
├── types.ts       # TypeScript Interfaces
├── config.ts      # Konfiguration
└── README.md
```

## Templates

Das Tool erwartet folgende Templates in deinem Vault:

- `templates/game_session` - Für reguläre Spiele
- `templates/pokemon_game_session` - Für Pokemon-Spiele

## Troubleshooting

### "Vault-Pfad existiert nicht"

Passe den `vaultPath` in `config.ts` an deinen Obsidian Vault-Pfad an.

### "plutil nicht gefunden"

Auf macOS sollte `plutil` standardmäßig verfügbar sein. Falls nicht, werden XML Plists gespeichert (funktionieren auch, sind aber größer).

### Shortcuts werden nicht importiert

1. Stelle sicher, dass du die .shortcut Dateien auf dein iOS-Gerät überträgst
2. Öffne die Datei um sie zu importieren
3. Erlaube "nicht vertrauenswürdige Shortcuts" in den Einstellungen

## License

Unlicense
