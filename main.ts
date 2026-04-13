#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

/**
 * Game Shortcuts Generator - CLI Einstiegspunkt
 *
 * Generiert Apple Shortcuts für Obsidian Game Sessions
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --allow-run main.ts          # Dry-Run (Standard)
 *   deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply  # Tatsächlich generieren
 */

import { parseArgs, basename } from "./deps.ts";
import { loadConfig, validateConfig, ensureOutputDir } from "./config.ts";
import { scanVault } from "./scanner.ts";
import { parseGameFiles } from "./parser.ts";
import {
  generateShortcutPreview,
  generateAllShortcuts,
} from "./generator.ts";
import type { CLIOptions, Config, Game, DryRunResult } from "./types.ts";

// =============================================================================
// CLI Argument Parsing
// =============================================================================

export function parseCliArgs(argv: string[] = Deno.args): CLIOptions {
  const args = parseArgs(argv, {
    boolean: ["apply", "verbose", "help"],
    string: ["filter", "vault", "vault-name", "output"],
    alias: {
      a: "apply",
      v: "verbose",
      h: "help",
      f: "filter",
      o: "output",
    },
    default: {
      apply: false,
      verbose: false,
      help: false,
    },
  });

  return {
    apply: args.apply as boolean,
    verbose: args.verbose as boolean,
    help: args.help as boolean,
    filter: args.filter as string | undefined,
    vault: args.vault as string | undefined,
    vaultName: args["vault-name"] as string | undefined,
    output: args.output as string | undefined,
  };
}

/**
 * Baut Config-Overrides aus CLI-Optionen.
 * Leitet vaultName aus dem vault-Pfad ab, wenn nicht explizit angegeben.
 */
export function buildConfigOverrides(options: CLIOptions): Partial<Config> {
  const overrides: Partial<Config> = {};

  if (options.vault) {
    overrides.vaultPath = options.vault;
    // vaultName aus Pfad ableiten, wenn nicht explizit gesetzt
    overrides.vaultName = options.vaultName ?? basename(options.vault);
  } else if (options.vaultName) {
    overrides.vaultName = options.vaultName;
  }

  if (options.output) {
    overrides.shortcutsOutputDir = options.output;
  }

  return overrides;
}

// =============================================================================
// Output Formatting
// =============================================================================

function printHeader(text: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${text}`);
  console.log("=".repeat(60));
}

function printSubHeader(text: string): void {
  console.log("\n" + "-".repeat(40));
  console.log(`  ${text}`);
  console.log("-".repeat(40));
}

function printHelp(): void {
  console.log(`
🎮 Game Shortcuts Generator

Generiert Apple Shortcuts für Obsidian Game Sessions.

USAGE:
  deno run --allow-read --allow-write --allow-env --allow-run main.ts [OPTIONS]

OPTIONS:
  --apply, -a          Tatsächlich Shortcuts generieren (Standard: Dry-Run)
  --filter, -f         Nur Spiele mit diesem Slug verarbeiten
  --vault              Pfad zum Obsidian Vault (überschreibt Config)
  --vault-name         Name des Vaults (wird aus --vault abgeleitet wenn nicht angegeben)
  --output, -o         Ausgabeverzeichnis für Shortcuts (überschreibt Config)
  --verbose, -v        Ausführliche Ausgabe
  --help, -h           Diese Hilfe anzeigen

BEISPIELE:
  # Dry-Run - Zeigt was generiert würde
  deno run --allow-read --allow-write --allow-env --allow-run main.ts

  # Tatsächlich generieren
  deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply

  # Bestimmten Vault verwenden
  deno run --allow-read --allow-write --allow-env --allow-run main.ts --vault /Users/me/vaults/my-vault

  # Nur ein bestimmtes Spiel
  deno run --allow-read --allow-write --allow-env --allow-run main.ts --filter zelda --apply
`);
}

// =============================================================================
// Dry-Run Phase
// =============================================================================

async function executeDryRun(
  options: CLIOptions,
  configOverrides: Partial<Config>
): Promise<DryRunResult | null> {
  printHeader("🔍 DRY-RUN MODUS");
  console.log("Analysiere Vault und zeige was generiert würde...\n");

  // 1. Konfiguration laden
  const config = loadConfig(configOverrides);

  // 2. Konfiguration validieren
  printSubHeader("Phase 1: Konfiguration prüfen");
  const validation = await validateConfig(config);

  if (!validation.valid) {
    console.log("❌ Konfigurationsfehler:");
    for (const error of validation.errors) {
      console.log(`   • ${error}`);
    }
    return null;
  }

  console.log("✅ Vault-Pfad: " + config.vaultPath);
  console.log("✅ Games-Pfad: " + config.gamesBasePath);
  console.log("✅ Output-Pfad: " + config.shortcutsOutputDir);

  // 3. Vault scannen
  printSubHeader("Phase 2: Vault scannen");
  const { files, stats } = await scanVault(config);

  console.log(`📂 Gefundene Spieldateien: ${stats.totalFilesFound}`);
  console.log(`   • Pokemon-Spiele: ${stats.pokemonGames}`);
  console.log(`   • Reguläre Spiele: ${stats.regularGames}`);

  if (files.length === 0) {
    console.log("\n⚠️  Keine Spieldateien gefunden!");
    return {
      scannedFiles: [],
      parsedGames: [],
      parseErrors: [],
      shortcuts: [],
      validationErrors: [],
    };
  }

  // 4. Filter anwenden
  let filteredFiles = files;
  if (options.filter) {
    filteredFiles = files.filter((f) =>
      f.slug.toLowerCase().includes(options.filter!.toLowerCase())
    );
    console.log(`\n🔎 Filter "${options.filter}": ${filteredFiles.length} Treffer`);
  }

  // 5. Dateien parsen
  printSubHeader("Phase 3: Frontmatter parsen");
  const { games, errors: parseErrors } = await parseGameFiles(
    filteredFiles,
    config
  );

  if (parseErrors.length > 0) {
    console.log(`⚠️  ${parseErrors.length} Parse-Fehler:`);
    for (const error of parseErrors) {
      console.log(`   • ${error.filePath}: ${error.error}`);
    }
  }

  console.log(`✅ Erfolgreich geparst: ${games.length} Spiele`);

  // 6. Shortcut-Previews generieren
  printSubHeader("Phase 4: Shortcut-Vorschau");
  const shortcuts = games.map((game) => generateShortcutPreview(game, config));

  console.log(`\n📋 Shortcuts die generiert würden:\n`);

  for (const preview of shortcuts) {
    const typeIcon = preview.game.type === "pokemon" ? "🔴" : "🎮";
    console.log(`${typeIcon} ${preview.shortcutName}`);
    console.log(`   Typ: ${preview.game.type}`);
    console.log(`   Slug: ${preview.game.slug}`);
    console.log(`   Sessions: ${preview.game.sessionsPath}`);
    console.log(`   Template: ${preview.game.templateName}`);
    console.log(`   Actions: ${preview.actionCount}`);
    console.log(`   Output: ${preview.outputPath}`);
    console.log("");
  }

  // 7. Zusammenfassung
  printSubHeader("Zusammenfassung");
  console.log(`📊 Gesamt: ${shortcuts.length} Shortcuts würden generiert`);
  console.log(`   Pokemon: ${shortcuts.filter((s) => s.game.type === "pokemon").length}`);
  console.log(`   Regulär: ${shortcuts.filter((s) => s.game.type === "game").length}`);

  if (!options.apply) {
    console.log("\n💡 Führe mit --apply aus um Shortcuts tatsächlich zu generieren:");
    console.log(
      "   deno run --allow-read --allow-write --allow-env --allow-run main.ts --apply"
    );
  }

  return {
    scannedFiles: files.map((f) => f.absolutePath),
    parsedGames: games,
    parseErrors,
    shortcuts,
    validationErrors: [],
  };
}

// =============================================================================
// Apply Phase
// =============================================================================

async function executeApply(games: Game[], configOverrides: Partial<Config>): Promise<void> {
  printHeader("🚀 APPLY MODUS");
  console.log("Generiere Shortcuts...\n");

  const config = loadConfig(configOverrides);

  // Output-Verzeichnis erstellen
  await ensureOutputDir(config);
  console.log(`📁 Output-Verzeichnis: ${config.shortcutsOutputDir}\n`);

  // Shortcuts generieren
  const stats = await generateAllShortcuts(games, config, (current, total, game) => {
    const progress = `[${current}/${total}]`;
    const typeIcon = game.type === "pokemon" ? "🔴" : "🎮";
    console.log(`${progress} ${typeIcon} Generiere: Play ${game.displayName}...`);
  });

  // Ergebnisse
  printSubHeader("Ergebnisse");

  if (stats.failed > 0) {
    console.log("\n❌ Fehlgeschlagene Generierungen:");
    for (const result of stats.results.filter((r) => !r.success)) {
      console.log(`   • ${result.game.displayName}: ${result.error}`);
    }
  }

  console.log(`\n📊 Statistiken:`);
  console.log(`   ✅ Erfolgreich: ${stats.successful}`);
  console.log(`   ❌ Fehlgeschlagen: ${stats.failed}`);
  console.log(`   ⏭️  Übersprungen: ${stats.skipped}`);

  if (stats.successful > 0) {
    console.log(`\n✨ ${stats.successful} Shortcuts generiert in:`);
    console.log(`   ${config.shortcutsOutputDir}`);
    console.log("\n📱 Nächste Schritte:");
    console.log("   1. Übertrage die .shortcut Dateien auf dein iPhone/iPad");
    console.log("   2. Öffne die Dateien um sie in der Shortcuts App zu importieren");
    console.log("   3. Oder nutze AirDrop zum schnellen Transfer");
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const options = parseCliArgs();

  if (options.help) {
    printHelp();
    Deno.exit(0);
  }

  console.log("🎮 Game Shortcuts Generator");
  console.log("===========================");

  const configOverrides = buildConfigOverrides(options);

  // Immer zuerst Dry-Run ausführen
  const dryRunResult = await executeDryRun(options, configOverrides);

  if (!dryRunResult) {
    console.log("\n❌ Dry-Run fehlgeschlagen. Bitte Fehler beheben.");
    Deno.exit(1);
  }

  if (dryRunResult.parsedGames.length === 0) {
    console.log("\n⚠️  Keine Spiele zum Verarbeiten gefunden.");
    Deno.exit(0);
  }

  // Bei --apply: Tatsächlich generieren
  if (options.apply) {
    await executeApply(dryRunResult.parsedGames, configOverrides);
  }

  console.log("\n✅ Fertig!");
}

// Entry Point
if (import.meta.main) {
  main().catch((error) => {
    console.error("\n💥 Unerwarteter Fehler:", error);
    Deno.exit(1);
  });
}
