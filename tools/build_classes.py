"""
Erzeugt die Klassen-Themes (Barbar, Barde, Kleriker, Druide, Kämpfer, Mönch, Paladin, Waldläufer,
Schurke, Zauberer, Hexenmeister, Magier, Magieschmied) im selben Stil wie die Schadenstyp-Themes.

Grafiken:  assets/classes/<klasse>/   (aus dem Blutmond-Satz umgefärbt, + emblem.svg)
Farben:    styles/themes/class-themes.css

Aufruf (im Modulordner):  python3 tools/build_classes.py        (alles)
                          python3 tools/build_classes.py --css  (nur CSS neu schreiben)
Symbole: Font Awesome Free (CC BY 4.0), siehe assets/classes/LICENSE-fontawesome.txt
"""
import json, pathlib, shutil, sys

from build_damage import GOLD, build_assets, theme_css, emblem_css

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "classes"
CSS = ROOT / "styles" / "themes" / "class-themes.css"
FA_SVGS = pathlib.Path(sys.argv[sys.argv.index("--fa") + 1]) if "--fa" in sys.argv else None

# key: (Innenfarbe, Metall-Tönung oder GOLD, Leucht-Farbton 0..1, Akzentfarbe, Leuchtfarbe, Symbol, Name DE, Name EN)
CLASSES = {
    "barbarian": ((36, 20, 14), (0.86, 0.78, 0.70), 0.03, "#d9542a", (245, 95, 45),   "hand-fist",     "Barbar",       "Barbarian"),
    "bard":      ((34, 15, 30), GOLD,               0.92, "#d45fa0", (240, 110, 190), "guitar",        "Barde",        "Bard"),
    "cleric":    ((38, 34, 26), GOLD,               0.13, "#f2d27a", (255, 230, 150), "hands-praying", "Kleriker",     "Cleric"),
    "druid":     ((18, 28, 16), (1.00, 0.85, 0.60), 0.28, "#6fb34a", (130, 210, 90),  "leaf",          "Druide",       "Druid"),
    "fighter":   ((26, 26, 31), (0.86, 0.89, 0.95), 0.00, "#b8433a", (225, 75, 60),   "shield-halved", "Kämpfer",      "Fighter"),
    "monk":      ((32, 25, 14), (1.00, 0.82, 0.58), 0.09, "#e39b2d", (250, 170, 60),  "yin-yang",      "Mönch",        "Monk"),
    "paladin":   ((15, 22, 42), GOLD,               0.13, "#e8c45a", (255, 215, 110), "shield-heart",  "Paladin",      "Paladin"),
    "ranger":    ((31, 24, 15), (1.00, 0.85, 0.60), 0.30, "#79b04a", (140, 205, 90),  "paw",           "Waldläufer",   "Ranger"),
    "rogue":     ((17, 17, 21), (0.80, 0.82, 0.88), 0.74, "#8b7fd0", (160, 140, 240), "user-secret",   "Schurke",      "Rogue"),
    "sorcerer":  ((38, 12, 18), GOLD,               0.97, "#e8455a", (255, 80, 100),  "dragon",        "Zauberer",     "Sorcerer"),
    "warlock":   ((20, 13, 31), (0.92, 0.80, 1.06), 0.33, "#7de05a", (140, 240, 100), "eye",           "Hexenmeister", "Warlock"),
    "wizard":    ((20, 18, 44), (0.88, 0.93, 1.08), 0.68, "#7a6bff", (140, 125, 255), "hat-wizard",    "Magier",       "Wizard"),
    "artificer": ((18, 28, 30), (1.06, 0.72, 0.50), 0.50, "#3fc1b8", (90, 225, 215),  "gears",         "Magieschmied", "Artificer"),
}

def main(css_only=False):
    css = ["/* Automatisch erzeugt von tools/build_classes.py – Klassen-Themes. Nicht von Hand bearbeiten. */"]
    names = {}
    for key, (target, tint, hue, accent, glow, icon, de, en) in CLASSES.items():
        if not css_only:
            build_assets(key, target, tint, hue, out=OUT)
            if FA_SVGS:
                shutil.copy(FA_SVGS / "solid" / f"{icon}.svg", OUT / key / "emblem.svg")
        css.append(theme_css(key, target, tint, accent, glow))
        css.append(emblem_css(key, glow, f"../../assets/classes/{key}/emblem.svg", "Klassen-Symbol"))
        names[key] = {"de": de, "en": en}
        print("Theme erzeugt:", key)
    CSS.write_text("\n".join(css), encoding="utf-8")
    (ROOT / "tools" / "class-themes.json").write_text(json.dumps(names, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main(css_only="--css" in sys.argv)
