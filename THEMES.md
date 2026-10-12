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

## Zierrahmen

Die verschnörkelten Ecken kommen aus SVG-Grafiken in `assets/` (`frame-gold.svg`, `crest-gold.svg`,
Silber-Varianten für Nachtwache). Ein Theme legt am Ende seiner CSS-Datei fest, welche Grafik es nutzt
(siehe `parchment.css`): `border-image-source` für `::after` des Fensters und von `.asc-framed`,
dazu `.asc-crest` für das Wappen über dem Namen. Für neue Farben einfach eine SVG kopieren und die
drei Farbwerte darin ändern.

## Skalierung

Alle Maße sind für ein Raster von 1270 × 1240 Pixeln gebaut. Der Bogen skaliert den Inhalt automatisch
proportional zur Fenstergröße (`--asc-zoom`). Themes müssen sich darum nicht kümmern.
