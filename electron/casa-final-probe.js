// Probe de verificación: casa reorganizada + hitboxes base + Y-sorting.
// Puntos verificados:
// 1. Piezas de arte en nuevas coordenadas (estricto)
// 2. Placeholders ocultos, cuerpos resizados a base (no 16x16)
// 3. Y-sorting: depth = y para jugador, muebles, NPCs, enemigos
// 4. Jugador bloqueado por muebles (no atraviesa)
// 5. Jugador camina libre por el suelo
// 6. Zona de salida intacta
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'casa-final-out.txt');
const SHOTS = path.join(__dirname, 'casa-final-shots');
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
  await shot('00-casa-final');
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.dialogueSystem.isActive) s.dialogueSystem.hide(); return 1; })()`, 'hide-dialog');
  await wait(300);
  await shot('01-casa-limpia');

  // --- 1. Texturas cargadas ---
  const tex = await js(`(() => {
    const t = window.__game.textures;
    return ['casa_cama','casa_escritorio','casa_mesa_fotos','casa_espejo','casa_puerta','casa_ventana'].map(k => {
      const tx = t.get(k);
      return { k, ok: t.exists(k), w: tx ? tx.source[0].width : 0, h: tx ? tx.source[0].height : 0 };
    });
  })()`, 'tex');
  tex.forEach((t) => {
    check('textura ' + t.k + ' cargada (' + t.w + 'x' + t.h + ')', t.ok === true && t.w > 0);
  });

  // --- 2. Piezas de arte en nuevas coordenadas con escala aumentada ---
  const piezas = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    return s.children.list
      .filter(o => o.type === 'Image' && o.texture.key.startsWith('casa_'))
      .map(o => ({ key: o.texture.key, x: o.x, y: o.y, h: Math.round(o.displayHeight * 10) / 10, w: Math.round(o.displayWidth * 10) / 10, depth: o.depth }));
  })()`, 'piezas');
  log('piezas: ' + JSON.stringify(piezas));
  check('6 piezas de arte dibujadas (sin escritorio derecho duplicado)', piezas.length === 6, 'count=' + piezas.length);
  const esperado = [
    { key: 'casa_cama', x: 24, y: 24, h: 64 },
    { key: 'casa_mesa_fotos', x: 168, y: 24, h: 48 },
    { key: 'casa_ventana', x: 216, y: 24, h: 48 },
    { key: 'casa_espejo', x: 264, y: 24, h: 48 },
    { key: 'casa_escritorio', x: 296, y: 216, h: 48 },
    { key: 'casa_puerta', x: 24, y: 200, h: 64 },
  ];
  esperado.forEach((e) => {
    const m = piezas.find(p => p.key === e.key && p.x === e.x && p.y === e.y);
    check(e.key + ' en (' + e.x + ',' + e.y + ') h=' + e.h + ' (escala aumentada)', !!m && Math.abs(m.h - e.h) < 1, m ? JSON.stringify(m) : 'no encontrada');
  });

  // --- 3. Placeholders ocultos, cuerpos resizados a base ---
  const tiles = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const find = (x, y) => s.mapTiles.find(t => t.x === x && t.y === y);
    const centro = (tx, ty) => ({ x: tx * 16 + 8, y: ty * 16 + 8 });
    const checks = ['1,1','10,1','13,1','16,1','18,13','2,9','1,12'].map(k => {
      const [tx, ty] = k.split(',').map(Number); const c = centro(tx, ty); const t = find(c.x, c.y);
      return { k, visible: t ? t.visible : null, bodyW: t && t.body ? t.body.width : null, bodyH: t && t.body ? t.body.height : null };
    });
    return { total: s.mapTiles.length, ocultos: checks, pared: (() => { const t = find(8, 8); return { visible: t.visible, w: t.body.width, h: t.body.height }; })() };
  })()`, 'tiles');
  check('300 tiles de rejilla', tiles.total === 300, 'total=' + tiles.total);
  tiles.ocultos.forEach((t) => {
    check('placeholder oculto en ' + t.k + ' cuerpo resizado a base (no 16x16)', t.visible === false && (t.bodyW < 16 || t.bodyH < 16), JSON.stringify(t));
  });
  check('pared visible 16x16', tiles.pared.visible === true && tiles.pared.w === 16, JSON.stringify(tiles.pared));

  // --- 4. Hitboxes de base resizadas en todos los muebles ---
  const hit = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const find = (x, y) => s.mapTiles.find(t => t.x === x && t.y === y);
    return {
      cama: (() => { const t = find(24, 24); return t ? { w: t.body.width, h: t.body.height, ox: t.body.offset.x, oy: t.body.offset.y } : null; })(),
      mesa: (() => { const t = find(168, 24); return t ? { w: t.body.width, h: t.body.height } : null; })(),
      ventana: (() => { const t = find(216, 24); return t ? { w: t.body.width, h: t.body.height } : null; })(),
      espejo: (() => { const t = find(264, 24); return t ? { w: t.body.width, h: t.body.height } : null; })(),
      escritorio: (() => { const t = find(296, 216); return t ? { w: t.body.width, h: t.body.height } : null; })(),
      puerta: (() => { const t = find(24, 200); return t ? { w: t.body.width, h: t.body.height } : null; })(),
    };
  })()`, 'hitboxes');
  log('hitboxes: ' + JSON.stringify(hit));
  check('cama base 14x8', hit.cama && hit.cama.w === 14 && hit.cama.h === 8, JSON.stringify(hit.cama));
  check('mesa base 14x6', hit.mesa && hit.mesa.w === 14 && hit.mesa.h === 6, JSON.stringify(hit.mesa));
  check('ventana base 16x4', hit.ventana && hit.ventana.w === 16 && hit.ventana.h === 4, JSON.stringify(hit.ventana));
  check('espejo base 16x4', hit.espejo && hit.espejo.w === 16 && hit.espejo.h === 4, JSON.stringify(hit.espejo));
  check('escritorio base 14x6', hit.escritorio && hit.escritorio.w === 14 && hit.escritorio.h === 6, JSON.stringify(hit.escritorio));
  check('puerta base 12x10', hit.puerta && hit.puerta.w === 12 && hit.puerta.h === 10, JSON.stringify(hit.puerta));

  // --- 5. Y-Sorting activo: profundidad basada en Y ---
  const ysort = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const ySortables = s.ySortables || [];
    const infos = ySortables.map(o => ({ key: o.texture ? o.texture.key : 'player', x: Math.round(o.x), y: Math.round(o.y), depth: Math.round(o.depth) }));
    return { count: ySortables.length, infos };
  })()`, 'ysort');
  log('ySortables: ' + JSON.stringify(ysort));
  check('ySortables tiene 6+ elementos (jugador + 6 piezas + NPC + enemigos)', ysort.count >= 8, 'count=' + ysort.count);
  // Verificar que el depth de las piezas coincide con su Y (Y-sorting activo)
  const piezaInfos = ysort.infos.filter(i => i.key.startsWith('casa_'));
  const todosDepthIgualY = piezaInfos.every(i => Math.abs(i.depth - i.y) <= 1);
  check('Y-sorting: depth de piezas == su coordenada Y', todosDepthIgualY, JSON.stringify(piezaInfos));

  // --- 9. Zona de salida intacta ---
  const salida = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const z = s.interactables.find(o => o.interactType === 'exit');
    return z ? { x: z.x, y: z.y, w: z.width, h: z.height, target: z.targetMap } : null;
  })()`, 'salida');
  check('zona de salida en (24,200) 16x16 hacia sendero_distancia', salida && salida.x === 24 && salida.y === 200 && salida.w === 16 && salida.h === 16 && salida.target === 'sendero_distancia', JSON.stringify(salida));

  // --- 7. Jugador bloqueado por muebles (no atraviesa) ---
  const bloqueo = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(24, 40);   // debajo de la cama (tile 1,1 -> mundo y=24, collider y=24-32)
    s.player.body.setVelocity(0, -100);  // mover hacia arriba
    return new Promise(r => setTimeout(() => {
      s.player.body.setVelocity(0, 0);
      r({ y: Math.round(s.player.y), x: Math.round(s.player.x) });
    }, 500));
  })()`, 'bloqueo');
  check('jugador bloqueado por cama al intentar subir (se queda en y>=32)', bloqueo.y >= 32, JSON.stringify(bloqueo));

  // --- 8. Jugador camina libre por el suelo ---
  const libre = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(168, 168); // centro de la habitación
    s.cursors.left.isDown = true;
    return new Promise(r => setTimeout(() => {
      s.cursors.left.isDown = false;
      s.player.body.setVelocity(0, 0);
      r({ x: Math.round(s.player.x) });
    }, 600));
  })()`, 'libre');
  check('jugador camina a la izquierda por el suelo', libre.x < 168 - 10, JSON.stringify(libre));

  // --- 10. Solo 1 escritorio (derecho eliminado) ---
  const escritorios = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    return s.children.list.filter(o => o.type === 'Image' && o.texture.key === 'casa_escritorio').length;
  })()`, 'escritorios');
  check('solo 1 escritorio (derecho eliminado)', escritorios === 1, 'count=' + escritorios);

  log(failures === 0 ? 'RESULTADO: TODOS LOS TESTS PASARON' : 'RESULTADO: ' + failures + ' FALLOS');
  await wait(300);
  app.exit(failures === 0 ? 0 : 1);
})().catch(e => { log('ERROR FATAL: ' + e.message); app.exit(1); });
