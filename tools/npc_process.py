"""Procesa los sprites estaticos de los NPCs.

- Lee los PNG originales (fondo blanco puro) de la carpeta de capturas.
- Quita el fondo blanco con un flood-fill desde los bordes (no toca los
  pixeles del personaje) y aplica un leve anti-halo en el contorno.
- Guarda los PNG con alfa en public/assets/sprites/npcs/ (sin re-comprimir
  ni reducir: se conserva la resolucion original).
- Genera src/data/NpcSprites.js con el bounding box real de cada personaje
  para escalar/anclar los pies correctamente.

Uso:
    python tools/npc_process.py
"""

import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = r"C:\Users\Samuel\Pictures\Screenshots\Sprites NPC'S"
DST = r"C:\Users\Samuel\Documents\Nuestra-Historia\public\assets\sprites\npcs"
OUT_JS = r"C:\Users\Samuel\Documents\Nuestra-Historia\src\data\NpcSprites.js"

T = 235   # canal minimo para considerar un pixel "blanco de fondo"
S = 22    # saturacion maxima (max - min) para el mismo criterio

# (archivo origen, key de textura, nombre del NPC en Maps.js, altura en mundo)
ITEMS = [
    ("Sprite Milan.png", "npc_milan", "Milan", 20),
    ("Sprite Caminante.png", "npc_caminante", "Caminante", 28),
    ("Sprite Caminante Solitario.png", "npc_caminante_solitario", "Caminante Solitario", 28),
    ("Sprite Alma Perdida.png", "npc_alma_perdida", "Alma Perdida", 30),
    ("Sprite Espiritu.png", "npc_espiritu", "Espíritu", 27),
    ("Sprite Ermitaño.png", "npc_ermitano", "Ermitaño", 30),
    ("Sprite Guardian.png", "npc_guardian", "Guardián", 30),
]


def remove_white(im):
    rgba = np.array(im)
    rgb = rgba[..., :3].astype(np.int16)
    mn = rgb.min(axis=2)
    mx = rgb.max(axis=2)
    sat = mx - mn

    # Pixels candidatos a fondo: muy claros y poco saturados.
    cand = (mn >= T) & (sat <= S)

    # Solo se quita el fondo conectado con el borde de la imagen (evita
    # agujeros en zonas claras del personaje que no tocan el exterior).
    labels, _ = ndimage.label(cand)
    border = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border.discard(0)
    bg = np.isin(labels, list(border)) if border else np.zeros_like(cand)

    out = rgba.copy()
    out[bg, 3] = 0

    # Anti-halo: el anillo de 1px alrededor del fondo que siga siendo claro
    # baja su alfa de forma proporcional para que no quede fleco blanco.
    dil = ndimage.binary_dilation(bg, iterations=1)
    ring = dil & (~bg)
    ratio = np.clip((255 - mn) / (255 - T), 0.0, 1.0)
    edge_alpha = (ratio * 255).astype(np.uint8)
    out[ring, 3] = np.minimum(out[ring, 3], edge_alpha[ring])
    return out


def main():
    os.makedirs(DST, exist_ok=True)

    lines = [
        "// Generado por tools/npc_process.py. No editar a mano.",
        "// Sprites estaticos de los NPCs (fondo blanco removido, PNG sin perdida).",
        "",
        "// key de textura -> archivo (usado por PreloadScene)",
        "export const NPC_TEXTURE_FILES = {",
    ]
    render = []

    for fname, key, npc_name, height in ITEMS:
        im = Image.open(os.path.join(SRC, fname)).convert("RGBA")
        out = remove_white(im)
        dest_name = f"{key}.png"
        Image.fromarray(out, "RGBA").save(os.path.join(DST, dest_name))

        w, h = im.size
        ys, xs = np.where(out[..., 3] > 0)
        cx = (int(xs.min()) + int(xs.max()) + 1) / 2 / w
        cy = (int(ys.max()) + 1) / h
        content_h = int(ys.max()) - int(ys.min()) + 1

        lines.append(f"  {key}: 'assets/sprites/npcs/{dest_name}',")
        render.append((npc_name, key, round(cx, 4), round(cy, 4), height, content_h))

    lines += [
        "};",
        "",
        "// NPC.name (en Maps.js) -> datos de render del sprite estatico.",
        "// originX/originY anclan el sprite a los pies del personaje; contentH es la",
        "// altura real del personaje en pixeles; height la altura deseada en mundo.",
        "export const NPC_BY_NAME = {",
    ]
    for npc_name, key, cx, cy, height, content_h in render:
        lines.append(
            f"  '{npc_name}': {{ key: '{key}', originX: {cx}, originY: {cy}, "
            f"contentH: {content_h}, height: {height} }},"
        )
    lines += ["};", ""]

    with open(OUT_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))

    print("OK ->", DST)
    print("OK ->", OUT_JS)


if __name__ == "__main__":
    main()
