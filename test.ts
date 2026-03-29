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

console.log("Führe Tests aus mit: deno test --allow-read --allow-env test.ts");
