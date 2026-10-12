"""
Erzeugt die 13 Schadenstyp-Themes (Säure, Wucht, Kälte, Feuer, Energie, Blitz, Nekrotisch, Stich,
Gift, Psychisch, Gleißend, Hieb, Schall).

Grundlage ist der Blutmond-Satz (assets/crimson). Pro Schadenstyp werden
  - die dunklen Innenflächen umgefärbt,
  - das Metall der Rahmen (Gold, Silber, Bronze, Knochen …) angepasst,
  - das Leuchten (aktiver Tab, Inspiration) auf die Schadensfarbe gedreht,
  - eigene Hintergrund- und Panel-Texturen erzeugt
und die Farb-Variablen nach styles/themes/damage-types.css geschrieben.

Aufruf (im Modulordner):  python3 tools/build_damage.py        (alles)
                          python3 tools/build_damage.py --css  (nur CSS neu schreiben)
Benötigt: pillow, numpy
"""
import json, pathlib
import numpy as np
from PIL import Image

from build_art import FRAMES, BASE, GLOW, retint_dark, shift_glow, noise_texture, save_png, hsv

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "damage"
CSS = ROOT / "styles" / "themes" / "damage-types.css"

GOLD = None
# key: (Innenfarbe, Metall-Tönung oder GOLD, Leucht-Farbton 0..1, Akzentfarbe, Leuchtfarbe, Name DE, Name EN)
TYPES = {
    "acid":        ((22, 32, 16), (0.84, 1.00, 0.52), 0.22, "#8cc63f", (150, 220, 60),  "Säure",       "Acid"),
    "bludgeoning": ((33, 28, 24), (0.80, 0.75, 0.70), 0.08, "#b9803e", (230, 150, 70),  "Wucht",       "Bludgeoning"),
    "cold":        ((16, 28, 42), (0.84, 0.96, 1.12), 0.54, "#5cc8f2", (110, 210, 255), "Kälte",       "Cold"),
    "fire":        ((40, 17, 9),  GOLD,               0.05, "#f06a1e", (255, 120, 40),  "Feuer",       "Fire"),
    "force":       ((26, 15, 42), (0.96, 0.84, 1.12), 0.78, "#b768ff", (190, 110, 255), "Energie",     "Force"),
    "lightning":   ((12, 19, 40), (0.88, 0.95, 1.10), 0.60, "#58b0ff", (120, 190, 255), "Blitz",       "Lightning"),
    "necrotic":    ((15, 21, 15), (0.95, 0.92, 0.78), 0.32, "#7bd05a", (130, 230, 90),  "Nekrotisch",  "Necrotic"),
    "piercing":    ((22, 29, 24), (0.86, 0.90, 0.96), 0.13, "#d0b456", (240, 205, 100), "Stich",       "Piercing"),
    "poison":      ((30, 17, 36), (0.80, 1.00, 0.58), 0.30, "#6fdc4a", (120, 235, 80),  "Gift",        "Poison"),
    "psychic":     ((34, 15, 34), (1.06, 0.84, 1.00), 0.88, "#ff6fcf", (255, 120, 210), "Psychisch",   "Psychic"),
    "radiant":     ((42, 34, 18), GOLD,               0.14, "#ffd257", (255, 225, 120), "Gleißend",    "Radiant"),
    "slashing":    ((30, 19, 19), (0.88, 0.90, 0.95), 0.00, "#c4302b", (235, 60, 50),   "Hieb",        "Slashing"),
    "thunder":     ((19, 25, 34), (1.02, 0.80, 0.60), 0.62, "#7ea6ff", (140, 175, 255), "Schall",      "Thunder"),
}

GOLD_RGB = np.array([201, 163, 92], np.float32)

# --------------------------------------------------------------------------- Grafiken

def metalize(arr, tint):
    """Gold-Pixel in ein anderes Metall umfärben (Helligkeit bleibt, Farbton kommt aus 'tint')."""
    if tint is GOLD:
        return arr
    rgb, val, sat = hsv(arr)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    m = np.clip((sat - 0.18) / 0.2, 0, 1) * np.clip((lum - 0.08) / 0.1, 0, 1)
    metal = np.clip(np.clip(lum * 1.12, 0, 1)[..., None] * np.array(tint)[None, None, :], 0, 1) * 255
    out = arr.copy()
    out[..., :3] = arr[..., :3] * (1 - m[..., None]) + metal * m[..., None]
    return out

def build_assets(key, target, tint, hue, out=None):
    folder = (out or OUT) / key
    for name in FRAMES:
        a = np.array(Image.open(BASE / f"{name}.png").convert("RGBA")).astype(np.float32)
        a = retint_dark(a, target)
        a = metalize(a, tint)
        if name in GLOW:
            a = shift_glow(a, hue, GLOW[name], 1.15)
        save_png(a, folder, name)
    t = np.array(target, np.float32)
    noise_texture(512, base=tuple(t * 0.85), contrast=0.38, seed=sum(map(ord, key)), beta=2.4) \
        .convert("RGB").save(folder / "wood-dark.jpg", quality=86)
    noise_texture(512, base=tuple(t * 1.05 + 4), contrast=0.2, seed=sum(map(ord, key)) + 1, beta=2.0) \
        .convert("RGB").save(folder / "parchment.jpg", quality=86)

# --------------------------------------------------------------------------- CSS

def hx(c):
    c = np.clip(np.round(np.array(c, np.float32)), 0, 255).astype(int)
    return "#{:02x}{:02x}{:02x}".format(*c)

def rgb(c, a=None):
    c = np.clip(np.round(np.array(c, np.float32)), 0, 255).astype(int)
    return f"rgb({c[0]} {c[1]} {c[2]}" + (f" / {a}%)" if a is not None else ")")

def mix(a, b, t):
    return np.array(a, np.float32) * (1 - t) + np.array(b, np.float32) * t

def from_hex(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)

def theme_css(key, target, tint, accent_hex, glow):
    t = np.array(target, np.float32)
    glow = np.array(glow, np.float32)
    acc = from_hex(accent_hex)
    tint_arr = np.array([1, 1, 1], np.float32) if tint is GOLD else np.array(tint, np.float32)
    base_metal = GOLD_RGB if tint is GOLD else np.full(3, 166 * 1.12, np.float32) * tint_arr
    gold = base_metal
    gold_light = mix(gold, (255, 255, 255), 0.45)
    gold_dark = gold * 0.48
    white = (255, 255, 255)
    text = mix(white, acc, 0.10) * 0.92
    heading = mix(white, acc, 0.06)
    muted = mix(text, t * 3, 0.45)
    on_dark = mix(white, gold, 0.25)
    panel = t * 1.15 + 4
    card = t * 1.3 + 6
    dark = t * 0.55
    return f"""
/* ---- {key} ---- */
.ascandir-sheet.asc-theme-{key} {{
  --asc-frame-bg: {hx(t * 0.35)};
  --asc-frame-border: {hx(gold_dark)};
  --asc-content-bg: linear-gradient(to bottom, {hx(t * 0.8)}, {hx(t * 0.4)});
  --asc-dark-bg: linear-gradient(to bottom, {hx(t * 1.05)}, {hx(t * 0.65)});
  --asc-wood-overlay:
    radial-gradient(ellipse at 50% 0%, {rgb(glow, 16)}, transparent 55%),
    linear-gradient({rgb(dark, 30)}, {rgb(dark, 55)});
  --asc-dark-overlay: linear-gradient({rgb(dark, 30)}, {rgb(dark, 50)});
  --asc-panel-overlay: radial-gradient(ellipse at center, {rgb(glow, 4)} 30%, rgb(0 0 0 / 38%) 100%);
  --asc-glow: {rgb(glow, 80)};

  --asc-gold: {hx(gold)};
  --asc-gold-light: {hx(gold_light)};
  --asc-gold-dark: {hx(gold_dark)};

  --asc-panel-bg: linear-gradient(to bottom, {hx(panel)}, {hx(panel * 0.8)});
  --asc-card-bg: linear-gradient(to bottom, {hx(card)}, {hx(card * 0.75)});
  --asc-system-tab-bg: linear-gradient(to bottom, {hx(panel * 0.95)}, {hx(panel * 0.75)});
  --asc-panel-color: {hx(panel * 0.9)};
  --asc-card-color: {hx(card * 0.9)};
  --asc-panel-dark: {hx(mix(panel, acc, 0.18))};
  --asc-header-color: {hx(t * 0.5)};
  --asc-panel-border: {hx(gold_dark)};
  --asc-panel-inner-border: {rgb(gold, 25)};
  --asc-panel-header-text: {hx(on_dark)};
  --asc-panel-shadow: 0 3px 10px rgb(0 0 0 / 80%);

  --asc-text: {hx(text)};
  --asc-text-muted: {hx(muted)};
  --asc-text-heading: {hx(heading)};
  --asc-text-on-dark: {hx(on_dark)};
  --asc-icon: {hx(mix(gold_light, acc, 0.35))};
  --asc-accent: {hx(acc * 0.82)};
  --asc-accent-contrast: #ffffff;
  --asc-positive: #3f8a55;
  --asc-soft-bg: {rgb(gold, 9)};
  --asc-line: {rgb(gold, 26)};
  --asc-ring: {hx(mix(gold, muted, 0.5))};

  --asc-row-alt: {rgb(gold, 6)};
  --asc-row-hover: {rgb(acc, 22)};
  --asc-row-border: {rgb(gold, 17)};

  --asc-tab-text: {hx(on_dark)};
  --asc-tab-icon: {hx(mix(gold_light, acc, 0.3))};
  --asc-tab-active-bg: radial-gradient(ellipse at 50% 90%, {rgb(glow, 75)}, {rgb(glow * 0.45, 70)} 55%, {rgb(t * 0.6, 95)} 100%);
  --asc-tab-active-text: #ffffff;

  --asc-badge-bg: {hx(t * 0.45)};
  --asc-badge-text: {hx(heading)};
  --asc-meter-bg: {hx(t * 0.3)};
  --asc-hp-fill-1: #17703a;
  --asc-hp-fill-2: #43c46d;
  --asc-hd-fill-1: {hx(mix(acc, (0, 0, 0), 0.6))};
  --asc-hd-fill-2: {hx(mix(acc, (0, 0, 0), 0.35))};
  --asc-mana-fill: linear-gradient(to bottom, {hx(mix(acc, white, 0.3))}, {hx(acc * 0.6)});
  --asc-enc-fill: linear-gradient(to bottom, {hx(mix(acc, white, 0.3))}, {hx(acc * 0.6)});
  --asc-pip-fill: {hx(acc)};
  --asc-gem: {hx(mix(acc, white, 0.15))};

  --asc-input-bg: rgb(0 0 0 / 30%);
  --asc-input-border: {rgb(gold, 30)};
  --asc-search-bg: {hx(t * 0.4)};
  --asc-condition-icon-filter: brightness(0) invert(.85);
}}

"""

def emblem_css(key, glow, mask_url, title="Symbol"):
    """Symbol als leuchtendes Wasserzeichen im Namensschild und bei der Inspiration."""
    glow = np.array(glow, np.float32)
    return f"""
/* {title} als Wasserzeichen im Namensschild und bei der Inspiration */
.dnd5e2.sheet.actor.character.ascandir-sheet.asc-theme-{key}:not(.limited) {{
  .asc-nameplate {{
    &::before {{
      content: "";
      position: absolute;
      inset: 16px 28% 6px;
      background: {rgb(glow, 100)};
      mask: url("{mask_url}") center / contain no-repeat;
      opacity: .24;
      pointer-events: none;
      filter: drop-shadow(0 0 6px {rgb(glow, 80)});
    }}
    .asc-name, .asc-subtitle {{ position: relative; z-index: 1; }}
  }}
  .asc-insp-title i {{
    width: 22px;
    height: 22px;
    background: {hx(glow)};
    mask: url("{mask_url}") center / contain no-repeat;
    &::before {{ display: none; }}
  }}
}}
"""

def main(css_only=False):
    css = ["/* Automatisch erzeugt von tools/build_damage.py – Schadenstyp-Themes. Nicht von Hand bearbeiten. */"]
    names = {}
    for key, (target, tint, hue, accent, glow, de, en) in TYPES.items():
        if not css_only:
            build_assets(key, target, tint, hue)
        css.append(theme_css(key, target, tint, accent, glow))
        css.append(emblem_css(key, glow, f"../../../../systems/dnd5e/icons/svg/damage/{key}.svg", "Schadens-Symbol"))
        names[key] = {"de": de, "en": en}
        print("Theme erzeugt:", key)
    CSS.write_text("\n".join(css), encoding="utf-8")
    (ROOT / "tools" / "damage-types.json").write_text(json.dumps(names, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    import sys
    main(css_only="--css" in sys.argv)
