#!/usr/bin/env python3
r"""Genera los assets reales de Maria Jose y Samuel.

Entradas (PNG con fondo magenta):
  C:\Users\Samuel\Pictures\Screenshots\Sprites Sheets MJ.png
  C:\Users\Samuel\Pictures\Screenshots\Sprite Samuel.png

Salidas (public/assets/sprites/):
  mariajose_sheet.png   hoja uniforme de celdas (sin slash de ataque)
  samuel_npc.png        Samuel recortado, sin fondo
  player_assets.json    mapa frame -> textura que consume ProceduralAssets
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
MJ_SRC = r"C:\Users\Samuel\Pictures\Screenshots\Sprites Sheets MJ.png"
SAM_SRC = r"C:\Users\Samuel\Pictures\Screenshots\Sprite Samuel.png"
OUT_DIR = os.path.join(HERE, "public", "assets", "sprites")

# El juego dibuja a Maria Jose a 16x24 en el mundo, pero el canvas final se
# renderiza SPRITE_BAKE veces mas grande (ver src/config/Render.js). Hornear a
# 24*BAKE conserva el detalle del arte original al reducirse en pantalla.
BAKE = 4
TARGET_H = 24 * BAKE
COLS = 4
MIN_AREA = 400

# Recorte de los sprites de ataque (el efecto de slash vive a la derecha y
# el juego ya dibuja su propio "slash_effect"). Coordenadas en px de ORIGEN.
ATK_CUT = {(3, 0): 71, (3, 1): 74}
ATK_ERASE = {(3, 1): (0, 70, 69, 73)}  # filas, cols (locales)


def clean_alpha(path, trim_border=False):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    r = a[..., 0].astype(int)
    g = a[..., 1].astype(int)
    b = a[..., 2].astype(int)
    mag = (r > 150) & (g < 110) & (b > 150)
    if trim_border:
        h, w = mag.shape
        mag[:2, :] = True
        mag[h - 3:, :] = True
        mag[:, w - 12:] = True
    a[..., 3] = np.where(mag, 0, a[..., 3])
    return a


def components(a, min_area=MIN_AREA):
    mask = a[..., 3] > 0
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    out = []
    for i, sl in enumerate(objs):
        if sl is None:
            continue
        area = int((lab[sl] == i + 1).sum())
        if area < min_area:
            continue
        ys, xs = sl
        out.append(
            dict(x0=xs.start, x1=xs.stop - 1, y0=ys.start, y1=ys.stop - 1, area=area)
        )
    out.sort(key=lambda c: (c["y0"], c["x0"]))
    return out


def grid(comps):
    """Agrupa los componentes en filas por huecos verticales y ordena por x."""
    rows = []
    for c in comps:
        if rows and c["y0"] - max(x["y0"] for x in rows[-1]) < 30:
            rows[-1].append(c)
        else:
            rows.append([c])
    for r in rows:
        r.sort(key=lambda c: c["x0"])
    return rows


def extract(a, c, mirror=False, cut=None, erase=None):
    x0, y0, x1, y1 = c["x0"], c["y0"], c["x1"], c["y1"]
    if cut:
        x1 = min(x1, x0 + cut - 1)
    sub = a[y0 : y1 + 1, x0 : x1 + 1].copy()
    if erase:
        rs, re_, cs, ce = erase
        sub[rs : re_ + 1, cs : ce + 1, 3] = 0
    if mirror:
        sub = sub[:, ::-1].copy()
    m = sub[..., 3] > 0
    if not m.any():
        raise SystemExit(f"sprite vacio en {c}")
    cols = np.nonzero(m.any(axis=0))[0]
    rows = np.nonzero(m.any(axis=1))[0]
    return sub[rows.min() : rows.max() + 1, cols.min() : cols.max() + 1]


def sweep_magenta(arr):
    """Elimina el residuo magenta que genera el re-muestreo (ringing)."""
    r = arr[..., 0].astype(int)
    g = arr[..., 1].astype(int)
    b = arr[..., 2].astype(int)
    bad = (arr[..., 3] > 0) & (r > 140) & (g < 120) & (b > 140)
    arr[..., 3] = np.where(bad, 0, arr[..., 3])
    return arr


def feet_anchor(sub, band=8):
    m = sub[..., 3] > 0
    h = m.shape[0]
    b = m[max(0, h - band) :]
    cols = np.nonzero(b.any(axis=0))[0]
    return (float(cols.min()) + float(cols.max())) / 2.0


def resize_rgba(arr, nw, nh):
    """Redimensiona con alpha pre-multiplicado para evitar halos magenta."""
    a = arr.astype(np.float32)
    al = a[..., 3] / 255.0
    outs = [
        np.asarray(
            Image.fromarray(np.clip(a[..., c] * al, 0, 255).astype(np.uint8), "L")
            .resize((nw, nh), Image.LANCZOS)
        ).astype(np.float32)
        for c in range(3)
    ]
    na = np.asarray(
        Image.fromarray(arr[..., 3], "L").resize((nw, nh), Image.LANCZOS)
    ).astype(np.float32)
    safe = np.maximum(na, 1.0)
    rgb = np.stack([np.clip(o * 255.0 / safe, 0, 255) for o in outs], axis=-1)
    return np.dstack([rgb.astype(np.uint8), np.clip(na, 0, 255).astype(np.uint8)])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    report = []

    # ---------------- Maria Jose ----------------
    mj = clean_alpha(MJ_SRC, trim_border=True)
    comps = components(mj)
    rows = grid(comps)
    report.append(f"MJ componentes: {len(comps)} filas {[len(r) for r in rows]}")
    for ri, r in enumerate(rows):
        for ci, c in enumerate(r):
            report.append(
                f"  r{ri}c{ci} x{c['x0']}-{c['x1']} y{c['y0']}-{c['y1']} "
                f"({c['x1'] - c['x0'] + 1}x{c['y1'] - c['y0'] + 1}) area={c['area']}"
            )
    if len(rows) != 4 or [len(r) for r in rows] != [4, 4, 4, 2]:
        raise SystemExit("la hoja MJ no tiene la rejilla 4/4/4/2 esperada")

    # Orden de celdas en la hoja de salida (debe calzar con player_assets.json)
    plan = [
        ("down", (0, 2), False),
        ("down", (0, 3), False),
        ("up", (1, 1), False),
        ("up", (1, 2), False),
        ("up", (1, 3), False),
        ("left", (0, 0), False),
        ("left", (1, 0), False),
        ("left", (2, 0), False),
        ("right", (0, 1), False),
        ("right", (1, 0), True),
        ("right", (2, 0), True),
        ("attack", (3, 0), False),
        ("attack", (3, 1), False),
    ]

    sprites = []
    for _tag, (ri, ci), mirror in plan:
        c = rows[ri][ci]
        sub = extract(
            mj,
            c,
            mirror=mirror,
            cut=ATK_CUT.get((ri, ci)),
            erase=ATK_ERASE.get((ri, ci)),
        )
        sprites.append((sub, feet_anchor(sub), f"{_tag} r{ri}c{ci}{'M' if mirror else ''}"))

    max_h = max(s.shape[0] for s, _, _ in sprites)
    scale = TARGET_H / max_h
    max_ext = max(max(ax, s.shape[1] - 1 - ax) for s, ax, _ in sprites) * scale
    cell_w = max(16 * BAKE, int(np.ceil(2 * max_ext)))
    report.append(
        f"celdas: {len(sprites)}  maxH={max_h}  scale={scale:.4f}  "
        f"ext_max={2 * max_ext:.2f}px  cellW={cell_w}  cellH={TARGET_H}"
    )

    sheet_w, sheet_h = COLS * cell_w, ((len(sprites) + COLS - 1) // COLS) * TARGET_H
    sheet = np.zeros((sheet_h, sheet_w, 4), np.uint8)

    frames = {}
    dirs = {"down": [], "up": [], "left": [], "right": []}
    for idx, (sub, ax, tag) in enumerate(sprites):
        h, w = sub.shape[:2]
        nw = max(1, int(round(w * scale)))
        nh = max(1, int(round(h * scale)))
        rs = resize_rgba(sub, nw, nh)
        axn = ax * nw / w
        px = int(round(cell_w / 2.0 - axn))
        py = TARGET_H - nh
        if px < 0 or px + nw > cell_w:
            raise SystemExit(f"{tag} no cabe en la celda ({px}..{px + nw} de {cell_w})")
        gx = (idx % COLS) * cell_w
        gy = (idx // COLS) * TARGET_H
        cell = sheet[gy : gy + TARGET_H, gx : gx + cell_w]
        cell[py : py + nh, px : px + nw] = rs
        report.append(
            f"  celda {idx:2d} {tag:12s} src {w}x{h} -> {nw}x{nh} en ({px},{py})"
        )

    # Mapa de texturas que consume ProceduralAssets.buildPlayerFromSheet()
    def spec(i, flip=False):
        return {
            "sx": (i % COLS) * cell_w,
            "sy": (i // COLS) * TARGET_H,
            "sw": cell_w,
            "sh": TARGET_H,
            "flip": flip,
        }

    D = {"down": [0, 1], "up": [2, 3, 4], "left": [5, 6, 7], "right": [8, 9, 10]}

    for d, fl in D.items():
        walk = (fl * 4)[:4]  # 4 frames
        idle = fl[:2]
        for k in range(4):
            frames[f"player_{d}_walk_{k}"] = spec(walk[k])
        for k in range(2):
            frames[f"player_{d}_idle_{k}"] = spec(idle[k])
            frames[f"player_{d}_hurt_{k}"] = spec(idle[k])
        # El unico ataque real esta dibujado mirando a la derecha (cuerpo de
        # frente). Para 'up' se mantienen los frames de espalda para no girar
        # al personaje; el juego dibuja su propio slash_effect encima.
        if d == "up":
            attack = [spec(fl[0]), spec(fl[1]), spec(fl[0])]
        elif d == "left":
            attack = [spec(11, True), spec(12, True), spec(11, True)]
        else:
            attack = [spec(11), spec(12), spec(11)]
        for k in range(3):
            frames[f"player_{d}_attack_{k}"] = attack[k]

    sheet_path = os.path.join(OUT_DIR, "mariajose_sheet.png")
    Image.fromarray(sweep_magenta(sheet), "RGBA").save(sheet_path)
    report.append(f"-> {sheet_path} ({sheet_w}x{sheet_h})")

    # ---------------- Samuel ----------------
    sam = clean_alpha(SAM_SRC)
    sc = components(sam, min_area=100)
    if not sc:
        raise SystemExit("Samuel: sin contenido")
    c = max(sc, key=lambda x: x["area"])
    sub = extract(sam, c)
    sh, sw = sub.shape[:2]
    s = min(16 * BAKE / sw, TARGET_H / sh)
    nw, nh = max(1, int(round(sw * s))), max(1, int(round(sh * s)))
    rs = resize_rgba(sub, nw, nh)
    canvas = np.zeros((TARGET_H, 16 * BAKE, 4), np.uint8)
    px, py = (16 * BAKE - nw) // 2, TARGET_H - nh
    canvas[py : py + nh, px : px + nw] = rs
    sam_path = os.path.join(OUT_DIR, "samuel_npc.png")
    Image.fromarray(canvas, "RGBA").save(sam_path)
    report.append(
        f"Samuel bbox {sw}x{sh} -> {nw}x{nh} en ({px},{py}) -> {sam_path}"
    )

    manifest = {
        "cellWidth": cell_w,
        "cellHeight": TARGET_H,
        "frames": frames,
    }
    # Se embebe como modulo de ES (Vite lo inlina en el bundle) para no
    # depender de una peticion XHR que el portable no puede hacer en file://
    js_path = os.path.join(HERE, "src", "data", "PlayerSprites.js")
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write("// Generado por process_sprites.py. No editar a mano.\n")
        fh.write("export const PLAYER_SPRITES = ")
        fh.write(json.dumps(manifest, indent=2, ensure_ascii=False))
        fh.write(";\n")
    report.append(f"-> {js_path} ({len(frames)} texturas)")

    json_path = os.path.join(OUT_DIR, "player_assets.json")
    if os.path.exists(json_path):
        os.remove(json_path)

    print("\n".join(report))


if __name__ == "__main__":
    main()
