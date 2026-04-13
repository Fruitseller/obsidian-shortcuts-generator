/**
 * TypeScript Type Definitions für den Game Shortcuts Generator
 */

// =============================================================================
// Game Types
// =============================================================================

/** Spieltyp - bestimmt Pfadlogik und Template */
export type GameType = "pokemon" | "game";

/** Frontmatter-Metadaten aus der Spieledatei */
export interface GameMetadata {
  aliases?: string[];
  release?: string;
  platforms?: string[];
  genre?: string[];
  metacritic?: number;
  [key: string]: unknown;
}

/** Vollständige Spielinformation */
export interface Game {
  /** Eindeutiger Identifier (Dateiname ohne .md) */
  slug: string;
  /** Anzeigename (aus aliases oder slug) */
  displayName: string;
  /** Spieltyp */
  type: GameType;
  /** Absoluter Pfad zur .md Datei */
  filePath: string;
  /** Relativer Pfad innerhalb des Vaults */
  vaultPath: string;
  /** Pfad zum Sessions-Ordner (relativ zum Vault) */
  sessionsPath: string;
  /** Pfad zur Hauptdatei (relativ zum Vault) */
  gamePath: string;
  /** Template-Name für Sessions */
  templateName: string;
  /** Geparste Metadaten */
  metadata: GameMetadata;
}

// =============================================================================
// Configuration Types
// =============================================================================

/** Tool-Konfiguration */
export interface Config {
  /** Absoluter Pfad zum Obsidian Vault */
  vaultPath: string;
  /** Basispfad für Spiele innerhalb des Vaults */
  gamesBasePath: string;
  /** Ausgabeverzeichnis für generierte Shortcuts */
  shortcutsOutputDir: string;
  /** Name des Obsidian Vaults (für Actions Plugin) */
  vaultName: string;
}

// =============================================================================
// Dry-Run & Generation Types
// =============================================================================

/** Ergebnis einer einzelnen Shortcut-Generierung im Dry-Run */
export interface ShortcutPreview {
  /** Name des Shortcuts */
  shortcutName: string;
  /** Zieldatei */
  outputPath: string;
  /** Zugehöriges Spiel */
  game: Game;
  /** Anzahl der Actions im Shortcut */
  actionCount: number;
}

/** Ergebnis des Dry-Runs */
export interface DryRunResult {
  /** Gefundene Spieldateien */
  scannedFiles: string[];
  /** Erfolgreich geparste Spiele */
  parsedGames: Game[];
  /** Parse-Fehler */
  parseErrors: ParseError[];
  /** Shortcuts die generiert würden */
  shortcuts: ShortcutPreview[];
  /** Validierungsfehler */
  validationErrors: ValidationError[];
}

/** Parse-Fehler für eine Datei */
export interface ParseError {
  filePath: string;
  error: string;
}

/** Validierungsfehler */
export interface ValidationError {
  game: Game;
  error: string;
}

/** Ergebnis einer Shortcut-Generierung */
export interface GenerationResult {
  game: Game;
  shortcutPath: string;
  success: boolean;
  error?: string;
}

/** Statistiken nach der Generierung */
export interface GenerationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: GenerationResult[];
}

// =============================================================================
// Apple Shortcuts / WFWorkflow Types
// =============================================================================

/** UUID String Type */
export type UUID = string;

/** WFWorkflow Action Parameter Value */
export type WFParameterValue =
  | string
  | number
  | boolean
  | WFSerializationContainer
  | WFParameterValue[]
  | { [key: string]: WFParameterValue };

/** Serialization Container für komplexe Werte */
export interface WFSerializationContainer {
  WFSerializationType: string;
  Value: {
    Type?: string;
    VariableName?: string;
    OutputName?: string;
    OutputUUID?: string;
    string?: string;
    attachmentsByRange?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/** Variable Attachment für Text mit Variablen */
export interface WFTextAttachment {
  Type: string;
  VariableName?: string;
  OutputName?: string;
  OutputUUID?: string;
}

/** Einzelne Shortcut Action */
export interface WFAction {
  WFWorkflowActionIdentifier: string;
  // deno-lint-ignore no-explicit-any
  WFWorkflowActionParameters: Record<string, any>;
}

/** Shortcut Icon Konfiguration */
export interface WFWorkflowIcon {
  WFWorkflowIconStartColor: number;
  WFWorkflowIconGlyphNumber: number;
}

/** Vollständige WFWorkflow Struktur */
export interface WFWorkflow {
  WFWorkflowClientVersion: string;
  WFWorkflowClientRelease: string;
  WFWorkflowMinimumClientVersion: number;
  WFWorkflowMinimumClientVersionString: string;
  WFWorkflowIcon: WFWorkflowIcon;
  WFWorkflowTypes: string[];
  WFWorkflowInputContentItemClasses: string[];
  WFWorkflowActions: WFAction[];
  WFWorkflowImportQuestions: unknown[];
  WFWorkflowOutputContentItemClasses: string[];
  WFQuickActionSurfaces: string[];
}

// =============================================================================
// CLI Types
// =============================================================================

/** CLI Optionen */
export interface CLIOptions {
  /** Tatsächlich Dateien schreiben */
  apply: boolean;
  /** Nur bestimmte Spiele verarbeiten (Slug-Filter) */
  filter?: string;
  /** Verbose Output */
  verbose: boolean;
  /** Hilfe anzeigen */
  help: boolean;
  /** Absoluter Pfad zum Obsidian Vault (überschreibt Config) */
  vault?: string;
  /** Name des Vaults (überschreibt Config, wird aus --vault abgeleitet wenn nicht angegeben) */
  vaultName?: string;
  /** Ausgabeverzeichnis für Shortcuts (überschreibt Config) */
  output?: string;
}
