import { MODULE_ID, SETTINGS } from "./constants.mjs";
import { createSheetClass } from "./sheet.mjs";
import {
  CLIENT_THEME_CHOICES, THEME_CHOICES, THEMES, getActiveTheme, refreshOpenSheets, registerBuiltinThemes, registerTheme
} from "./themes.mjs";

Hooks.once("init", () => {
  if ( game.system.id !== "dnd5e" ) return;

  // Themes: eingebaute zuerst, dann dürfen andere Module eigene registrieren.
  registerBuiltinThemes();
  /**
   * Hook, mit dem andere Module eigene Themes registrieren können:
   *   Hooks.once("ascandirCharacterSheet.registerThemes", register => register({ id, label, base, stylesheet }));
   */
  Hooks.callAll("ascandirCharacterSheet.registerThemes", registerTheme);

  registerSettings();

  // Bogen registrieren
  const SheetClass = createSheetClass();
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, SheetClass, {
    types: ["character"],
    makeDefault: false,
    label: "ASCSHEET.SheetLabel",
    // Die Themes erscheinen in Foundrys Fenster „Bogen konfigurieren" im Feld „Theme".
    themes: THEME_CHOICES
  });

  // Öffentliche Schnittstelle
  game.modules.get(MODULE_ID).api = {
    sheetClass: SheetClass,
    themes: THEMES,
    registerTheme,
    getActiveTheme,
    refreshOpenSheets
  };
});

/* -------------------------------------------- */

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_THEME, {
    name: "ASCSHEET.Settings.DefaultTheme.Name",
    hint: "ASCSHEET.Settings.DefaultTheme.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: THEME_CHOICES,
    default: "parchment",
    onChange: () => refreshOpenSheets()
  });

  game.settings.register(MODULE_ID, SETTINGS.THEME, {
    name: "ASCSHEET.Settings.Theme.Name",
    hint: "ASCSHEET.Settings.Theme.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: CLIENT_THEME_CHOICES,
    default: "",
    onChange: () => refreshOpenSheets()
  });

  game.settings.register(MODULE_ID, SETTINGS.PLAYER_EDIT, {
    name: "ASCSHEET.Settings.PlayerEdit.Name",
    hint: "ASCSHEET.Settings.PlayerEdit.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      gm: "ASCSHEET.Settings.PlayerEdit.gm",
      always: "ASCSHEET.Settings.PlayerEdit.always"
    },
    default: "gm",
    onChange: () => rerenderSheets()
  });

  game.settings.register(MODULE_ID, SETTINGS.PLAYER_SETUP, {
    name: "ASCSHEET.Settings.PlayerSetup.Name",
    hint: "ASCSHEET.Settings.PlayerSetup.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => rerenderSheets()
  });
}

/* -------------------------------------------- */

function rerenderSheets() {
  for ( const app of foundry.applications.instances.values() ) {
    if ( app.element?.classList.contains("ascandir-sheet") && app.rendered ) app.render();
  }
}
