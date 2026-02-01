/**
 * Konfigurationssystem für den Game Shortcuts Generator
 */

import { join } from "./deps.ts";
import type { Config } from "./types.ts";

/**
 * Ermittelt das Home-Verzeichnis
 */
function getHomeDir(): string {
  const home = Deno.env.get("HOME");
  if (!home) {
    throw new Error("HOME environment variable not set");
  }
  return home;
}

/**
 * Standard-Konfiguration
 */
export function getDefaultConfig(): Config {
  const home = getHomeDir();

  return {
    // iCloud Obsidian Vault Pfad (macOS)
    vaultPath: join(
      home,
      "/vaults/my-vault/"
    ),

    // Basispfad für Spiele innerhalb des Vaults
    gamesBasePath: "hobbies/videospiele",

    // Ausgabeverzeichnis für Shortcuts
    shortcutsOutputDir: join(home, "Downloads/generated-shortcuts"),

    // Vault-Name für Obsidian Actions Plugin
    vaultName: "my-vault",
  };
}

/**
 * Lädt Konfiguration (aktuell nur Default, erweiterbar für Config-File)
 */
export function loadConfig(overrides?: Partial<Config>): Config {
  const config = getDefaultConfig();

  if (overrides) {
    return { ...config, ...overrides };
  }

  return config;
}

/**
 * Validiert die Konfiguration
 */
export async function validateConfig(
  config: Config
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Prüfe ob Vault existiert
  try {
    const stat = await Deno.stat(config.vaultPath);
    if (!stat.isDirectory) {
      errors.push(`Vault-Pfad ist kein Verzeichnis: ${config.vaultPath}`);
    }
  } catch {
    errors.push(`Vault-Pfad existiert nicht: ${config.vaultPath}`);
  }

  // Prüfe ob Games-Basispfad existiert
  const gamesFullPath = join(config.vaultPath, config.gamesBasePath);
  try {
    const stat = await Deno.stat(gamesFullPath);
    if (!stat.isDirectory) {
      errors.push(`Games-Basispfad ist kein Verzeichnis: ${gamesFullPath}`);
    }
  } catch {
    errors.push(`Games-Basispfad existiert nicht: ${gamesFullPath}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Stellt sicher, dass das Output-Verzeichnis existiert
 */
export async function ensureOutputDir(config: Config): Promise<void> {
  await Deno.mkdir(config.shortcutsOutputDir, { recursive: true });
}
