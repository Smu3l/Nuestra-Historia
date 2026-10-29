// Probe de verificación del arte definitivo de la Casa de María José.
//
// Comprueba que: (1) las 6 piezas se cargan y dibujan en sus anclas, (2) los
// placeholders de color quedan ocultos, (3) la física NO cambió (todos los
// cuerpos estáticos siguen midiendo igual, zonas de salida/interacción en
// su sitio) y (4) toma capturas de la casa para revisión visual.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'casa-art-out.txt');
const SHOTS = path.join(__dirname, 'casa-art-shots');
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
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  await withT(win.loadFile(index), 30000, 'load');
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
  await wait(1600);
  // Cerrar el diálogo de intro para ver la casa limpia (se captura antes).
  await shot('00-casa-con-dialogo');
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.dialogueSystem.isActive) s.dialogueSystem.hide(); return 1; })()`, 'hide-dialog');
  await wait(300);

  // --- 1. Texturas cargadas y filtradas ---
  const tex = await js(`(() => {
    const t = window.__game.textures;
    const keys = ['casa_cama','casa_escritorio','casa_mesa_fotos','casa_espejo','casa_puerta','casa_ventana'];
    return keys.map(k => {
      if (!t.exists(k)) return { k, ok: false, w: 0, h: 0, filter: -1 };
      const img = t.get(k).getSourceImage();
      return { k, ok: true, w: img.width, h: img.height, filter: t.get(k).source[0].scaleMode };
    });
  })()`, 'tex');
  tex.forEach((t) => {
    // Nota: en este build de Phaser el enum está invertido (FilterMode = { LINEAR: 0, NEAREST: 1 })
    // y setTextureFilter usa (filter === 0) ? gl.LINEAR : gl.NEAREST. LINEAR = 0.
    check('textura ' + t.k + ' cargada (' + t.w + 'x' + t.h + ') y filtro LINEAR', t.ok === true && t.w > 0 && t.filter === 0, JSON.stringify(t));
  });

  // --- 2. Piezas dibujadas en sus anclas ---
  const piezas = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    return s.children.list
      .filter(o => o.type === 'Image' && o.texture.key.startsWith('casa_'))
      .map(o => ({ key: o.texture.key, x: o.x, y: o.y, w: Math.round(o.displayWidth * 10) / 10, h: Math.round(o.displayHeight * 10) / 10, depth: o.depth }));
  })()`, 'piezas');
  log('piezas dibujadas: ' + JSON.stringify(piezas));
  check('7 piezas de arte dibujadas', piezas.length === 7, 'count=' + piezas.length);
  const esperado = [
    { key: 'casa_cama', x: 104, y: 88, h: 40 },
    { key: 'casa_escritorio', x: 56, y: 56, h: 34 },
    { key: 'casa_espejo', x: 216, y: 56, h: 34 },
    { key: 'casa_mesa_fotos', x: 232, y: 120, h: 32 },
    { key: 'casa_escritorio', x: 264, y: 88, h: 34 },
    { key: 'casa_ventana', x: 280, y: 152, h: 30 },
    { key: 'casa_puerta', x: 56, y: 160, h: 56 },
  ];
  esperado.forEach((e) => {
    const m = piezas.find(p => p.key === e.key && p.x === e.x && p.y === e.y);
    check(e.key + ' en (' + e.x + ',' + e.y + ') h=' + e.h, !!m && Math.abs(m.h - e.h) < 1, m ? 'h=' + m.h : 'no encontrada');
  });

  // --- 3. Placeholders ocultos (dibujo), cuerpos intactos ---
  // Nota: la celda (17,9) nunca tuvo tile de rejilla (tile_window no existe
  // como textura); solo se dibujaba la caja del objeto, ya oculta.
  const tiles = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const hid = ['104,88','56,56','216,56','232,120','264,88','56,152'];
    const find = (x, y) => s.mapTiles.find(t => t.x === x && t.y === y);
    return {
      total: s.mapTiles.length,
      ocultos: hid.map(k => { const [x, y] = k.split(',').map(Number); const t = find(x, y); return { k, visible: t ? t.visible : null, bodyW: t && t.body ? t.body.width : null, bodyH: t && t.body ? t.body.height : null }; }),
      ventanaTile: (() => { const t = find(280, 152); return t === undefined ? 'ninguno (como antes)' : 'HAY TILE'; })(),
      pared: (() => { const t = find(8, 8); return { visible: t.visible, w: t.body.width, h: t.body.height }; })(),
    };
  })()`, 'tiles');
  check('299 tiles de rejilla (sin cambios)', tiles.total === 299, 'total=' + tiles.total);
  check('celda ventana sin tile de rejilla (comportamiento previo)', tiles.ventanaTile === 'ninguno (como antes)', tiles.ventanaTile);
  tiles.ocultos.forEach((t) => {
    check('placeholder oculto en ' + t.k + ' (cuerpo ' + t.bodyW + 'x' + t.bodyH + ' intacto)', t.visible === false && t.bodyW === 16 && t.bodyH === 16, JSON.stringify(t));
  });
  check('pared visible con cuerpo 16x16', tiles.pared.visible === true && tiles.pared.w === 16, JSON.stringify(tiles.pared));

  // --- 4. Física general: cuerpos intactos, sin físicas nuevas del arte ---
  const fisica = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const conCuerpo = s.children.list.filter(o => o.texture && /^casa_/.test(o.texture.key || '') && o.body).length;
    const tilesMalos = s.mapTiles.filter(t => t.body && (t.body.width !== 16 || t.body.height !== 16)).length;
    const salidas = s.interactables.filter(o => o.interactType === 'exit').map(o => ({ x: o.x, y: o.y, w: o.width, h: o.height }));
    const zonas = s.interactables.filter(o => o.interactType === 'object').length;
    const coliders = (s.physics.world.colliders && (s.physics.world.colliders.total ?? (s.physics.world.colliders._data ? s.physics.world.colliders._data.length : -1))) ?? -1;
    return { conCuerpo, tilesMalos, salidas, zonas, coliders, jugador: { x: Math.round(s.player.x), y: Math.round(s.player.y) } };
  })()`, 'fisica');
  log('física: ' + JSON.stringify(fisica));
  check('las piezas del arte NO tienen cuerpo físico', fisica.conCuerpo === 0, 'conCuerpo=' + fisica.conCuerpo);
  check('todos los tiles conservan cuerpo 16x16', fisica.tilesMalos === 0, 'malos=' + fisica.tilesMalos);
  check('zona de salida en (56,168) 16x16 intacta', fisica.salidas.length === 1 && fisica.salidas[0].x === 56 && fisica.salidas[0].y === 168 && fisica.salidas[0].w === 16 && fisica.salidas[0].h === 16, JSON.stringify(fisica.salidas));
  check('7 zonas de interacción intactas', fisica.zonas === 7, 'zonas=' + fisica.zonas);

  // --- 5. Movimiento del jugador (sin nuevos bloqueos) ---
  const mov = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const before = { x: s.player.x, y: s.player.y };
    s.cursors.left.isDown = true;
    return new Promise(r => setTimeout(() => {
      s.cursors.left.isDown = false;
      r({ before, after: { x: Math.round(s.player.x), y: Math.round(s.player.y) } });
    }, 600));
  })()`, 'mov');
  check('el jugador camina a la izquierda sin bloqueos', mov.after.x < mov.before.x - 10, JSON.stringify(mov));

  // --- 6. Capturas ---
  await shot('01-casa-completa');
  await js(`(() => { window.__game.scene.getScene('GameScene').cameras.main.centerOn(56, 160); return 1; })()`, 'cam-door');
  await wait(250); await shot('02-puerta');
  await js(`(() => { window.__game.scene.getScene('GameScene').cameras.main.centerOn(232, 100); return 1; })()`, 'cam-desk');
  await wait(250); await shot('03-escritorio-mesa-espejo');
  await js(`(() => { window.__game.scene.getScene('GameScene').cameras.main.centerOn(104, 88); return 1; })()`, 'cam-bed');
  await wait(250); await shot('04-cama');

  log(failures === 0 ? 'RESULTADO: TODOS LOS TESTS PASARON' : 'RESULTADO: ' + failures + ' FALLOS');
  await wait(300);
  app.exit(failures === 0 ? 0 : 1);
})().catch(e => { log('ERROR FATAL: ' + e.message); app.exit(1); });
