// Probe de verificación: reubicación de muebles (casa) + colisiones de base.
// Comprueba: (1) las 6 piezas de arte en sus nuevas coordenadas, (2) los
// placeholders ocultos con cuerpos 16x16 intactos, (3) los muebles tienen
// cuerpo de colisión resizado solo en la base, (4) paredes intactas,
// (5) zona de salida intacta, (6) el jugador NO atraviesa los muebles.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'casa-physics-out.txt');
const SHOTS = path.join(__dirname, 'casa-physics-shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);

let win;
async function js(code, label, timeout) {
  return withT(win.webContents.executeJavaScript(code, true), timeout || 10000, label);
}
async function shot(name) {
  try {
    fs.writeFileSync(path.join(SHOTS, name + '.png'), await win.webContents.capturePage().then(i => i.toPNG()));
  } catch (e) { log('  shot FAIL ' + name + ': ' + e.message); }
}

let failures = 0;
function check(label, cond, detail) {
  if (cond) log('PASS  ' + label + (detail ? '  [' + detail + ']' : ''));
  else { failures++; log('FAIL  ' + label + (detail ? '  [' + detail + ']' : '')); }
}

async function boot() {
  win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -4000, y: 0,
    frame: false, backgroundColor: '#0a0a1a',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  await withT(win.loadFile(path.join(__dirname, '..', 'dist', 'index.html')), 30000, 'load');
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await wait(400);
    try {
      if (await js(`!!(window.__game && window.__game.scene.getScenes(true).some(s => s.scene.key === 'MenuScene'))`, 'poll')) { ok = true; break; }
    } catch (e) { /* retry */ }
  }
  log('boot=' + ok);
  return ok;
}

(async () => {
  fs.writeFileSync(OUT, '');
  await app.whenReady();
  if (!(await boot())) { app.exit(1); return; }

  await js(`window.__game.scene.start('GameScene', { map: 'casa' }); 0`, 'start');
  await wait(1500);
  await shot('00-casa-layout');
  // Cerrar diálogo de intro para ver la casa limpia.
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.dialogueSystem.isActive) s.dialogueSystem.hide(); return 1; })()`, 'hide-dialog');
  await wait(300);
  await shot('01-casa-limpia');

  // --- 1. Texturas cargadas + filtro LINEAR (en este build LINEAR=0) ---
  const tex = await js(`(() => {
    const t = window.__game.textures;
    return ['casa_cama','casa_escritorio','casa_mesa_fotos','casa_espejo','casa_puerta','casa_ventana'].map(k => {
      const tx = t.get(k);
      return { k, ok: t.exists(k), w: tx ? tx.source[0].width : 0, h: tx ? tx.source[0].height : 0, filter: tx ? tx.source[0].scaleMode : -1 };
    });
  })()`, 'tex');
  tex.forEach((t) => {
    check('textura ' + t.k + ' cargada (' + t.w + 'x' + t.h + ') filtro LINEAR', t.ok === true && t.w > 0 && t.filter === 0, JSON.stringify(t));
  });

  // --- 2. Piezas de arte en nuevas coordenadas ---
  const piezas = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    return s.children.list
      .filter(o => o.type === 'Image' && o.texture.key.startsWith('casa_'))
      .map(o => ({ key: o.texture.key, x: o.x, y: o.y, h: Math.round(o.displayHeight * 10) / 10, depth: o.depth }));
  })()`, 'piezas');
  log('piezas: ' + JSON.stringify(piezas));
  check('7 piezas de arte dibujadas', piezas.length === 7, 'count=' + piezas.length);
  const esperado = [
    { key: 'casa_cama', x: 40, y: 40, h: 40 },
    { key: 'casa_espejo', x: 280, y: 40, h: 34 },
    { key: 'casa_escritorio', x: 24, y: 120, h: 34 },
    { key: 'casa_mesa_fotos', x: 168, y: 120, h: 32 },
    { key: 'casa_ventana', x: 296, y: 120, h: 30 },
    { key: 'casa_escritorio', x: 296, y: 152, h: 34 },
    { key: 'casa_puerta', x: 24, y: 200, h: 48 },
  ];
  esperado.forEach((e) => {
    const m = piezas.find(p => p.key === e.key && p.x === e.x && p.y === e.y);
    check(e.key + ' en (' + e.x + ',' + e.y + ') h=' + e.h + ' depth>jugador', !!m && Math.abs(m.h - e.h) < 1 && m.depth > 10, m ? JSON.stringify(m) : 'no encontrada');
  });

  // --- 3. Placeholders ocultos, cuerpos 16x16 intactos, paredes intactas ---
  const tiles = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const find = (x, y) => s.mapTiles.find(t => t.x === x && t.y === y);
    const centro = (tx, ty) => ({ x: tx * 16 + 8, y: ty * 16 + 8 });
    const checks = ['2,2','17,2','1,7','10,7','18,7','18,9','2,9','1,12'].map(k => {
      const [tx, ty] = k.split(',').map(Number); const c = centro(tx, ty); const t = find(c.x, c.y);
      return { k, visible: t ? t.visible : null, bodyW: t && t.body ? t.body.width : null, bodyH: t && t.body ? t.body.height : null };
    });
    return { total: s.mapTiles.length, ocultos: checks, pared: (() => { const t = find(8, 8); return { visible: t.visible, w: t.body.width, h: t.body.height }; })() };
  })()`, 'tiles');
  check('300 tiles de rejilla (sin cambios: ventana incluida)', tiles.total === 300, 'total=' + tiles.total);
  tiles.ocultos.forEach((t) => {
    check('placeholder oculto en ' + t.k + ' cuerpo resizado a base (no 16x16)', t.visible === false && (t.bodyW < 16 || t.bodyH < 16), JSON.stringify(t));
  });
  check('pared visible 16x16', tiles.pared.visible === true && tiles.pared.w === 16, JSON.stringify(tiles.pared));

  // --- 4. Hitboxes de base resizadas en muebles ---
  const hit = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const find = (x, y) => s.mapTiles.find(t => t.x === x && t.y === y);
    return {
      cama: (() => { const t = find(40, 40); return t ? { w: t.body.width, h: t.body.height, ox: t.body.offset.x, oy: t.body.offset.y } : null; })(),
      espejo: (() => { const t = find(280, 40); return t ? { w: t.body.width, h: t.body.height, ox: t.body.offset.x, oy: t.body.offset.y } : null; })(),
      escritorioIzq: (() => { const t = find(24, 120); return t ? { w: t.body.width, h: t.body.height } : null; })(),
      puerta: (() => { const t = find(24, 200); return t ? { w: t.body.width, h: t.body.height } : null; })(),
    };
  })()`, 'hitboxes');
  log('hitboxes: ' + JSON.stringify(hit));
  check('cama base 14x6 (-7,0)', hit.cama && hit.cama.w === 14 && hit.cama.h === 6 && hit.cama.ox === -7 && hit.cama.oy === 0, JSON.stringify(hit.cama));
  check('espejo base 16x4 (-8,0)', hit.espejo && hit.espejo.w === 16 && hit.espejo.h === 4 && hit.espejo.ox === -8 && hit.espejo.oy === 0, JSON.stringify(hit.espejo));
  check('escritorio base 14x8', hit.escritorioIzq && hit.escritorioIzq.w === 14 && hit.escritorioIzq.h === 8, JSON.stringify(hit.escritorioIzq));
  check('puerta base 10x10', hit.puerta && hit.puerta.w === 10 && hit.puerta.h === 10, JSON.stringify(hit.puerta));

  // --- 5. Zona de salida intacta (1,12) y solapable ---
  const salida = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const z = s.interactables.find(o => o.interactType === 'exit');
    return z ? { x: z.x, y: z.y, w: z.width, h: z.height, target: z.targetMap } : null;
  })()`, 'salida');
  check('zona de salida en (24,200) 16x16 hacia sendero_distancia', salida && salida.x === 24 && salida.y === 200 && salida.w === 16 && salida.h === 16 && salida.target === 'sendero_distancia', JSON.stringify(salida));

  // --- 6. El jugador NO atraviesa los muebles ---
  const bloqueo = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(40, 56);   // tile (2,3), justo al sur de la cama (2,2)
    s.cursors.up.isDown = true;
    return new Promise(r => setTimeout(() => {
      s.cursors.up.isDown = false;
      s.player.body.setVelocity(0, 0);
      r({ y: Math.round(s.player.y), x: Math.round(s.player.x) });
    }, 700));
  })()`, 'bloqueo');
  check('jugador bloqueado por la cama (se queda en tile (2,3) o colindante)', bloqueo.y >= 34, JSON.stringify(bloqueo));

  // --- 7. El jugador sigue caminando libremente por el suelo ---
  const libre = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(168, 168); // centro de la habitacion
    s.cursors.left.isDown = true;
    return new Promise(r => setTimeout(() => {
      s.cursors.left.isDown = false;
      s.player.body.setVelocity(0, 0);
      r({ x: Math.round(s.player.x) });
    }, 600));
  })()`, 'libre');
  check('jugador camina a la izquierda por el suelo', libre.x < 168 - 10, JSON.stringify(libre));

  log(failures === 0 ? 'RESULTADO: TODOS LOS TESTS PASARON' : 'RESULTADO: ' + failures + ' FALLOS');
  await wait(300);
  app.exit(failures === 0 ? 0 : 1);
})().catch(e => { log('ERROR FATAL: ' + e.message); app.exit(1); });
