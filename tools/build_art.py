"""
Erzeugt die Grafik-Sets der Themes aus dem Gold-Grundsatz (assets/parchment)
(Arkanum und Nachtwache werden aus dem Blutmond-Satz assets/crimson abgeleitet).

Aufruf (im Modulordner):  python3 tools/build_art.py
Benötigt: pillow, numpy
"""
import colorsys, json, pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "crimson"
FRAMES = ["frame-panel", "frame-window", "crest-nameplate", "portrait-arch", "medallion", "nameplate",
          "ability-card", "lozenge", "ability-score-box", "mod-badge", "shield-ac", "badge-hex", "badge-oct",
          "ribbon", "tab-active", "tab-divider", "inspiration-off", "inspiration-on", "circle-slot", "search-bar"]

# --------------------------------------------------------------------------- Hilfsfunktionen

def load(name):
    return np.array(Image.open(SRC / f"{name}.png").convert("RGBA")).astype(np.float32)

def save_png(arr, folder, name):
    folder.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(folder / f"{name}.png", optimize=True)

def hsv(arr):
    rgb = arr[..., :3] / 255.0
    mx = rgb.max(-1); mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return rgb, mx, sat

def darken_parchment(arr, base):
    """Helle Pergament-Flächen durch eine dunkle Fläche ersetzen, Struktur bleibt erhalten."""
    rgb, val, sat = hsv(arr)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    m = np.clip((0.42 - sat) / 0.16, 0, 1) * np.clip((lum - 0.55) / 0.15, 0, 1)
    texture = (lum / 0.85)[..., None]
    dark = np.array(base, np.float32)[None, None, :] * (0.75 + 0.5 * (texture - 1) + 0.25)
    out = arr.copy()
    out[..., :3] = arr[..., :3] * (1 - m[..., None]) + dark * m[..., None]
    return out

def silverize(arr, tint=(0.86, 0.93, 1.06)):
    """Gold in Silber/Stahl umfärben."""
    rgb, val, sat = hsv(arr)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    m = np.clip((sat - 0.18) / 0.2, 0, 1)
    silver = (np.clip(lum * 1.12, 0, 1)[..., None] * np.array(tint)[None, None, :]) * 255
    out = arr.copy()
    out[..., :3] = arr[..., :3] * (1 - m[..., None]) + silver * m[..., None]
    return out

def shift_glow(arr, hue, inset, sat_boost=1.0):
    """Leuchten im Inneren (Rand 'inset' bleibt) auf einen anderen Farbton drehen."""
    out = arr.copy()
    h, w = arr.shape[:2]
    y0, x0 = int(h * inset), int(w * inset)
    region = out[y0:h - y0, x0:w - x0]
    flat = region[..., :3].reshape(-1, 3) / 255.0
    res = np.empty_like(flat)
    for i, (r, g, b) in enumerate(flat):
        hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
        if ss > 0.25:
            hh = hue
            ss = min(1, ss * sat_boost)
        res[i] = colorsys.hsv_to_rgb(hh, ss, vv)
    region[..., :3] = res.reshape(region.shape[:2] + (3,)) * 255
    return out

def noise_texture(size, base, contrast, seed, beta=2.2, streak=None):
    """Kachelbare Rauschtextur (Stein/Schiefer)."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((size, size))
    fy = np.fft.fftfreq(size)[:, None]; fx = np.fft.fftfreq(size)[None, :]
    if streak:
        fx = fx * streak
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    n = np.real(np.fft.ifft2(np.fft.fft2(white) / f ** (beta / 2)))
    n = (n - n.mean()) / n.std()
    fine = rng.standard_normal((size, size)) * 0.25
    v = n + fine
    img = np.array(base, np.float32)[None, None, :] * (1 + contrast * v[..., None])
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

# --------------------------------------------------------------------------- Sets

def retint_dark(arr, target):
    """Dunkle, nicht-goldene Flächen (aus dem Blutmond-Satz) auf eine andere Grundfarbe umfärben."""
    rgb, val, sat = hsv(arr)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    gold = np.clip((sat - 0.25) / 0.15, 0, 1) * np.clip((lum - 0.17) / 0.1, 0, 1)
    ref = np.array([34, 24, 22], np.float32) @ np.array([0.299, 0.587, 0.114]) / 255
    tinted = np.array(target, np.float32)[None, None, :] * (lum / ref)[..., None]
    out = arr.copy()
    keep = gold[..., None]
    out[..., :3] = arr[..., :3] * keep + tinted * (1 - keep)
    return out

# Grundlage für die dunklen Sets ist der Blutmond-Satz (assets/crimson, dunkle Innenflächen, Goldrahmen).
DERIVED = {
    "arcane": dict(target=(20, 28, 50), silver=False, glow_hue=0.6,
                   bg=dict(base=(16, 22, 38), contrast=0.4, seed=21, beta=2.4),
                   panel=dict(base=(19, 26, 44), contrast=0.22, seed=22, beta=2.0)),
    "nightwatch": dict(target=(28, 34, 42), silver=True, glow_hue=0.52,
                       bg=dict(base=(20, 25, 31), contrast=0.35, seed=31, beta=2.4),
                       panel=dict(base=(27, 33, 41), contrast=0.2, seed=32, beta=2.0)),
}
GLOW = {"tab-active": 0.07, "inspiration-on": 0.22}
BASE = ROOT / "assets" / "crimson"

def build(key, cfg):
    out = ROOT / "assets" / key
    for name in FRAMES:
        a = np.array(Image.open(BASE / f"{name}.png").convert("RGBA")).astype(np.float32)
        a = retint_dark(a, cfg["target"])
        if cfg["silver"]:
            a = silverize(a)
        if name in GLOW:
            a = shift_glow(a, cfg["glow_hue"], GLOW[name], 1.1)
        save_png(a, out, name)
    noise_texture(512, **cfg["bg"]).convert("RGB").save(out / "wood-dark.jpg", quality=88)
    noise_texture(512, **cfg["panel"]).convert("RGB").save(out / "parchment.jpg", quality=88)

if __name__ == "__main__":
    for key, cfg in DERIVED.items():
        build(key, cfg)
        print("Set erzeugt:", key)
