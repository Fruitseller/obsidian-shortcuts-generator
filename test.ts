/**
 * Tests für den Game Shortcuts Generator
 *
 * Ausführen mit: deno test --allow-read --allow-env test.ts
 */

// Inline assertions (keine externen Dependencies nötig)
function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExists<T>(value: T, msg?: string): void {
  if (value === undefined || value === null) {
    throw new Error(msg || `Expected value to exist, got ${value}`);
  }
}
import { buildGameWorkflow, createWorkflow } from "./actions.ts";
import { getShortcutFilename, getUnsignedPath } from "./generator.ts";
import type { Game, Config } from "./types.ts";

// Test-Konfiguration
const testConfig: Config = {
  vaultPath: "/test/vault",
  gamesBasePath: "hobbies/videospiele",
  shortcutsOutputDir: "/tmp/test-shortcuts",
  vaultName: "my-vault",
};

// Test-Spiel (regulär)
const testGame: Game = {
  slug: "factorio",
  displayName: "Factorio",
  type: "game",
  filePath: "/test/vault/hobbies/videospiele/factorio/factorio.md",
  vaultPath: "hobbies/videospiele/factorio/factorio.md",
  sessionsPath: "hobbies/videospiele/factorio/sessions",
  gamePath: "hobbies/videospiele/factorio/factorio.md",
  templateName: "templates/game_session",
  metadata: { aliases: ["Factorio"] },
};

// Test-Spiel (Pokemon)
const testPokemonGame: Game = {
  slug: "legenden_z-a",
  displayName: "Pokémon-Legenden: Z-A",
  type: "pokemon",
  filePath: "/test/vault/hobbies/videospiele/pokemon/legenden_z-a/legenden_z-a.md",
  vaultPath: "hobbies/videospiele/pokemon/legenden_z-a/legenden_z-a.md",
  sessionsPath: "hobbies/videospiele/pokemon/legenden_z-a/sessions",
  gamePath: "hobbies/videospiele/pokemon/legenden_z-a/legenden_z-a.md",
  templateName: "templates/pokemon_game_session",
  metadata: { aliases: ["Pokémon-Legenden: Z-A"] },
};

Deno.test("buildGameWorkflow erstellt 8 Actions", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(actions.length, 8, "Sollte 8 Actions haben");
});

Deno.test("buildGameWorkflow - erste Action ist Current Date", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[0].WFWorkflowActionIdentifier,
    "is.workflow.actions.date",
    "Erste Action sollte Current Date sein"
  );
});

Deno.test("buildGameWorkflow - zweite Action ist Format Date", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[1].WFWorkflowActionIdentifier,
    "is.workflow.actions.format.date"
  );
  assertEquals(
    actions[1].WFWorkflowActionParameters.WFDateFormat,
    "yyyy-MM-dd"
  );
});

Deno.test("buildGameWorkflow - dritte Action ist Text mit Slug", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[2].WFWorkflowActionIdentifier,
    "is.workflow.actions.gettext"
  );
  assertEquals(
    actions[2].WFWorkflowActionParameters.WFTextActionText,
    "_factorio"
  );
});

Deno.test("buildGameWorkflow - vierte Action ist Combine Text", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[3].WFWorkflowActionIdentifier,
    "is.workflow.actions.text.combine"
  );
});

Deno.test("buildGameWorkflow - fünfte Action ist AFO Create Note", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[4].WFWorkflowActionIdentifier,
    "co.zottmann.ActionsForObsidian.CreateNote"
  );
  // Check AppIntentDescriptor
  const params = actions[4].WFWorkflowActionParameters;
  assertExists(params.AppIntentDescriptor, "Sollte AppIntentDescriptor haben");
  assertEquals(
    (params.AppIntentDescriptor as Record<string, unknown>).BundleIdentifier,
    "co.zottmann.ActionsForObsidian"
  );
});

Deno.test("buildGameWorkflow - sechste Action ist AFO Append Note", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[5].WFWorkflowActionIdentifier,
    "co.zottmann.ActionsForObsidian.AppendNote"
  );
  assertEquals(
    actions[5].WFWorkflowActionParameters.headline,
    "### Sessions"
  );
});

Deno.test("buildGameWorkflow - siebte Action ist AFO Create Daily Note", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[6].WFWorkflowActionIdentifier,
    "co.zottmann.ActionsForObsidian.CreateNote"
  );
  assertEquals(
    actions[6].WFWorkflowActionParameters.noteLookup,
    "daily"
  );
});

Deno.test("buildGameWorkflow - achte Action ist AFO Append to Daily Note", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  assertEquals(
    actions[7].WFWorkflowActionIdentifier,
    "co.zottmann.ActionsForObsidian.AppendNote"
  );
  assertEquals(
    actions[7].WFWorkflowActionParameters.headline,
    "## Videospiele"
  );
  assertEquals(
    actions[7].WFWorkflowActionParameters.noteLookup,
    "daily"
  );
});

Deno.test("buildGameWorkflow - Pokemon verwendet richtiges Template", () => {
  const actions = buildGameWorkflow(testPokemonGame, testConfig);
  assertEquals(
    actions[4].WFWorkflowActionParameters.templatePath,
    "/templates/pokemon_game_session"
  );
});

Deno.test("createWorkflow erstellt valide WFWorkflow Struktur", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  const workflow = createWorkflow(actions, "Test Workflow");

  assertExists(workflow.WFWorkflowActions);
  assertEquals(workflow.WFWorkflowActions.length, 8);
  assertExists(workflow.WFWorkflowIcon);
  assertExists(workflow.WFWorkflowTypes);
});

Deno.test("Variable References haben korrekten Output Name", () => {
  const actions = buildGameWorkflow(testGame, testConfig);

  // Format Date sollte auf "Datum" referenzieren (deutsches System)
  const formatDateAction = actions[1];
  const wfDate = formatDateAction.WFWorkflowActionParameters.WFDate as Record<string, unknown>;
  const value = wfDate.Value as Record<string, unknown>;
  const attachments = value.attachmentsByRange as Record<string, Record<string, unknown>>;
  const attachment = attachments["{0, 1}"];

  assertEquals(attachment.OutputName, "Datum", "Sollte deutsche Output-Namen verwenden");
});

Deno.test("Combine Text referenziert korrekte UUIDs", () => {
  const actions = buildGameWorkflow(testGame, testConfig);

  const formatDateUUID = actions[1].WFWorkflowActionParameters.UUID as string;
  const textUUID = actions[2].WFWorkflowActionParameters.UUID as string;
  const combineAction = actions[3];

  const textArray = combineAction.WFWorkflowActionParameters.text as Array<Record<string, unknown>>;

  // Erstes Element sollte auf Formatiertes Datum zeigen
  const firstItem = textArray[0].Value as Record<string, unknown>;
  const firstAttachments = firstItem.attachmentsByRange as Record<string, Record<string, unknown>>;
  assertEquals(firstAttachments["{0, 1}"].OutputUUID, formatDateUUID);

  // Zweites Element sollte auf Text zeigen
  const secondItem = textArray[1].Value as Record<string, unknown>;
  const secondAttachments = secondItem.attachmentsByRange as Record<string, Record<string, unknown>>;
  assertEquals(secondAttachments["{0, 1}"].OutputUUID, textUUID);
});

Deno.test("getUnsignedPath muss .shortcut Extension haben (für shortcuts sign)", () => {
  const outputPath = "/tmp/test-shortcuts/Play Factorio.shortcut";
  const unsignedPath = getUnsignedPath(outputPath);

  // shortcuts sign verweigert Dateien ohne .shortcut Extension
  assertEquals(
    unsignedPath.endsWith(".shortcut"),
    true,
    `Unsigned-Pfad muss auf .shortcut enden, war: ${unsignedPath}`
  );
  // Muss sich vom Output-Pfad unterscheiden
  assertEquals(
    unsignedPath !== outputPath,
    true,
    "Unsigned-Pfad muss sich vom Output-Pfad unterscheiden"
  );
});

// =============================================================================
// Daily Note Content - kein toter Code
// =============================================================================

Deno.test("buildGameWorkflow - Daily Note Append hat korrekten Link-Prefix", () => {
  const actions = buildGameWorkflow(testGame, testConfig);
  const dailyAppendAction = actions[7];
  const content = dailyAppendAction.WFWorkflowActionParameters.content as Record<string, unknown>;
  const value = content.Value as Record<string, unknown>;
  const str = value.string as string;

  // Der String muss den korrekten Link-Prefix enthalten: - [[slug|displayName]]:  [[￼]]
  const expectedPrefix = `- [[${testGame.slug}|${testGame.displayName}]]:  [[`;
  assertEquals(
    str.startsWith(expectedPrefix),
    true,
    `Daily Note content sollte mit "${expectedPrefix}" beginnen, war: "${str}"`
  );
  // Variable Placeholder ￼ muss an Position nach dem Prefix stehen
  const placeholderChar = "\ufffc";
  assertEquals(
    str.includes(placeholderChar),
    true,
    "Daily Note content muss Variable-Placeholder enthalten"
  );
  // Muss mit ]] enden
  assertEquals(
    str.endsWith("]]"),
    true,
    `Daily Note content sollte mit "]]" enden, war: "${str}"`
  );
});

// =============================================================================
// Constants Tests - Magic strings extracted
// =============================================================================

Deno.test("WORKFLOW_CONSTANTS exportiert alle erwarteten Werte", async () => {
  const { WORKFLOW_CONSTANTS } = await import("./actions.ts");
  assertExists(WORKFLOW_CONSTANTS, "WORKFLOW_CONSTANTS sollte exportiert sein");
  // AFO Plugin
  assertEquals(WORKFLOW_CONSTANTS.AFO_BUNDLE_ID, "co.zottmann.ActionsForObsidian");
  assertEquals(WORKFLOW_CONSTANTS.AFO_TEAM_ID, "X2WK5Z9VR5");
  assertEquals(WORKFLOW_CONSTANTS.AFO_APP_NAME, "Actions For Obsidian");
  // Workflow metadata
  assertEquals(WORKFLOW_CONSTANTS.CLIENT_VERSION, "2605.0.5");
  assertEquals(WORKFLOW_CONSTANTS.MIN_CLIENT_VERSION, 1113);
  assertEquals(WORKFLOW_CONSTANTS.ICON_COLOR, 4282601983);
  assertEquals(WORKFLOW_CONSTANTS.ICON_GLYPH, 59654);
  // Content
  assertEquals(WORKFLOW_CONSTANTS.DATE_FORMAT, "yyyy-MM-dd");
  assertEquals(WORKFLOW_CONSTANTS.SESSIONS_HEADING, "### Sessions");
  assertEquals(WORKFLOW_CONSTANTS.DAILY_GAMES_HEADING, "## Videospiele");
});

// =============================================================================
// Generator Tests - Command building (no shell injection)
// =============================================================================

Deno.test("buildPlistConvertArgs gibt args-Array ohne Shell zurück", async () => {
  const gen = await import("./generator.ts");
  const args = gen.buildPlistConvertArgs("/tmp/input.xml", "/tmp/output.shortcut");
  // Muss ein Array sein, kein einzelner Shell-String
  assertEquals(Array.isArray(args.args), true, "args sollte ein Array sein");
  assertEquals(args.command, "plutil", "Kommando sollte plutil sein");
  // Darf keine Shell-Escaping-Artefakte enthalten
  for (const arg of args.args) {
    assertEquals(arg.includes("'\"'\"'"), false, `Arg "${arg}" enthält Shell-Escape-Artefakte`);
  }
});

Deno.test("buildSignArgs gibt args-Array ohne Shell zurück", async () => {
  const gen = await import("./generator.ts");
  const args = gen.buildSignArgs("/tmp/input.shortcut", "/tmp/output.shortcut");
  assertEquals(Array.isArray(args.args), true, "args sollte ein Array sein");
  assertEquals(args.command, "shortcuts", "Kommando sollte shortcuts sein");
  for (const arg of args.args) {
    assertEquals(arg.includes("'\"'\"'"), false, `Arg "${arg}" enthält Shell-Escape-Artefakte`);
  }
});

Deno.test("buildPlistConvertArgs behandelt Pfade mit Sonderzeichen korrekt", async () => {
  const gen = await import("./generator.ts");
  const args = gen.buildPlistConvertArgs("/tmp/it's a test/in.xml", "/tmp/out put/$file.bin");
  // Pfade müssen exakt durchgereicht werden, ohne Escaping
  assertEquals(args.args.includes("/tmp/it's a test/in.xml"), true, "Input-Pfad muss unverändert enthalten sein");
  assertEquals(args.args.includes("/tmp/out put/$file.bin"), true, "Output-Pfad muss unverändert enthalten sein");
});

// =============================================================================
// Scanner Tests - scanGameDirectory (unified scanner)
// =============================================================================

Deno.test("scanGameDirectory ist als Funktion exportiert", async () => {
  const scanner = await import("./scanner.ts");
  assertEquals(typeof scanner.scanGameDirectory, "function", "scanGameDirectory sollte exportiert sein");
});

// =============================================================================
// CLI Options Tests - vault/output overrides
// =============================================================================

Deno.test("parseCliArgs parst --vault Option", async () => {
  const { parseCliArgs } = await import("./main.ts");
  const options = parseCliArgs(["--vault", "/my/vault"]);
  assertEquals(options.vault, "/my/vault");
});

Deno.test("parseCliArgs parst --vault-name Option", async () => {
  const { parseCliArgs } = await import("./main.ts");
  const options = parseCliArgs(["--vault-name", "my-vault"]);
  assertEquals(options.vaultName, "my-vault");
});

Deno.test("parseCliArgs parst --output Option", async () => {
  const { parseCliArgs } = await import("./main.ts");
  const options = parseCliArgs(["--output", "/my/output"]);
  assertEquals(options.output, "/my/output");
});

Deno.test("parseCliArgs ohne vault-Optionen liefert undefined", async () => {
  const { parseCliArgs } = await import("./main.ts");
  const options = parseCliArgs([]);
  assertEquals(options.vault, undefined);
  assertEquals(options.vaultName, undefined);
  assertEquals(options.output, undefined);
});

Deno.test("buildConfigOverrides erstellt Overrides aus CLI-Optionen", async () => {
  const { buildConfigOverrides } = await import("./main.ts");
  const overrides = buildConfigOverrides({
    apply: false, verbose: false, help: false,
    vault: "/my/vault",
    vaultName: "test-vault",
    output: "/my/output",
  });
  assertEquals(overrides.vaultPath, "/my/vault");
  assertEquals(overrides.vaultName, "test-vault");
  assertEquals(overrides.shortcutsOutputDir, "/my/output");
});

Deno.test("buildConfigOverrides ohne Optionen liefert leeres Objekt", async () => {
  const { buildConfigOverrides } = await import("./main.ts");
  const overrides = buildConfigOverrides({
    apply: false, verbose: false, help: false,
  });
  assertEquals(overrides.vaultPath, undefined);
  assertEquals(overrides.vaultName, undefined);
  assertEquals(overrides.shortcutsOutputDir, undefined);
});

Deno.test("buildConfigOverrides mit vaultName ohne vault setzt nur vaultName", async () => {
  const { buildConfigOverrides } = await import("./main.ts");
  const overrides = buildConfigOverrides({
    apply: false, verbose: false, help: false,
    vaultName: "custom-vault",
  });
  assertEquals(overrides.vaultPath, undefined);
  assertEquals(overrides.vaultName, "custom-vault");
  assertEquals(overrides.shortcutsOutputDir, undefined);
});

Deno.test("buildConfigOverrides leitet vaultName aus vault-Pfad ab wenn nicht angegeben", async () => {
  const { buildConfigOverrides } = await import("./main.ts");
  const overrides = buildConfigOverrides({
    apply: false, verbose: false, help: false,
    vault: "/Users/piotr/vaults/piotr",
  });
  assertEquals(overrides.vaultPath, "/Users/piotr/vaults/piotr");
  assertEquals(overrides.vaultName, "piotr");
});

console.log("Führe Tests aus mit: deno test --allow-read --allow-env test.ts");
