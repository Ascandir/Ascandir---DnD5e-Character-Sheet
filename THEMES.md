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
| `--asc-content-bg` | Hintergrund hinter den Panels (Holz) |
| `--asc-dark-bg` | dunkle Kästen: Panel-Rahmen, Namensschild, Tabs, TP-Kasten, Inspiration |
| `--asc-gold`, `--asc-gold-light`, `--asc-gold-dark` | Zierlinien, Rahmen, Akzentlinien |
| `--asc-panel-bg` | Panel-Hintergrund (darf Verlauf/Textur sein) |
| `--asc-panel-color` | dieselbe Farbe einfarbig (für Innenlinien) |
| `--asc-card-bg`, `--asc-card-color` | Attributskarten, Kästchen |
| `--asc-panel-dark` | dunkleres Pergament (Band „Angriffe“, Gruppenköpfe) |
| `--asc-panel-border`, `--asc-panel-inner-border` | Panel-Rahmen außen/innen |
| `--asc-header-color`, `--asc-panel-header-text` | dunkle Grundfarbe einfarbig, Schrift der Panel-Überschriften |
| `--asc-system-tab-bg` | Hintergrund der Original-Tabs (Inventar, Zauber …) |
| `--asc-text`, `--asc-text-muted`, `--asc-text-heading`, `--asc-text-on-dark` | Schriftfarben |
| `--asc-accent`, `--asc-accent-contrast`, `--asc-positive` | Akzentfarbe (Übung, aktive Zustände), Text darauf, „erledigt" |
| `--asc-row-alt`, `--asc-row-hover`, `--asc-row-border` | Tabellenzeilen |
| `--asc-tab-text`, `--asc-tab-icon`, `--asc-tab-active-bg`, `--asc-tab-active-text` | Tabs |
| `--asc-icon` | Symbole auf Pergament (Fertigkeiten, Attribute) |
| `--asc-badge-bg`, `--asc-badge-text` | dunkle Abzeichen (Modifikatoren, Werte-Kästen) |
| `--asc-meter-bg`, `--asc-hp-fill-1/2`, `--asc-hd-fill-1/2` | TP- und Trefferwürfel-Balken |
| `--asc-mana-fill`, `--asc-enc-fill`, `--asc-pip-fill`, `--asc-gem` | Zauberplatz-Balken, Traglast, Rauten, Edelsteine |
| `--asc-search-bg` | Suchfelder |
| `--asc-input-bg`, `--asc-input-border` | Eingabefelder |
| `--asc-condition-icon-filter` | Einfärbung der Zustands-Symbole |
| `--asc-font-heading`, `--asc-font-body`, `--asc-radius` | Schriften, Eckenradius |

## Grafiken (Skins)

Jedes Theme kann einen eigenen Grafik-Ordner haben (`assets: "..."` bei `registerTheme`). Darin liegen
immer dieselben 22 Dateien:

`frame-window.png`, `frame-panel.png`, `crest-nameplate.png`, `nameplate.png`, `portrait-arch.png`,
`medallion.png`, `lozenge.png`, `ability-card.png`, `ability-score-box.png`, `mod-badge.png`, `shield-ac.png`,
`badge-hex.png`, `badge-oct.png`, `ribbon.png`, `tab-active.png`, `tab-divider.png`, `inspiration-off.png`,
`inspiration-on.png`, `circle-slot.png`, `search-bar.png`, `wood-dark.jpg`, `parchment.jpg`

Das Modul setzt sie automatisch als CSS-Variablen `--asc-img-<name>` ein; `styles/skin.css` baut damit
Rahmen, Abzeichen und Texturen auf. Ein neues Theme braucht also nur:

1. einen Ordner mit diesen Dateien (z. B. `assets/mein-theme/`),
2. eine kleine CSS-Datei mit den Farb-Variablen (siehe `styles/themes/crimson.css`),
3. eine Zeile in `registerBuiltinThemes()` in `scripts/themes.mjs`.

Die Grafiken von „Blutmond“ (`assets/crimson`) sind aus den Pergament-Grafiken umgefärbt; „Arkanum“ und
„Nachtwache“ erzeugt `tools/build_art.py` aus dem Blutmond-Satz (`python3 tools/build_art.py`).
Die 13 Schadenstyp-Themes (`assets/damage/<typ>`, Farben in `styles/themes/damage-types.css`) erzeugt
`python3 tools/build_damage.py`; Farben, Metall und Leuchtton stehen dort in der Tabelle `TYPES`.
Eigene, neu gemalte Grafiken können die Dateien jederzeit ersetzen.

Zusätzliche Variablen für Skins: `--asc-wood-overlay`, `--asc-dark-overlay`, `--asc-panel-overlay`
(Abdunklung über Holz/Pergament), `--asc-glow` (Leuchtfarbe), `--asc-soft-bg`, `--asc-line`, `--asc-ring`.

## Fenstergröße

Der Bogen ist für ca. 1270 × 1240 Pixel gestaltet und passt sein Raster per Container Queries an die
Fenstergröße an (`asc-win` für das ganze Fenster, `asc-body` für den Tab-Bereich). Themes müssen sich darum
nicht kümmern.
