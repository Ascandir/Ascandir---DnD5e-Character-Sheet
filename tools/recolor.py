"""Erzeugt aus den Pergament-Grafiken umgefärbte Grafiksätze für weitere Themes.

Jeder Pixel wird anteilig einer von drei Gruppen zugeordnet:
  - Metall (goldene Rahmen, gesättigt gelb/orange)
  - Füllung hell (Pergament, hell und wenig gesättigt)
  - Füllung dunkel (schwarze Flächen, Holz)
und je Theme anders eingefärbt. Leuchten (orange Glut) wird separat umgefärbt.
"""
import sys
import numpy as np
from PIL import Image

SRC = "/home/claude/ascandir---dnd5e-character-sheet/assets/parchment"
DST = "/home/claude/ascandir---dnd5e-character-sheet/assets"

THEMES = {
    "nightwatch": {
        "metal": "silver",
        "light_fill": (0x26, 0x2d, 0x37),   # Pergament -> Schiefer
        "dark_fill": (0x10, 0x13, 0x18),
        "glow": (0x3c, 0xc8, 0xd2),          # Türkis
        "wood": ((0x1e, 0x24, 0x2c), 0.0),  # Farbe, Sättigungsanteil des Originals
        "panel": (0x23, 0x2a, 0x33),
    },
    "crimson": {
        "metal": "gold",
        "light_fill": (0x22, 0x1b, 0x1a),   # Pergament -> dunkler Stein
        "dark_fill": (0x14, 0x0e, 0x0d),
        "glow": (0xe8, 0x3a, 0x22),          # Glutrot
        "wood": ((0x2a, 0x10, 0x0e), 0.15),
        "panel": (0x1f, 0x19, 0x18),
    },
    "arcane": {
        "metal": "gold",
        "light_fill": (0x16, 0x1e, 0x33),   # Pergament -> Nachtblau
        "dark_fill": (0x0b, 0x10, 0x1f),
        "glow": (0x3d, 0x8b, 0xff),          # Arkanblau
        "wood": ((0x0f, 0x16, 0x2c), 0.0),
        "panel": (0x15, 0x1c, 0x30),
    },
}


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    return h, s, mx


# Bilder mit Pergament-Füllung: Innenbereich = weiter als T Pixel vom transparenten Rand entfernt
FILL_DEPTH = {"ability-card": 9, "ability-score-box": 9, "lozenge": 9, "ribbon": 6}
# Bilder mit leuchtendem Innenbereich: Innenbereich komplett in die Leuchtfarbe des Themes umfärben
GLOW_DEPTH = {"tab-active": 11, "inspiration-on": 16}


def recolor_glow(rgba, cfg, depth):
    out = recolor(rgba, cfg).astype(np.float32)
    inner = interior_mask(rgba, depth)[..., None]
    rgb = rgba[..., :3] / 255.0
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    g = np.array(cfg["glow"]) / 255.0
    dark = np.array(cfg["dark_fill"]) / 255.0
    t = np.clip(lum * 1.05, 0, 1)[..., None]
    col = dark * (1 - t) + g * t + (lum ** 4)[..., None] * 0.9
    glow = np.clip(col, 0, 1) * 255
    out[..., :3] = out[..., :3] * (1 - inner) + glow * inner
    return np.clip(out, 0, 255).astype(np.uint8)


def interior_mask(rgba, depth):
    import cv2
    alpha = (rgba[..., 3] > 128).astype(np.uint8)
    dist = cv2.distanceTransform(alpha, cv2.DIST_L2, 5)
    return smooth(dist, depth - 1.5, depth + 1.5)


def recolor(rgba, cfg, depth=None):
    rgb = rgba[..., :3] / 255.0
    h, s, v = hsv(rgb)
    lum = rgb @ np.array([0.299, 0.587, 0.114])

    w_light = smooth(v, 0.55, 0.72) * (1 - smooth(s, 0.36, 0.5))
    if depth:
        inner = interior_mask(rgba, depth) * (1 - smooth(s, 0.55, 0.65)) * smooth(v, 0.3, 0.42)
        w_light = np.maximum(w_light, inner)
    w_glow = smooth(s, 0.55, 0.8) * smooth(v, 0.55, 0.85) * ((h < 45) | (h > 340))
    w_metal = np.clip(smooth(s, 0.28, 0.45) * smooth(v, 0.18, 0.35) * (1 - w_light) - w_glow, 0, 1)
    w_dark = np.clip(1 - w_light - w_metal - w_glow, 0, 1)

    # Metall
    if cfg["metal"] == "silver":
        L = lum * 1.25
        metal = np.stack([L * 0.93, L * 0.98, L * 1.08], -1)
    else:
        metal = rgb
    # helle Füllung: Struktur der Helligkeit behalten
    base = np.array(cfg["light_fill"]) / 255.0
    rel = (lum - 0.78) * 0.9
    light = np.clip(base * (1 + rel[..., None] * 1.6) + rel[..., None] * 0.05, 0, 1)
    # dunkle Füllung
    dbase = np.array(cfg["dark_fill"]) / 255.0
    dark = np.clip(dbase * (0.6 + lum[..., None] * 3.0), 0, 1)
    # Leuchten
    gcol = np.array(cfg["glow"]) / 255.0
    glow = np.clip(gcol * (lum[..., None] * 1.6) + (lum[..., None] ** 3) * 0.6, 0, 1)

    out = (metal * w_metal[..., None] + light * w_light[..., None] + dark * w_dark[..., None] + glow * w_glow[..., None])
    total = (w_metal + w_light + w_dark + w_glow)[..., None]
    out = out / np.maximum(total, 1e-6)
    res = rgba.copy().astype(np.float32)
    res[..., :3] = np.clip(out * 255, 0, 255)
    return res.astype(np.uint8)


def texture(rgb, color, keep_sat):
    rgb = rgb / 255.0
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    c = np.array(color) / 255.0
    norm = lum / max(lum.mean(), 1e-3)
    tinted = c * norm[..., None]
    out = tinted * (1 - keep_sat) + rgb * keep_sat * (c.mean() / max(rgb.mean(), 1e-3))
    return np.clip(out * 255, 0, 255).astype(np.uint8)


def panel_texture(rgb, color):
    rgb = rgb / 255.0
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    c = np.array(color) / 255.0
    var = (lum - lum.mean()) * 1.4
    out = c * (1 + var[..., None] * 2.2)
    return np.clip(out * 255, 0, 255).astype(np.uint8)


def main(names):
    import glob, os
    for name in names:
        cfg = THEMES[name]
        out = f"{DST}/{name}"
        os.makedirs(out, exist_ok=True)
        for f in glob.glob(f"{SRC}/*.png"):
            a = np.array(Image.open(f).convert("RGBA"))
            key = os.path.basename(f)[:-4]
            res = recolor_glow(a, cfg, GLOW_DEPTH[key]) if key in GLOW_DEPTH else recolor(a, cfg, FILL_DEPTH.get(key))
            Image.fromarray(res).save(f"{out}/{os.path.basename(f)}", optimize=True)
        wood = np.array(Image.open(f"{SRC}/wood-dark.jpg").convert("RGB")).astype(np.float32)
        Image.fromarray(texture(wood, *cfg["wood"])).save(f"{out}/wood-dark.jpg", quality=88)
        par = np.array(Image.open(f"{SRC}/parchment.jpg").convert("RGB")).astype(np.float32)
        Image.fromarray(panel_texture(par, cfg["panel"])).save(f"{out}/parchment.jpg", quality=88)
        print("ok", name)


if __name__ == "__main__":
    main(sys.argv[1:] or list(THEMES))
