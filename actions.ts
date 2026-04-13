/**
 * WFWorkflow Action Builder - Baut Shortcut Actions programmatisch
 * Basiert auf der Struktur eines funktionierenden Shortcuts
 */

import type {
  WFAction,
  WFWorkflow,
  Config,
  Game,
  UUID,
} from "./types.ts";

// =============================================================================
// UUID Generation
// =============================================================================

function generateUUID(): UUID {
  return crypto.randomUUID().toUpperCase();
}

// =============================================================================
// Variable Reference Helpers
// =============================================================================

/**
 * Erstellt eine Variable-Referenz im WFTextTokenString Format
 */
function createVariableToken(
  outputName: string,
  outputUUID: UUID
): Record<string, unknown> {
  return {
    Value: {
      attachmentsByRange: {
        "{0, 1}": {
          OutputName: outputName,
          OutputUUID: outputUUID,
          Type: "ActionOutput",
        },
      },
      string: "\ufffc", // Placeholder character
    },
    WFSerializationType: "WFTextTokenString",
  };
}

/**
 * Erstellt Text mit eingebetteter Variable
 */
function createTextWithVariable(
  text: string,
  variablePosition: number,
  outputName: string,
  outputUUID: UUID
): Record<string, unknown> {
  // Replace placeholder position with ￼ character
  const textWithPlaceholder =
    text.substring(0, variablePosition) +
    "\ufffc" +
    text.substring(variablePosition);

  return {
    Value: {
      attachmentsByRange: {
        [`{${variablePosition}, 1}`]: {
          OutputName: outputName,
          OutputUUID: outputUUID,
          Type: "ActionOutput",
        },
      },
      string: textWithPlaceholder,
    },
    WFSerializationType: "WFTextTokenString",
  };
}

// =============================================================================
// Standard Shortcuts Actions
// =============================================================================

/**
 * Current Date Action
 */
function createCurrentDateAction(outputUUID: UUID): WFAction {
  return {
    WFWorkflowActionIdentifier: "is.workflow.actions.date",
    WFWorkflowActionParameters: {
      UUID: outputUUID,
    },
  };
}

/**
 * Format Date Action
 */
function createFormatDateAction(
  dateUUID: UUID,
  outputUUID: UUID,
  format: string = "yyyy-MM-dd"
): WFAction {
  return {
    WFWorkflowActionIdentifier: "is.workflow.actions.format.date",
    WFWorkflowActionParameters: {
      UUID: outputUUID,
      WFDate: createVariableToken("Datum", dateUUID),
      WFDateFormat: format,
      WFDateFormatStyle: "Custom",
    },
  };
}

/**
 * Text Action - Einfacher Text ohne Variablen
 */
function createTextAction(text: string, outputUUID: UUID): WFAction {
  return {
    WFWorkflowActionIdentifier: "is.workflow.actions.gettext",
    WFWorkflowActionParameters: {
      UUID: outputUUID,
      WFTextActionText: text,
    },
  };
}

/**
 * Combine Text Action - Kombiniert mehrere Texte/Variablen
 */
function createCombineTextAction(
  items: Array<{ outputName: string; outputUUID: UUID }>,
  outputUUID: UUID
): WFAction {
  const textArray = items.map((item) => createVariableToken(item.outputName, item.outputUUID));

  return {
    WFWorkflowActionIdentifier: "is.workflow.actions.text.combine",
    WFWorkflowActionParameters: {
      UUID: outputUUID,
      WFTextSeparator: "Custom",
      text: textArray,
    },
  };
}

// =============================================================================
// Exported Constants
// =============================================================================

/** Alle magischen Werte als benannte Konstanten */
export const WORKFLOW_CONSTANTS = {
  // Actions for Obsidian Plugin
  AFO_BUNDLE_ID: "co.zottmann.ActionsForObsidian",
  AFO_TEAM_ID: "X2WK5Z9VR5",
  AFO_APP_NAME: "Actions For Obsidian",
  // Workflow Metadata
  CLIENT_VERSION: "2605.0.5",
  MIN_CLIENT_VERSION: 1113,
  ICON_COLOR: 4282601983,
  ICON_GLYPH: 59654,
  // Content
  DATE_FORMAT: "yyyy-MM-dd",
  SESSIONS_HEADING: "### Sessions",
  DAILY_GAMES_HEADING: "## Videospiele",
} as const;

// Lokale Aliase für Abwärtskompatibilität im Modul
const AFO_BUNDLE_ID = WORKFLOW_CONSTANTS.AFO_BUNDLE_ID;
const AFO_TEAM_ID = WORKFLOW_CONSTANTS.AFO_TEAM_ID;
const AFO_APP_NAME = WORKFLOW_CONSTANTS.AFO_APP_NAME;

/**
 * Erstellt den AppIntentDescriptor für Actions for Obsidian
 */
function createAppIntentDescriptor(intentName: string): Record<string, unknown> {
  return {
    AppIntentIdentifier: intentName,
    BundleIdentifier: AFO_BUNDLE_ID,
    Name: AFO_APP_NAME,
    TeamIdentifier: AFO_TEAM_ID,
  };
}

/**
 * Erstellt die Vault-Referenz Struktur
 */
function createVaultReference(vaultName: string): Record<string, unknown> {
  return {
    identifier: vaultName,
    subtitle: { key: vaultName },
    title: { key: vaultName },
  };
}

/**
 * Create Note Action - Erstellt eine Note mit Template
 */
function createAFOCreateNoteAction(
  vaultName: string,
  filePath: string | Record<string, unknown>,
  templatePath: string,
  outputUUID: UUID
): WFAction {
  return {
    WFWorkflowActionIdentifier: `${AFO_BUNDLE_ID}.CreateNote`,
    WFWorkflowActionParameters: {
      AppIntentDescriptor: createAppIntentDescriptor("CreateNote"),
      UUID: outputUUID,
      applyOnCreation: "templates",
      filePath: filePath,
      targetVault: createVaultReference(vaultName),
      templatePath: templatePath,
    },
  };
}

/**
 * Create Daily Note Action
 */
function createAFOCreateDailyNoteAction(
  vaultName: string,
  outputUUID: UUID
): WFAction {
  return {
    WFWorkflowActionIdentifier: `${AFO_BUNDLE_ID}.CreateNote`,
    WFWorkflowActionParameters: {
      AppIntentDescriptor: createAppIntentDescriptor("CreateNote"),
      UUID: outputUUID,
      noteLookup: "daily",
      targetVault: createVaultReference(vaultName),
    },
  };
}

/**
 * Append Note Action - Fügt Text zu einer Note hinzu
 */
function createAFOAppendNoteAction(
  vaultName: string,
  filePath: string,
  content: string | Record<string, unknown>,
  headline: string,
  outputUUID: UUID
): WFAction {
  return {
    WFWorkflowActionIdentifier: `${AFO_BUNDLE_ID}.AppendNote`,
    WFWorkflowActionParameters: {
      AppIntentDescriptor: createAppIntentDescriptor("AppendNote"),
      UUID: outputUUID,
      content: content,
      ensureNewline: true,
      filePath: filePath,
      headline: headline,
      ifHeadlineIsMissing: "error",
      placement: "belowHeadline",
      targetVault: createVaultReference(vaultName),
    },
  };
}

/**
 * Append to Daily Note Action
 */
function createAFOAppendToDailyNoteAction(
  vaultName: string,
  content: string | Record<string, unknown>,
  headline: string,
  outputUUID: UUID
): WFAction {
  return {
    WFWorkflowActionIdentifier: `${AFO_BUNDLE_ID}.AppendNote`,
    WFWorkflowActionParameters: {
      AppIntentDescriptor: createAppIntentDescriptor("AppendNote"),
      UUID: outputUUID,
      content: content,
      ensureNewline: true,
      headline: headline,
      noteLookup: "daily",
      placement: "belowHeadline",
      targetVault: createVaultReference(vaultName),
    },
  };
}

// =============================================================================
// Complete Workflow Builder
// =============================================================================

/**
 * Erstellt den vollständigen Workflow für ein Spiel
 *
 * Workflow:
 * 1. Current Date - Holt aktuelles Datum
 * 2. Format Date - Formatiert als yyyy-MM-dd
 * 3. Text - Erstellt "_slug"
 * 4. Combine Text - Kombiniert Datum + Slug
 * 5. Create Note - Erstellt Session-Note mit Template
 * 6. Append Note - Fügt Link zur Hauptspieldatei hinzu (### Sessions)
 * 7. Create Daily Note - Erstellt/öffnet Daily Note
 * 8. Append to Daily Note - Fügt Session-Link hinzu (## Videospiele)
 */
export function buildGameWorkflow(game: Game, config: Config): WFAction[] {
  const actions: WFAction[] = [];

  // UUIDs generieren
  const currentDateUUID = generateUUID();
  const formattedDateUUID = generateUUID();
  const slugTextUUID = generateUUID();
  const combinedTextUUID = generateUUID();
  const createNoteUUID = generateUUID();
  const appendToGameUUID = generateUUID();
  const createDailyUUID = generateUUID();
  const appendToDailyUUID = generateUUID();

  // 1. Current Date
  actions.push(createCurrentDateAction(currentDateUUID));

  // 2. Format Date (yyyy-MM-dd)
  actions.push(createFormatDateAction(currentDateUUID, formattedDateUUID, WORKFLOW_CONSTANTS.DATE_FORMAT));

  // 3. Text mit Slug ("_slug")
  actions.push(createTextAction(`_${game.slug}`, slugTextUUID));

  // 4. Combine Text (Datum + Slug)
  actions.push(
    createCombineTextAction(
      [
        { outputName: "Formatiertes Datum", outputUUID: formattedDateUUID },
        { outputName: "Text", outputUUID: slugTextUUID },
      ],
      combinedTextUUID
    )
  );

  // 5. Create Note mit Template
  // Pfad: /hobbies/videospiele/[pokemon/]slug/sessions/ + Combined Text
  const sessionsPath = `/${game.sessionsPath}/`;
  const filePathWithVariable = createTextWithVariable(
    sessionsPath,
    sessionsPath.length,
    "Kombinierter Text",
    combinedTextUUID
  );

  actions.push(
    createAFOCreateNoteAction(
      config.vaultName,
      filePathWithVariable,
      `/${game.templateName}`,
      createNoteUUID
    )
  );

  // 6. Append Link zur Hauptspieldatei (unter ### Sessions)
  // Content: - [[Combined Text]]
  const appendContent = createTextWithVariable(
    "- [[]]",
    4, // Position nach "- [["
    "Kombinierter Text",
    combinedTextUUID
  );

  // Pfad zur Hauptdatei ohne .md Extension
  const gameFilePath = `/${game.gamePath.replace(/\.md$/, "")}`;

  actions.push(
    createAFOAppendNoteAction(
      config.vaultName,
      gameFilePath,
      appendContent,
      WORKFLOW_CONSTANTS.SESSIONS_HEADING,
      appendToGameUUID
    )
  );

  // 7. Create Daily Note
  actions.push(createAFOCreateDailyNoteAction(config.vaultName, createDailyUUID));

  // 8. Append to Daily Note (unter ## Videospiele)
  // Content: - [[slug|Display Name]]:  [[Combined Text]]
  const dailyLinkPrefix = `- [[${game.slug}|${game.displayName}]]:  [[`;
  const dailyAppendContent = createTextWithVariable(
    dailyLinkPrefix + "]]",
    dailyLinkPrefix.length,
    "Kombinierter Text",
    combinedTextUUID
  );

  actions.push(
    createAFOAppendToDailyNoteAction(
      config.vaultName,
      dailyAppendContent,
      WORKFLOW_CONSTANTS.DAILY_GAMES_HEADING,
      appendToDailyUUID
    )
  );

  return actions;
}

/**
 * Erstellt eine vollständige WFWorkflow-Struktur
 */
export function createWorkflow(
  actions: WFAction[],
  _name: string
): WFWorkflow {
  return {
    WFWorkflowClientVersion: WORKFLOW_CONSTANTS.CLIENT_VERSION,
    WFWorkflowClientRelease: WORKFLOW_CONSTANTS.CLIENT_VERSION,
    WFWorkflowMinimumClientVersion: WORKFLOW_CONSTANTS.MIN_CLIENT_VERSION,
    WFWorkflowMinimumClientVersionString: String(WORKFLOW_CONSTANTS.MIN_CLIENT_VERSION),
    WFWorkflowIcon: {
      WFWorkflowIconStartColor: WORKFLOW_CONSTANTS.ICON_COLOR,
      WFWorkflowIconGlyphNumber: WORKFLOW_CONSTANTS.ICON_GLYPH,
    },
    WFWorkflowTypes: ["NCWidget", "WatchKit"],
    WFWorkflowInputContentItemClasses: [
      "WFAppStoreAppContentItem",
      "WFArticleContentItem",
      "WFContactContentItem",
      "WFDateContentItem",
      "WFEmailAddressContentItem",
      "WFGenericFileContentItem",
      "WFImageContentItem",
      "WFiTunesProductContentItem",
      "WFLocationContentItem",
      "WFDCMapsLinkContentItem",
      "WFAVAssetContentItem",
      "WFPDFContentItem",
      "WFPhoneNumberContentItem",
      "WFRichTextContentItem",
      "WFSafariWebPageContentItem",
      "WFStringContentItem",
      "WFURLContentItem",
    ],
    WFWorkflowActions: actions,
    WFWorkflowImportQuestions: [],
    WFWorkflowOutputContentItemClasses: [],
    WFQuickActionSurfaces: [],
  };
}
