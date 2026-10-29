//! Procesa los assets definitivos de la Casa de María José.
//!
//! - Lee los PNG originales (fondo blanco puro) de Pictures/Assets Casa.
//! - Quita el fondo blanco con un flood-fill desde los bordes (no toca el
//!   diseño, mismo criterio que tools/npc_process.py: claros y poco
//!   saturados) y aplica un leve anti-halo en el contorno.
//! - Recorta al bounding box real del arte (sin margen blanco).
//! - Guarda los PNG con alfa en public/assets/casa/ (sin recomprimir:
//!   se conserva la resolución original).
//!
//! Uso: node tools/casa_process.cjs
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const SRC = 'C:/Users/Samuel Troncoso/Pictures/Assets Casa';
const DST = 'C:/Users/Samuel Troncoso/Documents/Nuestra-Historia/public/assets/casa';

const T = 235; // canal minimo para considerar un pixel "blanco de fondo"
const S = 22;  // saturacion maxima (max - min) para el mismo criterio

const ITEMS = [
  ['Asset Cama.png', 'cama.png'],
  ['Asset Escritorio.png', 'escritorio.png'],
  ['Asset Mesa con fotos.png', 'mesa_fotos.png'],
  ['Asset espejo.png', 'espejo.png'],
  ['Asset puerta de salida.png', 'puerta.png'],
  ['Asset Ventana.png', 'ventana.png'],
];

function removeWhiteAndCrop(data, w, h) {
  const isCand = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    if (mn >= T && mx - mn <= S) isCand[i] = 1;
  }

  // Flood-fill de candidatos conectados al borde.
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (isCand[i] && !bg[i]) { bg[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Anti-halo: el anillo de 1px alrededor del fondo que siga siendo claro
  // baja su alfa proporcionalmente para que no quede fleco blanco.
  const ring = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      const near = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) ||
        (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
      if (near) ring[i] = 1;
    }
  }
  for (let i = 0; i < w * h; i++) {
    if (!ring[i]) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const mn = Math.min(r, g, b);
    const ratio = Math.min(1, Math.max(0, (255 - mn) / (255 - T)));
    const edgeAlpha = Math.round(ratio * 255);
    if (data[i * 4 + 3] > edgeAlpha) data[i * 4 + 3] = edgeAlpha;
  }
  for (let i = 0; i < w * h; i++) if (bg[i]) data[i * 4 + 3] = 0;

  // Bounding box del contenido real.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('la imagen quedo totalmente vacia');
  return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

(async () => {
  fs.mkdirSync(DST, { recursive: true });
  for (const [srcName, dstName] of ITEMS) {
    const img = await loadImage(path.join(SRC, srcName));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, img.width, img.height);

    const box = removeWhiteAndCrop(data, img.width, img.height);

    const out = createCanvas(box.w, box.h);
    const octx = out.getContext('2d');
    const slice = octx.createImageData(box.w, box.h);
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const s = ((box.minY + y) * img.width + box.minX + x) * 4;
        const d = (y * box.w + x) * 4;
        slice.data[d] = data[s];
        slice.data[d + 1] = data[s + 1];
        slice.data[d + 2] = data[s + 2];
        slice.data[d + 3] = data[s + 3];
      }
    }
    octx.putImageData(slice, 0, 0);

    fs.writeFileSync(path.join(DST, dstName), out.toBuffer('image/png'));
    console.log(`${srcName} -> ${dstName}  ${img.width}x${img.height} (original) -> ${box.w}x${box.h} (recortado)`);
  }
  console.log('OK ->', DST);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
