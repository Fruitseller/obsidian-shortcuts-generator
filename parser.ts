/**
 * Frontmatter Parser - Extrahiert Metadaten aus Spieldateien
 */

import { parseYaml, dirname } from "./deps.ts";
import type { Config, Game, GameMetadata, ParseError } from "./types.ts";
import type { ScannedFile } from "./scanner.ts";

/** Frontmatter-Regex (zwischen --- Zeilen) */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Extrahiert den Frontmatter-Block aus einer Markdown-Datei
 */
function extractFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_REGEX);
  return match ? match[1] : null;
}

/**
 * Parst YAML Frontmatter zu einem Objekt
 */
function parseFrontmatter(yaml: string): GameMetadata {
  try {
    const parsed = parseYaml(yaml);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as GameMetadata;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Ermittelt den Display-Namen aus Metadaten oder Slug
 */
function getDisplayName(metadata: GameMetadata, slug: string): string {
  // Priorität: aliases[0] > slug
  if (metadata.aliases && Array.isArray(metadata.aliases) && metadata.aliases.length > 0) {
    return metadata.aliases[0];
  }

  // Fallback: Slug zu Title Case konvertieren
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Konstruiert den Sessions-Pfad basierend auf Spieltyp
 */
function getSessionsPath(scannedFile: ScannedFile, _config: Config): string {
  // Sessions-Ordner ist im selben Ordner wie die Spieldatei
  const gameDir = dirname(scannedFile.relativePath);
  return `${gameDir}/sessions`;
}

/**
 * Konstruiert den Pfad zur Hauptdatei (für Verlinkung)
 */
function getGamePath(scannedFile: ScannedFile): string {
  return scannedFile.relativePath;
}

/**
 * Ermittelt den Template-Namen basierend auf Spieltyp
 */
function getTemplateName(scannedFile: ScannedFile): string {
  return scannedFile.type === "pokemon"
    ? "templates/pokemon_game_session"
    : "templates/game_session";
}

/**
 * Parst eine einzelne Spieldatei zu einem Game-Objekt
 */
export async function parseGameFile(
  scannedFile: ScannedFile,
  config: Config
): Promise<Game> {
  // Datei lesen
  const content = await Deno.readTextFile(scannedFile.absolutePath);

  // Frontmatter extrahieren und parsen
  const frontmatterStr = extractFrontmatter(content);
  const metadata = frontmatterStr ? parseFrontmatter(frontmatterStr) : {};

  // Game-Objekt konstruieren
  const game: Game = {
    slug: scannedFile.slug,
    displayName: getDisplayName(metadata, scannedFile.slug),
    type: scannedFile.type,
    filePath: scannedFile.absolutePath,
    vaultPath: scannedFile.relativePath,
    sessionsPath: getSessionsPath(scannedFile, config),
    gamePath: getGamePath(scannedFile),
    templateName: getTemplateName(scannedFile),
    metadata,
  };

  return game;
}

/**
 * Parst mehrere Spieldateien
 */
export async function parseGameFiles(
  scannedFiles: ScannedFile[],
  config: Config
): Promise<{ games: Game[]; errors: ParseError[] }> {
  const games: Game[] = [];
  const errors: ParseError[] = [];

  for (const file of scannedFiles) {
    try {
      const game = await parseGameFile(file, config);
      games.push(game);
    } catch (error) {
      errors.push({
        filePath: file.absolutePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { games, errors };
}

/**
 * Formatiert einen Display-Namen für die Shortcut-Datei
 * Entfernt Sonderzeichen die in Dateinamen problematisch sind
 */
export function sanitizeForFilename(displayName: string): string {
  return displayName
    .replace(/[/:*?"<>|]/g, "") // Entferne ungültige Zeichen
    .replace(/\s+/g, " ") // Normalisiere Whitespace
    .trim();
}
