/**
 * Shortcut Generator - Erzeugt .shortcut Dateien (Binary Plist)
 */

import { join } from "./deps.ts";
import type {
  Config,
  Game,
  WFWorkflow,
  GenerationResult,
  GenerationStats,
  ShortcutPreview,
} from "./types.ts";
import { buildGameWorkflow, createWorkflow } from "./actions.ts";
import { sanitizeForFilename } from "./parser.ts";

// =============================================================================
// XML Plist Serialization
// =============================================================================

/**
 * Escaped XML-Text
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Konvertiert einen JavaScript-Wert zu XML Plist Format
 */
function valueToXmlPlist(value: unknown, indent: number = 0): string {
  const tabs = "\t".repeat(indent);

  if (value === null || value === undefined) {
    return `${tabs}<string></string>`;
  }

  if (typeof value === "string") {
    return `${tabs}<string>${escapeXml(value)}</string>`;
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return `${tabs}<integer>${value}</integer>`;
    }
    return `${tabs}<real>${value}</real>`;
  }

  if (typeof value === "boolean") {
    return value ? `${tabs}<true/>` : `${tabs}<false/>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${tabs}<array/>`;
    }
    const items = value.map((item) => valueToXmlPlist(item, indent + 1)).join("\n");
    return `${tabs}<array>\n${items}\n${tabs}</array>`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `${tabs}<dict/>`;
    }
    const entries = keys
      .map((key) => {
        const keyXml = `${tabs}\t<key>${escapeXml(key)}</key>`;
        const valueXml = valueToXmlPlist(obj[key], indent + 1);
        return `${keyXml}\n${valueXml}`;
      })
      .join("\n");
    return `${tabs}<dict>\n${entries}\n${tabs}</dict>`;
  }

  // Fallback
  return `${tabs}<string>${escapeXml(String(value))}</string>`;
}

/**
 * Konvertiert WFWorkflow zu XML Plist String
 */
function workflowToXmlPlist(workflow: WFWorkflow): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`;
  const footer = `</plist>`;

  const body = valueToXmlPlist(workflow, 0);

  return `${header}\n${body}\n${footer}`;
}

// =============================================================================
// Binary Plist Conversion
// =============================================================================

/**
 * Konvertiert XML Plist zu Binary Plist mit plutil (macOS)
 * Verwendet shell für korrekte Pfad-Behandlung
 */
async function convertToBinaryPlist(
  xmlPath: string,
  binaryPath: string
): Promise<void> {
  // Escape paths for shell
  const escapedBinaryPath = binaryPath.replace(/'/g, "'\"'\"'");
  const escapedXmlPath = xmlPath.replace(/'/g, "'\"'\"'");
  const shellCmd = `plutil -convert binary1 -o '${escapedBinaryPath}' '${escapedXmlPath}'`;

  const command = new Deno.Command("sh", {
    args: ["-c", shellCmd],
  });

  const { success, stderr } = await command.output();

  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`plutil conversion failed: ${errorText}`);
  }
}

/**
 * Prüft ob plutil verfügbar ist
 */
async function isPlutiAvailable(): Promise<boolean> {
  try {
    const command = new Deno.Command("which", {
      args: ["plutil"],
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

// =============================================================================
// Shortcut Signing
// =============================================================================

/**
 * Signiert einen Shortcut mit dem macOS shortcuts CLI Tool
 * Dies ist notwendig, damit der Shortcut importiert werden kann
 *
 * Hinweis: Das Tool gibt Warnungen auf stderr aus, die ignoriert werden können
 * solange die Output-Datei erstellt wurde.
 */
async function signShortcut(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // Escape paths for shell
  const escapedInput = inputPath.replace(/'/g, "'\"'\"'");
  const escapedOutput = outputPath.replace(/'/g, "'\"'\"'");
  const shellCmd = `shortcuts sign --mode anyone --input '${escapedInput}' --output '${escapedOutput}'`;

  console.error(`[DEBUG] Signing command: ${shellCmd}`);

  const command = new Deno.Command("sh", {
    args: ["-c", shellCmd],
  });

  const { success, stderr, stdout } = await command.output();

  console.error(`[DEBUG] Signing success: ${success}`);
  if (stderr.length > 0) {
    console.error(`[DEBUG] Signing stderr: ${new TextDecoder().decode(stderr)}`);
  }
  if (stdout.length > 0) {
    console.error(`[DEBUG] Signing stdout: ${new TextDecoder().decode(stdout)}`);
  }

  // Prüfe ob die signierte Datei erstellt wurde (Warnungen ignorieren)
  try {
    const stat = await Deno.stat(outputPath);
    console.error(`[DEBUG] Signed file stat: ${stat.size} bytes`);
    if (!stat.isFile || stat.size === 0) {
      throw new Error("Signed shortcut file was not created");
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error("Shortcut signing failed - output file not created");
    }
    throw error;
  }
}

// =============================================================================
// Shortcut Generation
// =============================================================================

/**
 * Generiert den Shortcut-Dateinamen
 */
export function getShortcutFilename(game: Game): string {
  const sanitizedName = sanitizeForFilename(game.displayName);
  return `Play ${sanitizedName}.shortcut`;
}

/**
 * Erzeugt den Pfad für die unsignierte Zwischendatei.
 * WICHTIG: Muss auf .shortcut enden, da `shortcuts sign` Dateien
 * ohne diese Extension ablehnt ("not in the correct format").
 */
export function getUnsignedPath(outputPath: string): string {
  return outputPath.replace(/\.shortcut$/, ".unsigned.shortcut");
}

/**
 * Generiert eine Shortcut-Preview für Dry-Run
 */
export function generateShortcutPreview(
  game: Game,
  config: Config
): ShortcutPreview {
  const actions = buildGameWorkflow(game, config);
  const filename = getShortcutFilename(game);

  return {
    shortcutName: `Play ${game.displayName}`,
    outputPath: join(config.shortcutsOutputDir, filename),
    game,
    actionCount: actions.length,
  };
}

/**
 * Generiert einen einzelnen Shortcut
 */
export async function generateShortcut(
  game: Game,
  config: Config
): Promise<GenerationResult> {
  const filename = getShortcutFilename(game);
  const outputPath = join(config.shortcutsOutputDir, filename);
  const unsignedPath = getUnsignedPath(outputPath);

  try {
    // 0. Bestehende Dateien löschen für sauberes Überschreiben
    try {
      await Deno.remove(outputPath);
    } catch {
      // Datei existiert nicht - OK
    }
    try {
      await Deno.remove(unsignedPath);
    } catch {
      // Datei existiert nicht - OK
    }

    // 1. Workflow Actions bauen
    const actions = buildGameWorkflow(game, config);

    // 2. Vollständigen Workflow erstellen
    const workflow = createWorkflow(actions, `Play ${game.displayName}`);

    // 3. Zu XML Plist konvertieren
    const xmlPlist = workflowToXmlPlist(workflow);

    // 4. Prüfen ob plutil verfügbar ist
    const hasPlutil = await isPlutiAvailable();

    if (hasPlutil) {
      // 5a. Mit plutil zu Binary konvertieren (unsigniert)
      const tempXmlPath = `${outputPath}.xml`;
      console.error(`[DEBUG] Writing XML to: ${tempXmlPath}`);
      await Deno.writeTextFile(tempXmlPath, xmlPlist);

      // Verify XML was written
      const xmlStat = await Deno.stat(tempXmlPath).catch((e) => {
        console.error(`[DEBUG] XML stat failed: ${e}`);
        return null;
      });
      console.error(`[DEBUG] XML file stat: ${xmlStat ? `${xmlStat.size} bytes` : 'NOT FOUND'}`);

      try {
        console.error(`[DEBUG] Converting to binary: ${unsignedPath}`);
        await convertToBinaryPlist(tempXmlPath, unsignedPath);
        console.error(`[DEBUG] Conversion complete`);
      } catch (plistError) {
        console.error(`[DEBUG] Conversion failed: ${plistError}`);
        throw new Error(`Binary Plist Konvertierung fehlgeschlagen: ${plistError}`);
      } finally {
        // XML Temp-Datei aufräumen
        try {
          await Deno.remove(tempXmlPath);
        } catch {
          // Ignorieren
        }
      }
    } else {
      // 5b. Fallback: XML Plist speichern
      await Deno.writeTextFile(unsignedPath, xmlPlist);
    }

    // Prüfen ob unsignierte Datei erstellt wurde
    try {
      const unsignedStat = await Deno.stat(unsignedPath);
      if (unsignedStat.size === 0) {
        throw new Error("Unsignierte Datei ist leer");
      }
    } catch (statError) {
      if (statError instanceof Deno.errors.NotFound) {
        throw new Error("Unsignierte Datei wurde nicht erstellt");
      }
      throw statError;
    }

    // 6. Shortcut signieren mit macOS shortcuts CLI
    try {
      await signShortcut(unsignedPath, outputPath);
      // Nur bei Erfolg aufräumen
      try {
        await Deno.remove(unsignedPath);
      } catch {
        // Ignorieren
      }
    } catch (signError) {
      // Unsignierte Datei behalten für Debugging
      console.error(`  ⚠️  Unsignierte Datei behalten: ${unsignedPath}`);
      throw new Error(`Signieren fehlgeschlagen: ${signError}`);
    }

    return {
      game,
      shortcutPath: outputPath,
      success: true,
    };
  } catch (error) {
    // Nur XML temp-Dateien aufräumen, NICHT die .unsigned Dateien bei Signing-Fehlern
    // (diese bleiben für Debugging erhalten)
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isSigningError = errorMsg.includes("Signieren");

    if (!isSigningError) {
      // Aufräumen bei anderen Fehlern
      try {
        await Deno.remove(unsignedPath);
      } catch {
        // Ignorieren
      }
    }

    return {
      game,
      shortcutPath: outputPath,
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Generiert alle Shortcuts
 */
export async function generateAllShortcuts(
  games: Game[],
  config: Config,
  onProgress?: (current: number, total: number, game: Game) => void
): Promise<GenerationStats> {
  const results: GenerationResult[] = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];

    if (onProgress) {
      onProgress(i + 1, games.length, game);
    }

    const result = await generateShortcut(game, config);
    results.push(result);

    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return {
    total: games.length,
    successful,
    failed,
    skipped: 0,
    results,
  };
}
