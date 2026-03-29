# Game Shortcuts Generator - Entwicklungsnotizen

## Status: GELÖST (2026-03-29)

**Das Signing funktioniert vollständig.** Alle 22 Shortcuts werden erfolgreich generiert und signiert.

### Root Cause

`shortcuts sign` prüft die **Dateiendung** der Input-Datei. Dateien ohne `.shortcut` Extension werden mit "The file couldn't be opened because it isn't in the correct format" abgelehnt - unabhängig vom Inhalt.

**Alter Code:** `file.shortcut.unsigned` → Signing schlägt fehl
**Fix:** `file.unsigned.shortcut` → Signing funktioniert

Das war das einzige Problem. `shortcuts sign` funktioniert einwandfrei auf macOS 26.x (Tahoe), die XML→Binary-Plist-Pipeline über `plutil -convert binary1` produziert korrekte Dateien.

### Weitere Erkenntnisse (2026-03-29)

- `plutil -replace` und `/usr/libexec/PlistBuddy` ändern intern die Binary-Plist-Struktur, aber `shortcuts sign` akzeptiert auch diese Dateien - solange die Extension `.shortcut` ist
- Kopien mit `cp` oder `dd` funktionieren ebenfalls - solange die Extension `.shortcut` ist
- Die früheren Fehlschläge mit Python (`plistlib`) waren vermutlich auch nur ein Extension-Problem

### Frühere falsche Hypothesen

Die folgenden Annahmen aus der Debugging-Phase waren alle falsch:
- ❌ `shortcuts sign` ist auf Sonoma/Sequoia/Tahoe kaputt
- ❌ Python's `plistlib` erzeugt inkompatible Binary-Plists
- ❌ Die Key-Reihenfolge in der Plist ist relevant
- ❌ Man braucht die Original-Binärdatei von iCloud als Template

---

## Archiv: Frühere Recherche (2025-02-01)

### Referenz-Datei
`reference-unsigned.shortcut` - Eine unsigned Shortcut-Datei von iCloud, war nützlich zum Debuggen.

### Shortcut File Format
- Bis iOS 14: Binary Plist
- Ab iOS 15: Signiert mit "Apple Encrypted Archives"
- Quelle: [Shortcuts File Format](https://zachary7829.github.io/blog/shortcuts/fileformat)

---

## Was funktioniert

1. **Vault-Scanning**: Findet alle 22 Spiele (11 Pokemon, 11 reguläre)
2. **YAML-Parsing**: Extrahiert Frontmatter korrekt
3. **Workflow-Generierung**: Erstellt korrekte Action-Struktur (8 Actions pro Shortcut)
4. **XML Plist**: Wird korrekt generiert
5. **Binary Plist Konvertierung**: `plutil -convert binary1` funktioniert
6. **Signing**: `shortcuts sign --mode anyone` funktioniert
7. **Unit Tests**: Alle 14 Tests bestehen

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

## Befehle

```bash
# Dry-Run (zeigt was generiert würde)
deno run --allow-read --allow-write --allow-env --allow-run main.ts

# Tatsächlich generieren und signieren
deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply

# Nur ein Spiel testen
deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply --filter factorio

# Unit Tests
deno test --allow-read --allow-env test.ts
```
