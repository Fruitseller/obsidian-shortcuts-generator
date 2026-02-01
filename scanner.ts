/**
 * Vault Scanner - Durchsucht den Obsidian Vault nach Spieldateien
 */

import { join, basename } from "./deps.ts";
import type { Config, GameType } from "./types.ts";

/** Scan-Ergebnis für eine gefundene Datei */
export interface ScannedFile {
  /** Absoluter Pfad zur Datei */
  absolutePath: string;
  /** Relativer Pfad innerhalb des Vaults */
  relativePath: string;
  /** Slug (Dateiname ohne .md) */
  slug: string;
  /** Erkannter Spieltyp */
  type: GameType;
}

/** Scan-Statistiken */
export interface ScanStats {
  totalDirectoriesScanned: number;
  totalFilesFound: number;
  pokemonGames: number;
  regularGames: number;
  skippedFiles: number;
}

/**
 * Prüft ob ein Pfad-Segment mit _ beginnt (sollte ignoriert werden)
 */
function shouldIgnore(name: string): boolean {
  return name.startsWith("_");
}

/**
 * Scannt den Vault nach Pokemon-Spielen
 * Struktur: hobbies/videospiele/pokemon/[game-folder]/[game].md
 */
async function scanPokemonGames(
  config: Config
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];
  const pokemonPath = join(config.vaultPath, config.gamesBasePath, "pokemon");

  try {
    // Durchsuche Pokemon-Ordner
    for await (const entry of Deno.readDir(pokemonPath)) {
      if (!entry.isDirectory || shouldIgnore(entry.name)) {
        continue;
      }

      const gameFolderPath = join(pokemonPath, entry.name);
      const mainFile = join(gameFolderPath, `${entry.name}.md`);

      try {
        const stat = await Deno.stat(mainFile);
        if (stat.isFile) {
          const relativePath = mainFile.replace(config.vaultPath + "/", "");
          results.push({
            absolutePath: mainFile,
            relativePath,
            slug: entry.name,
            type: "pokemon",
          });
        }
      } catch {
        // Hauptdatei existiert nicht - überspringe
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn(`⚠️  Pokemon-Ordner nicht gefunden: ${pokemonPath}`);
    } else {
      throw error;
    }
  }

  return results;
}

/**
 * Scannt den Vault nach regulären Spielen
 * Struktur: hobbies/videospiele/[game-folder]/[game].md
 * Ignoriert den pokemon-Ordner
 */
async function scanRegularGames(
  config: Config
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];
  const gamesPath = join(config.vaultPath, config.gamesBasePath);

  try {
    for await (const entry of Deno.readDir(gamesPath)) {
      // Überspringe pokemon-Ordner und ignorierte Einträge
      if (
        !entry.isDirectory ||
        entry.name === "pokemon" ||
        shouldIgnore(entry.name)
      ) {
        continue;
      }

      const gameFolderPath = join(gamesPath, entry.name);
      const mainFile = join(gameFolderPath, `${entry.name}.md`);

      try {
        const stat = await Deno.stat(mainFile);
        if (stat.isFile) {
          const relativePath = mainFile.replace(config.vaultPath + "/", "");
          results.push({
            absolutePath: mainFile,
            relativePath,
            slug: entry.name,
            type: "game",
          });
        }
      } catch {
        // Hauptdatei existiert nicht - überspringe
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn(`⚠️  Games-Ordner nicht gefunden: ${gamesPath}`);
    } else {
      throw error;
    }
  }

  return results;
}

/**
 * Hauptfunktion: Scannt den Vault nach allen Spieldateien
 */
export async function scanVault(config: Config): Promise<{
  files: ScannedFile[];
  stats: ScanStats;
}> {
  const pokemonGames = await scanPokemonGames(config);
  const regularGames = await scanRegularGames(config);

  const allFiles = [...pokemonGames, ...regularGames];

  // Sortiere nach Slug
  allFiles.sort((a, b) => a.slug.localeCompare(b.slug));

  const stats: ScanStats = {
    totalDirectoriesScanned: 2, // pokemon + games base
    totalFilesFound: allFiles.length,
    pokemonGames: pokemonGames.length,
    regularGames: regularGames.length,
    skippedFiles: 0,
  };

  return { files: allFiles, stats };
}
