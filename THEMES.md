# Themes (Skins) für den Ascandir-Bogen

Jedes Theme ist eine CSS-Datei, die nur **Variablen** setzt. Layout und Funktionen bleiben gleich,
deshalb ist ein neues Theme schnell gemacht.

## Neues eingebautes Theme anlegen

1. `styles/themes/parchment.css` kopieren, z. B. nach `styles/themes/blutmond.css`.
2. In der Datei die Klasse ändern: `.ascandir-sheet.asc-theme-blutmond { ... }` und die Farben anpassen.
3. Die Datei in `module.json` unter `"styles"` eintragen.
4. In `scripts/themes.mjs` in `registerBuiltinThemes()` eine Zeile ergänzen:
   ```js
   registerTheme({ id: "blutmond", label: "ASCSHEET.Theme.blutmond", base: "dark" });
   ```
5. Den Namen in `lang/de.json` und `lang/en.json` unter `ASCSHEET.Theme` eintragen.

`base` ist `"light"` oder `"dark"` und steuert, welche Grundfarben die Original-Bausteine
des Systems (Inventarliste, Zauberliste, Effekte) verwenden. Helle Panels → `light`, dunkle Panels → `dark`.

Danach erscheint das Theme in Foundry im Fenster **„Bogen konfigurieren" → Theme** und in den Modul-Einstellungen.

## Theme aus einem anderen Modul

```js
Hooks.once("ascandirCharacterSheet.registerThemes", register => {
  register({
    id: "mein-theme",
    label: "Mein Theme",
    base: "light",
    stylesheet: "modules/mein-modul/styles/mein-theme.css"
  });
});
```

## Reihenfolge, welches Theme gilt

1. Theme aus „Bogen konfigurieren" (für diesen Charakter oder als Standard für den Bogen)
2. „Mein Theme" in den Modul-Einstellungen (pro Spieler)
3. „Standard-Theme (Welt)" in den Modul-Einstellungen (vom SL)

## Variablen

| Variable | Wofür |
|---|---|
| `--asc-frame-bg`, `--asc-frame-border` | Fensterrahmen |
| `--asc-content-bg` | Hintergrund hinter den Panels |
| `--asc-gold`, `--asc-gold-light`, `--asc-gold-dark` | Zierlinien, Rahmen, Akzentlinien |
| `--asc-panel-bg` | Panel-Hintergrund (darf Verlauf/Textur sein) |
| `--asc-panel-color` | dieselbe Farbe einfarbig (für Innenlinien) |
| `--asc-card-bg`, `--asc-card-color` | Attributskarten, Kästchen |
| `--asc-panel-border`, `--asc-panel-inner-border` | Panel-Rahmen außen/innen |
| `--asc-panel-header-bg`, `--asc-header-color`, `--asc-panel-header-text` | Panel-Überschriften |
| `--asc-nameplate-bg`, `--asc-tabbar-bg`, `--asc-portrait-bg` | Namensschild, Tab-Leiste, Porträtrahmen |
| `--asc-system-tab-bg` | Hintergrund der Original-Tabs (Inventar, Zauber …) |
| `--asc-text`, `--asc-text-muted`, `--asc-text-heading`, `--asc-text-on-dark` | Schriftfarben |
| `--asc-accent`, `--asc-accent-contrast`, `--asc-positive` | Akzentfarbe (Übung, aktive Zustände), Text darauf, „erledigt" |
| `--asc-row-alt`, `--asc-row-hover`, `--asc-row-border` | Tabellenzeilen |
| `--asc-tab-bg`, `--asc-tab-text`, `--asc-tab-active-bg`, `--asc-tab-active-text` | Tabs |
| `--asc-badge-bg`, `--asc-badge-text`, `--asc-shield-bg` | dunkle Abzeichen, RK-Schild |
| `--asc-meter-bg`, `--asc-hp-fill-1/2`, `--asc-hd-fill-1/2` | TP- und Trefferwürfel-Balken |
| `--asc-xp-fill`, `--asc-enc-fill`, `--asc-pip-fill` | EP-Balken, Traglast, Zauberplätze |
| `--asc-input-bg`, `--asc-input-border` | Eingabefelder |
| `--asc-ability-icon`, `--asc-condition-icon-filter` | Symbolfarben |
| `--asc-font-heading`, `--asc-font-body`, `--asc-radius` | Schriften, Eckenradius |

Zusätzliche Verzierungen (z. B. Ecken-Ornamente) können im Theme mit eigenen Regeln unter
`.ascandir-sheet.asc-theme-<id>` ergänzt werden, siehe Ende von `parchment.css`.
