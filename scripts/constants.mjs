/** Modul-ID, muss mit module.json übereinstimmen. */
export const MODULE_ID = "ascandir-dnd5e-character-sheet";

/** Pfad zu den Templates dieses Moduls. */
export const TEMPLATE_PATH = `modules/${MODULE_ID}/templates`;

/** Schlüssel der Einstellungen. */
export const SETTINGS = {
  THEME: "theme",
  DEFAULT_THEME: "defaultTheme",
  PLAYER_EDIT: "playerEditMode",
  PLAYER_SETUP: "playerSetup",
  MAKE_DEFAULT: "makeDefault"
};

/** Flag am Actor, mit dem der SL den Bearbeitungsmodus für Spieler freigibt. */
export const FLAG_PLAYER_EDIT = "allowPlayerEdit";

/** Item-Typen, die den Charakteraufbau bestimmen (nur mit Bearbeitungsrecht änderbar). */
export const ORIGIN_TYPES = new Set(["class", "subclass", "race", "background"]);
