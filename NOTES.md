# Game Shortcuts Generator - Entwicklungsnotizen

## Status: Signing-Problem - NEUE ERKENNTNISSE (2025-02-01)

**Wichtig:** Das `shortcuts sign` Tool hat laut Benutzer **gestern noch funktioniert** auf genau diesem Mac (macOS 26.2). Der alte funktionierende Code wurde nicht committed.

### Kernfrage
Was hat sich zwischen "funktioniert" und "funktioniert nicht" geändert?

### Getestete Hypothesen (alle FALSCH)

1. ❌ **"macOS shortcuts sign ist generell kaputt"** - FALSCH, es hat gestern noch funktioniert
2. ❌ **"Cherri Compiler als Alternative"** - Nutzt intern auch `shortcuts sign`
3. ❌ **"Shortcut Signing Server"** - Ist nur ein Wrapper um `shortcuts sign`
4. ❌ **"Actions-Struktur ist falsch"** - Actions aus DB extrahiert → sehen identisch aus

### Wichtigster Test-Befund
```bash
# Selbst mit ECHTEN Actions aus der funktionierenden Shortcuts.sqlite:
python3 -c "import plistlib; ..."  # Workflow mit DB-Actions gebaut
shortcuts sign --input workflow.bplist --output test.shortcut
# → "Error: The file couldn't be opened because it isn't in the correct format."
```
**Das bedeutet:** Das Problem liegt NICHT an den Actions selbst, sondern am Workflow-Wrapper oder am erwarteten Input-Format.

### Offene Fragen
1. Welches Format erwartet `shortcuts sign` genau als Input?
2. Wurde gestern vielleicht ein anderer Weg zum Signieren genutzt?
3. Gibt es System-Updates die das Verhalten geändert haben könnten?

### Nächster sinnvoller Schritt
- **Unsigned Shortcut von iCloud API herunterladen und analysieren** (siehe unten)
- Vergleichen mit unserem generierten Format

---

## Recherche-Ergebnisse (2025-02-01)

### Verifizierte Fakten

1. **`shortcuts sign` auf Sonoma/Sequoia problematisch**
   - Laut [Automators Forum](https://talk.automators.fm/t/create-shortcuts-programmatically/18361): "the newest CLI tool appears to have lost this signing ability"
   - Workaround dort vorgeschlagen: VM mit älterem macOS

2. **Unsigned Shortcuts über iCloud API**
   - Upload Shortcut zu iCloud → Link: `https://www.icloud.com/shortcuts/XXXX`
   - URL ändern zu: `https://www.icloud.com/shortcuts/api/records/XXXX`
   - Feld `fields.shortcut.value.downloadURL` enthält unsigned .shortcut
   - Quelle: [0xdevalias Gist](https://gist.github.com/0xdevalias/27d9aea9529be7b6ce59055332a94477)

3. **Alte Libraries nicht nutzbar**
   - [shortcuts-js](https://github.com/joshfarrant/shortcuts-js) - für iOS 12, veraltet
   - Jellycuts - nicht mehr aktiv gewartet
   - Cherri Compiler - nutzt intern auch `shortcuts sign`

4. **Shortcut File Format**
   - Bis iOS 14: Binary Plist
   - Ab iOS 15: Signiert mit "Apple Encrypted Archives"
   - Quelle: [Shortcuts File Format](https://zachary7829.github.io/blog/shortcuts/fileformat)

### DURCHBRUCH (2025-02-01)

**`shortcuts sign` funktioniert!** Das Problem ist wie wir die Plist-Datei schreiben.

#### Test-Ergebnis:
```bash
# Original iCloud-Datei → FUNKTIONIERT
shortcuts sign --input icloud-unsigned.shortcut --output test.shortcut  # ✓ 23KB

# Gleiche Datei durch Python geladen und gespeichert → FEHLER
shortcuts sign --input python-resaved.shortcut --output test.shortcut  # ✗ Format Error
```

#### Ursache:
Python's `plistlib` schreibt die Binary Plist anders:
- **Andere Key-Reihenfolge** (alphabetisch statt original)
- Möglicherweise andere interne Struktur

#### Referenz-Datei:
`reference-unsigned.shortcut` - Eine funktionierende unsigned Shortcut-Datei von iCloud.

#### Lösungsansätze:
1. **plutil statt Python** - `plutil -replace` um einzelne Keys zu ändern ohne die ganze Datei neu zu schreiben
2. **Key-Reihenfolge in Python kontrollieren** - OrderedDict oder sort_keys Parameter
3. **Direkte Binary-Manipulation** - Die Bytes kopieren und nur Actions-Teil ersetzen

---

## Was funktioniert

1. **Vault-Scanning**: Findet alle 18 Spiele (7 Pokemon, 11 reguläre)
2. **YAML-Parsing**: Extrahiert Frontmatter korrekt
3. **Workflow-Generierung**: Erstellt korrekte Action-Struktur
4. **XML Plist**: Wird korrekt generiert
5. **Binary Plist Konvertierung**: `plutil -convert binary1` funktioniert
6. **Unit Tests**: Alle 13 Tests bestehen

---

## Das Problem

```
shortcuts sign --mode anyone --input 'file.unsigned' --output 'file.shortcut'
Error: The file couldn't be opened because it isn't in the correct format.
```

### Ursache (laut Web-Recherche)

- Seit iOS 15 / macOS 12 werden Shortcuts mit "Apple Encrypted Archives" signiert
- Das `shortcuts sign` Tool ist auf **macOS Sonoma und Sequoia bekanntermaßen kaputt**
- Aktuelles System: **macOS 26.2** (Build 25C56) - wahrscheinlich auch betroffen

### Quellen
- https://zachary7829.github.io/blog/shortcuts/fileformat
- https://cherrilang.org/compiler/signing.html
- https://gist.github.com/0xdevalias/27d9aea9529be7b6ce59055332a94477

---

## Generierte Plist-Struktur (verifiziert korrekt)

Unsere generierte Struktur stimmt mit der Referenz aus der Shortcuts.sqlite Datenbank überein:

```xml
<dict>
  <key>WFWorkflowActions</key>
  <array>
    <!-- 8 Actions: Date, Format Date, Text, Combine, CreateNote, AppendNote, CreateDaily, AppendDaily -->
  </array>
  <key>WFWorkflowClientVersion</key>
  <string>2605.0.5</string>
  <!-- ... weitere Metadaten ... -->
</dict>
```

### Actions for Obsidian - Korrekte Identifiers

```typescript
const AFO_BUNDLE_ID = "co.zottmann.ActionsForObsidian";
const AFO_TEAM_ID = "X2WK5Z9VR5";
const AFO_APP_NAME = "Actions For Obsidian";

// Action Identifiers:
// - co.zottmann.ActionsForObsidian.CreateNote
// - co.zottmann.ActionsForObsidian.AppendNote
```

### Variable-Namen (Deutsch!)

- "Datum" (Current Date Output)
- "Formatiertes Datum" (Format Date Output)
- "Text" (Text Action Output)
- "Kombinierter Text" (Combine Text Output)

---

## Mögliche Lösungen zum Testen

### Option 1: iCloud API
Laut Recherche kann man unsigned Shortcuts über die iCloud API hochladen:
1. Shortcut zu iCloud hochladen
2. Link: `https://www.icloud.com/shortcuts/XXXX`
3. Ändern zu: `https://www.icloud.com/shortcuts/api/records/XXXX`
4. `downloadURL` enthält unsigned Shortcut

### Option 2: Älteres macOS
Das `shortcuts sign` Tool auf älteren macOS-Versionen (vor Sonoma) könnte funktionieren.

### Option 3: iOS Shortcut zum Signieren
Einen Shortcut auf iOS erstellen, der andere Shortcuts signiert.

### Option 4: Cherri Compiler
https://cherrilang.org - Ein Compiler für Shortcuts, der auch signieren kann.

### Option 5: Direkt in Shortcuts.sqlite schreiben
Die Shortcuts-App liest aus `~/Library/Shortcuts/Shortcuts.sqlite`. Theoretisch könnte man direkt dort einfügen, aber das ist riskant.

---

## Sandbox-Problem (gelöst)

Claude's Sandbox blockierte Schreibzugriffe auf `~/Downloads/generated-shortcuts/`.
Lösung: `dangerouslyDisableSandbox: true` bei Bash-Befehlen.

---

## Dateien im Projekt

```
obsidian-shortcuts-generator/
├── main.ts          # CLI Entry Point
├── config.ts        # Konfiguration (Vault-Pfad, Output-Dir)
├── scanner.ts       # Vault Scanner
├── parser.ts        # YAML Frontmatter Parser
├── actions.ts       # Workflow Action Builder
├── generator.ts     # Shortcut File Generator
├── types.ts         # TypeScript Interfaces
├── deps.ts          # Inline Dependencies (kein Netzwerk nötig)
├── test.ts          # Unit Tests (13 Tests)
└── diagnose.ts      # Diagnose-Script für File-Writing
```

---

## Nächste Schritte

1. **Signing-Alternative finden** - Das macOS `shortcuts sign` Tool funktioniert nicht
2. **Cherri Compiler testen** - Könnte eine Alternative sein
3. **iCloud API testen** - Upload und Download von unsigned Shortcuts
4. **Oder**: Auf iPhone/iPad signieren lassen

---

## Befehle zum Testen

```bash
# Dry-Run (zeigt was generiert würde)
deno run --allow-read --allow-write --allow-env --allow-run main.ts

# Tatsächlich generieren (unsigned Dateien bleiben erhalten)
deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply

# Nur ein Spiel testen
deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply --filter factorio

# Unit Tests
deno test --allow-read --allow-env test.ts
```

---

## Referenz: Funktionierende Shortcut-Daten

Aus `~/Library/Shortcuts/Shortcuts.sqlite` extrahiert (Play Legenden: Z-A):

```bash
# Actions extrahieren
sqlite3 ~/Library/Shortcuts/Shortcuts.sqlite \
  "SELECT writefile('/tmp/actions.bplist', ZDATA) FROM ZSHORTCUTACTIONS WHERE ZSHORTCUT = 28;"
plutil -convert xml1 -o - /tmp/actions.bplist
```

Die extrahierten Actions stimmen strukturell mit unseren generierten überein.
