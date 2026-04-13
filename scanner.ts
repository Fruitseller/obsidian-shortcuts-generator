/**
 * Vault Scanner - Durchsucht den Obsidian Vault nach Spieldateien
 */

import { join } from "./deps.ts";
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
 * Scannt ein Verzeichnis nach Spiel-Ordnern mit passender Hauptdatei.
 * Jeder Unterordner wird geprüft auf eine gleichnamige .md Datei.
 *
 * @param basePath - Absoluter Pfad zum zu scannenden Verzeichnis
 * @param vaultPath - Absoluter Pfad zum Vault-Root (für relative Pfade)
 * @param type - GameType der gefundenen Spiele
 * @param skipNames - Ordnernamen die übersprungen werden sollen
 */
export async function scanGameDirectory(
  basePath: string,
  vaultPath: string,
  type: GameType,
  skipNames: string[] = []
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];
  const skipSet = new Set(skipNames);

  try {
    for await (const entry of Deno.readDir(basePath)) {
      if (!entry.isDirectory || shouldIgnore(entry.name) || skipSet.has(entry.name)) {
        continue;
      }

      const gameFolderPath = join(basePath, entry.name);
      const mainFile = join(gameFolderPath, `${entry.name}.md`);

      try {
        const stat = await Deno.stat(mainFile);
        if (stat.isFile) {
          const relativePath = mainFile.replace(vaultPath + "/", "");
          results.push({
            absolutePath: mainFile,
            relativePath,
            slug: entry.name,
            type,
          });
        }
      } catch {
        // Hauptdatei existiert nicht - überspringe
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn(`⚠️  Ordner nicht gefunden: ${basePath}`);
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
  const pokemonPath = join(config.vaultPath, config.gamesBasePath, "pokemon");
  const gamesPath = join(config.vaultPath, config.gamesBasePath);

  const pokemonGames = await scanGameDirectory(pokemonPath, config.vaultPath, "pokemon");
  const regularGames = await scanGameDirectory(gamesPath, config.vaultPath, "game", ["pokemon"]);

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
