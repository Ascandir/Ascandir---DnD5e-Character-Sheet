import { MODULE_ID, SETTINGS } from "./constants.mjs";

/**
 * @typedef {object} SheetTheme
 * @property {string} id            Eindeutige ID, wird zur CSS-Klasse `asc-theme-<id>`.
 * @property {string} label         Anzeigename (oder Übersetzungsschlüssel).
 * @property {"light"|"dark"} base  Welches Foundry-Grundschema die Inhalte (Inventar, Zauberliste ...) nutzen.
 * @property {string} [stylesheet]  Optionaler Pfad zu einer CSS-Datei, die nachgeladen wird
 *                                  (für Themes aus anderen Modulen oder aus dem Datenordner).
 * @property {string} [author]      Optional, nur zur Anzeige.
 */

/**
 * Alle registrierten Themes.
 * @type {Map<string, SheetTheme>}
 */
export const THEMES = new Map();

/**
 * Auswahlliste für die Einstellungen. Wird live aktualisiert, wenn neue Themes dazukommen.
 * @type {Record<string, string>}
 */
export const THEME_CHOICES = {};

/**
 * Auswahlliste für die Spieler-Einstellung, mit „Standard der Welt" als erstem Eintrag.
 * @type {Record<string, string>}
 */
export const CLIENT_THEME_CHOICES = { "": "ASCSHEET.Settings.ThemeWorldDefault" };

/* -------------------------------------------- */

/**
 * Ein Theme registrieren.
 * Eingebaute Themes liegen in `styles/themes/<id>.css` und sind in module.json eingetragen.
 * Externe Themes geben `stylesheet` an, die Datei wird dann automatisch geladen.
 * @param {SheetTheme} theme
 * @returns {SheetTheme}
 */
export function registerTheme(theme) {
  if ( !theme?.id || !/^[a-z0-9-]+$/.test(theme.id) ) {
    throw new Error(`${MODULE_ID} | Theme-ID muss aus Kleinbuchstaben, Zahlen und Bindestrichen bestehen.`);
  }
  const entry = { base: "light", ...theme };
  THEMES.set(entry.id, entry);
  THEME_CHOICES[entry.id] = entry.label;
  CLIENT_THEME_CHOICES[entry.id] = entry.label;
  if ( entry.stylesheet ) _injectStylesheet(entry);
  return entry;
}

/* -------------------------------------------- */

/**
 * Die eingebauten Themes. Neue Themes hier ergänzen (und die CSS-Datei in module.json eintragen).
 */
export function registerBuiltinThemes() {
  registerTheme({ id: "parchment", label: "ASCSHEET.Theme.parchment", base: "light", author: "Ascandir" });
  registerTheme({ id: "nightwatch", label: "ASCSHEET.Theme.nightwatch", base: "dark", author: "Ascandir" });
}

/* -------------------------------------------- */

/**
 * Das aktive Theme bestimmen. Reihenfolge:
 * 1. Theme aus Foundrys „Bogen konfigurieren" (für diesen Charakter oder als Standard für den Bogen)
 * 2. Theme aus den Spieler-Einstellungen des Moduls
 * 3. Standard-Theme der Welt
 * @param {foundry.abstract.Document} [document]
 * @returns {SheetTheme}
 */
export function getActiveTheme(document) {
  let id = "";
  try {
    if ( document ) {
      const sheetTheme = foundry.applications.apps.DocumentSheetConfig.getSheetThemeForDocument(document);
      if ( THEMES.has(sheetTheme) ) id = sheetTheme;
    }
  } catch { /* ältere API */ }
  try {
    id ||= game.settings.get(MODULE_ID, SETTINGS.THEME) || game.settings.get(MODULE_ID, SETTINGS.DEFAULT_THEME);
  } catch { /* Einstellungen noch nicht registriert */ }
  return THEMES.get(id) ?? THEMES.get("parchment") ?? THEMES.values().next().value;
}

/* -------------------------------------------- */

/**
 * CSS-Klassen eines Themes auf ein Element anwenden und andere Themes entfernen.
 * Foundrys eigene Theme-Klassen (theme-light/theme-dark/theme-<id>) werden durch das Grundschema
 * des Themes ersetzt, damit Inventar, Zauberliste usw. die passenden Systemfarben bekommen.
 * @param {HTMLElement} element
 * @param {SheetTheme} [theme]
 */
export function applyTheme(element, theme=getActiveTheme()) {
  if ( !element || !theme ) return;
  for ( const cls of Array.from(element.classList) ) {
    if ( cls.startsWith("asc-theme-") || cls.startsWith("theme-") ) element.classList.remove(cls);
  }
  element.classList.add("themed", `theme-${theme.base}`, `asc-theme-${theme.id}`);
  element.dataset.ascTheme = theme.id;
}

/* -------------------------------------------- */

/**
 * Alle offenen Bögen dieses Moduls neu einfärben.
 */
export function refreshOpenSheets() {
  for ( const app of foundry.applications.instances.values() ) {
    if ( app.element?.classList.contains("ascandir-sheet") ) applyTheme(app.element, getActiveTheme(app.document));
  }
}

/* -------------------------------------------- */

function _injectStylesheet(theme) {
  const id = `asc-theme-css-${theme.id}`;
  if ( document.getElementById(id) ) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = theme.stylesheet;
  document.head.append(link);
}
