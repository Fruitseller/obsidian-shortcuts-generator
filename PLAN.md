## Plan: Game Shortcuts Generator mit Deno

### Executive Summary

Ein Deno/TypeScript-Tool, das Obsidian Vault durchsucht, Frontmatter aus Spieldateien parst und Apple Shortcuts **komplett programmatisch generiert** (keine manuellen Templates nötig). Nutzt Erkenntnisse aus dem [shortcuts-toolkit](https://github.com/drewburchfield/shortcuts-toolkit) zur direkten Generierung der Binary Plist-Struktur.

**Wichtige Designentscheidung: Dry-Run ist Standard, nicht optional.** Dies schafft einen natürlichen Feedback-Loop für AI Agents und Menschen.

---

### Architekturübersicht

**Kernkomponenten:**
1. **Scanner** - Durchsucht Vault nach Spieldateien
2. **Parser** - Extrahiert Frontmatter (aliases, metadata)
3. **Action Builder** - Baut WFWorkflow-Actions programmatisch
4. **Shortcut Generator** - Erzeugt Binary Plist (.shortcut Dateien)
5. **CLI** - Dry-Run als Default, `--apply` zum Schreiben

**Projektstruktur:**
```
~/shortcuts-generator/
├── main.ts                # CLI Einstiegspunkt
├── scanner.ts             # Vault-Scanner
├── parser.ts              # Frontmatter-Parser
├── actions.ts             # WFWorkflow Action Builders
├── generator.ts           # Shortcut-Generierung (Binary Plist)
├── types.ts               # TypeScript Interfaces
├── config.ts              # Konfiguration
└── README.md
```

---

### Phase 1: Technologie-Entscheidungen

**Deno über Node.js weil:**
- Native TypeScript-Support (kein Compile-Step)
- Kein `node_modules` / `package.json`
- Bessere Security mit expliziten Permissions
- Single-file executable möglich

**Library-Anforderungen:**
- **WICHTIG:** Nutze die **neuesten stabilen Versionen** aller Deno Standard Library Modules
- Für Binary Plist: Prüfe Deno-kompatible Libraries oder nutze Standard Library
- Für YAML/Frontmatter: Deno Standard Library oder leichtgewichtige Parser
- Alle URLs zu Libraries sollen auf neueste stabile Versionen zeigen

**Permissions benötigt:**
```bash
deno run --allow-read --allow-write main.ts
```

**Erkenntnisse aus shortcuts-toolkit:**
- Shortcuts sind Binary Property List (bplist) Dateien
- Struktur: `WFWorkflow` Dictionary mit `WFWorkflowActions` Array
- Jede Action: `WFWorkflowActionIdentifier` + `WFWorkflowActionParameters`
- Kein Signing nötig, nur korrektes Binary Plist Format
- Action Identifiers: `is.workflow.actions.url`, `is.workflow.actions.downloadurl`, etc.

---

### Phase 2: Datenmodell & Types

**Definiere Interfaces für:**
- `Game` - Spielinformationen (slug, display, type, paths)
- `GameMetadata` - Frontmatter-Daten (release, platforms, genre, metacritic)
- `Config` - Tool-Konfiguration (vault path, shortcuts dir, etc.)
- `DryRunResult` - Was würde generiert werden
- `GenerationStats` - Erfolg/Fehler Statistiken
- `WFWorkflow` - Apple Shortcuts Datenstruktur
- `WFAction` - Einzelne Shortcut-Action

**Wichtige Überlegungen:**
- Type-Safety für alle Obsidian-Pfade
- Enum für Game-Types (`pokemon` | `game`)
- Unterscheidung zwischen Pokemon und normalen Games in Pfadlogik

---

### Phase 3: Configuration System

**Konfigurierbare Werte:**
- Vault-Pfad (iCloud Obsidian)
- Games-Basispfad innerhalb Vault
- Shortcuts Output-Verzeichnis
- Vault-Name (für Obsidian Actions Plugin)

**Environment-Unterstützung:**
- `HOME` Environment Variable nutzen
- Pfade plattformübergreifend mit Deno's `path` Modul

---

### Phase 4: Scanner-Implementierung

**Funktionalität:**
1. Durchsuche `hobbies/videospiele/pokemon/*/[slug].md`
2. Durchsuche `hobbies/videospiele/*/[slug].md` (außer pokemon-Ordner)
3. Ignoriere Ordner/Dateien mit `_` Prefix
4. Gib Array von Dateipfaden zurück

**Error Handling:**
- Ordner existiert nicht → Warning, nicht Fatal
- Keine Berechtigung → Klare Fehlermeldung
- Leere Verzeichnisse → Info-Ausgabe

---

### Phase 5: Parser-Implementierung

**Frontmatter Parsing:**
- Implementiere eigenen einfachen YAML-Parser oder nutze Deno Standard Library
- Extrahiere: `aliases`, `release`, `platforms`, `genre`, `metacritic`
- Fallback: Display-Name aus Dateinamen wenn keine Aliases

**Pfad-Logik:**
- Erkenne Pokemon vs. normale Games anhand Ordnerstruktur
- Konstruiere korrekte Pfade für:
  - Sessions-Ordner
  - Game-Hauptdatei  
  - Template-Typ

**Type-Determination:**
- `type: 'pokemon'` wenn Pfad `/pokemon/` enthält
- `type: 'game'` sonst

---

### Phase 6: Action Builder (Shortcuts-Logik)

**Basierend auf shortcuts-toolkit Erkenntnissen:**

**Baue WFWorkflow-Struktur programmatisch:**
- `WFWorkflowClientRelease` / `WFWorkflowClientVersion` - iOS/Shortcuts Versionen
- `WFWorkflowIcon` - Icon-Konfiguration
- `WFWorkflowTypes` - Array von Shortcut-Typen
- `WFWorkflowActions` - Array von Actions

**Actions die benötigt werden:**
1. **Current Date Action** - Aktuelles Datum holen
2. **Format Date Action** - Datum formatieren (yyyy-MM-dd)
3. **Text Action** - Slug mit Unterstrich kombinieren
4. **Combine Text Action** - Datum + Slug zusammenfügen
5. **Create Note Action** (Obsidian Plugin) - Session-Datei erstellen
6. **Append to Note Action** - Zur Game-Hauptdatei anhängen
7. **Daily Note Action** - Daily Note erstellen/öffnen
8. **Append to Daily Note** - Session-Link in Daily Note

**Parameter-Ersetzung:**
- Slug dynamisch einsetzen
- Display-Name dynamisch einsetzen
- Pfade basierend auf Game-Type konstruieren
- Vault-Name einsetzen

**Unterschiede Pokemon vs. Game:**
- Pokemon: Template `templates/pokemon_game_session`
- Game: Template `templates/game_session`
- Pfade unterschiedlich (mit/ohne `/pokemon/` in der Mitte)

---

### Phase 7: Binary Plist Generator

**Shortcuts File Format:**
- Binary Property List mit Header `bplist00`
- Root-Key: `WFWorkflow` (Dictionary)
- Struktur muss exakt Apple's Format entsprechen

**Implementation:**
- Nutze Deno-kompatible Plist-Library (neueste Version!)
- Falls keine Library: Implementiere Binary Plist-Writer selbst
- Output: `.shortcut` Datei die iOS importieren kann

**Dateiname:**
- `Play {Display Name}.shortcut`
- Sonderzeichen wie `:` entfernen

---

### Phase 8: CLI mit Feedback Loops

**Dry-Run als Standard (verpflichtend):**
```
deno run --allow-read --allow-write main.ts
→ Zeigt was passieren würde, schreibt NICHTS

deno run --allow-read --allow-write main.ts --apply
→ Erstellt tatsächlich Shortcuts
```

**Feedback Loop Design für AI Agents:**

1. **Pre-Scan Phase:**
   - Zeige gefundene Spieldateien
   - Zeige Parse-Ergebnisse
   - → Agent kann Probleme erkennen bevor Generation startet

2. **Dry-Run Phase (immer zuerst):**
   - Liste ALLE Shortcuts die generiert würden
   - Zeige vollständige Details pro Shortcut:
     - Shortcut-Name
     - Typ (pokemon/game)
     - Slug
     - Sessions-Pfad
     - Game-File-Pfad
     - Template-Typ
     - Ersetzungen
   - → Agent sieht exakt was passieren wird

3. **Validation Phase:**
   - Prüfe ob Templates existieren (falls nötig)
   - Prüfe ob Zielverzeichnis schreibbar ist
   - Prüfe auf Namenskonflikte
   - → Agent kann Probleme beheben bevor Apply

4. **Apply Phase (nur mit --apply):**
   - Progress-Anzeige während Generierung
   - Success/Failure pro Shortcut
   - Detaillierte Fehler mit Kontext
   - → Agent sieht was erfolgreich war/scheiterte

5. **Post-Generation Phase:**
   - Zusammenfassung mit Statistiken
   - Hinweise auf nächste Schritte
   - Bei Dry-Run: Erinnerung an `--apply` Flag
   - → Agent weiß ob weiterer Eingriff nötig

**Output-Format für AI-lesbarkeit:**
- Strukturierte Ausgabe (nicht nur Prosa)
- Emojis als visuelle Marker (🎮 ✓ ❌ ⚠️ etc.)
- Einrückung für Hierarchie
- Separatoren zwischen Phasen

**Error Handling:**
- Jede Phase kann independent fehlschlagen
- Partielle Erfolge sind möglich (einige Shortcuts ok, andere nicht)
- Klare Attribution: Welcher Fehler bei welchem Spiel

---

### Phase 9: Testing-Strategie

**Manuelle Test-Phasen:**

1. **Dry-Run Test:**
   - Führe ohne `--apply` aus
   - Prüfe Output auf Korrektheit
   - Verifiziere Pfade und Ersetzungen

2. **Single Game Test:**
   - Wähle ein Spiel
   - Generiere mit `--apply`
   - Importiere in Shortcuts App
   - Teste Funktionalität

3. **Full Run Test:**
   - Alle Spiele generieren
   - Importiere alle
   - Teste mehrere Shortcuts

4. **Edge Cases Test:**
   - Spiel ohne Frontmatter
   - Spiel mit fehlendem Ordner
   - Spiel mit Sonderzeichen im Namen
   - Spiel mit sehr langem Namen

**Automated Testing (optional):**
- Unit Tests für Parser
- Unit Tests für Action Builder
- Integration Tests für Scanner
- Snapshot Tests für Generated Output

---

### Phase 10: Documentation

**README.md muss enthalten:**
- Quick Start Guide
- Requirements (Deno Version)
- Usage Examples (Dry-Run & Apply)
- Troubleshooting
- File Structure Erwartungen
- Frontmatter Format
- Erweiterungspunkte

**Code Documentation:**
- JSDoc für alle Public Functions
- Inline-Kommentare für komplexe Logik
- Type-Definitionen als Dokumentation

---

### AI Agent Überlegungen

**Der AI Agent (Claude Code) soll:**

1. **Iterative Development:**
   - Erst Dry-Run implementieren und testen
   - Dann Apply-Logik hinzufügen
   - Schrittweise komplexere Features

2. **Self-Testing:**
   - Nach jeder Implementation: Dry-Run ausführen
   - Output analysieren
   - Bei Problemen: Debugging-Output hinzufügen

3. **Feedback-Integration:**
   - Wenn Dry-Run unerwartete Ergebnisse zeigt
   - Code anpassen basierend auf Output
   - Erneut testen

4. **Error Recovery:**
   - Bei Fehlern: Nicht sofort aufgeben
   - Analysiere Error-Messages
   - Versuche Fixes
   - Dokumentiere was funktioniert/nicht funktioniert

5. **Version Management:**
   - Nutze IMMER neueste stabile Deno STD Library Versionen
   - Wenn Library fehlt: Suche nach Alternativen
   - Dokumentiere Library-Choices im Code

---

### Erfolgs-Kriterien

**Das Tool ist erfolgreich wenn:**
1. Dry-Run zeigt korrekte Liste aller Spiele
2. Dry-Run Output ist vollständig und verständlich
3. Apply generiert importierbare .shortcut Dateien
4. Shortcuts funktionieren in der Shortcuts App
5. Sessions werden korrekt in Obsidian erstellt
6. Links werden korrekt in Daily Notes eingefügt
7. Fehlerhafte Spiele werden übersprungen (nicht fataler Fehler)
8. Statistiken zeigen Success/Failure Rate

---

### Workflow für User

**Bei neuem Spiel:**
1. Erstelle Ordner mit `.md` Datei und Frontmatter in Obsidian
2. Führe Generator im Dry-Run aus
3. Prüfe Output
4. Führe mit `--apply` aus
5. Importiere neue Shortcuts in Shortcuts App

**Bei Updates:**
1. Führe Generator aus
2. Überschreibt existierende Shortcuts
3. Shortcuts App erkennt Update

---

### Verbesserungspotential (Future)

- Watch-Mode (automatisch bei Änderungen)
- Cron-Job Integration
- Shortcut-Synchronisation (erkenne veraltete)
- Config-File für User-Anpassungen
- Template-Varianten (unterschiedliche Session-Formate)
- Batch-Operations (nur bestimmte Spiele)

---

### Wichtige Hinweise für Implementation

**Neueste Library-Versionen:**
- Alle Deno STD Library Imports sollen auf **neueste stabile Version** zeigen
- Bei URL-Imports: Explizite Version angeben (nicht `@latest`)
- Dokumentiere welche Version genutzt wird und warum

**Feedback Loops:**
- Jede Phase soll klaren Output produzieren
- Dry-Run soll AUSFÜHRLICH sein (lieber zu viel als zu wenig)
- Errors sollen actionable sein (nicht nur "failed")
- Success-Messages sollen next steps zeigen

**Shortcuts-Toolkit Integration:**
- Nutze Erkenntnisse zur WFWorkflow-Struktur
- Keine Templates nötig - alles programmatisch
- Binary Plist Format ist der Schlüssel
- Action Identifiers sind dokumentiert


