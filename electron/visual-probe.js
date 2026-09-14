const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'visual-out.txt');
const SHOTS = path.join(__dirname, 'visual-shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);

let win;
async function js(code, label, timeout) {
  return withT(win.webContents.executeJavaScript(code), timeout || 8000, label);
}

const RES = [
  [1920, 1080],
  [1366, 768],
  [2560, 1440],
  [1600, 900],
  [1280, 800],
];

async function boot() {
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await wait(400);
    try {
      const st = await js(`(() => {
        const g = window.__game; if (!g) return 'no';
        const cv = document.querySelector('canvas'); if (!cv) return 'novc';
        return g.scene.getScenes(true).some(s => s.scene.key === 'MenuScene') ? 'menu' : 'no';
      })()`, 'poll');
      if (st === 'menu') { ok = true; break; }
    } catch (e) { /* retry */ }
  }
  log('boot menu=' + ok);
  return ok;
}

async function goMap(mapId) {
  await js(`window.__game.scene.start('GameScene', { map: '${mapId}' }); 0`, 'go-' + mapId);
  await wait(1600);
  await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    if (s.isDialogActive && s.dialogueSystem && s.dialogueSystem.hide) s.dialogueSystem.hide();
    if (s.player) { s.player.invincible = true; s.player.hp = s.player.maxHP; }
    return 1;
  })()`, 'arm-' + mapId);
  await wait(400);
}

async function metrics(mapId) {
  return js(`(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    const cam = s ? s.cameras.main : null;
    const d = s ? s.currentMapData : null;
    const zoom = cam ? cam.zoom : 1;
    const p = s ? s.player : null;

    // background-color of the app chrome (body). Detect filled bands on the
    // backing 640x360 canvas that match the pure page background #0a0a1a.
    let cols = [0, 0], rows = [0, 0];
    const cs = window.getComputedStyle(c);
    const cssInfo = { pos: cs.position, left: cs.left, top: cs.top, width: cs.width, height: cs.height, margin: cs.margin, transform: cs.transform, transformOrigin: cs.transformOrigin };
    try {
      const copy = document.createElement('canvas');
      copy.width = c.width; copy.height = c.height;
      const ctx = copy.getContext('2d');
      ctx.drawImage(c, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const W = c.width, H = c.height;
      const isBg = (x, y) => {
        const i = (y * W + x) * 4;
        return data[i] === 10 && data[i + 1] === 10 && data[i + 2] === 26 && data[i + 3] === 255;
      };
      for (let x = 0; x < W; x++) { let all = true; for (let y = 0; y < H; y += 2) { if (!isBg(x, y)) { all = false; break; } } if (all) cols[0]++; else break; }
      for (let x = W - 1; x >= 0; x--) { let all = true; for (let y = 0; y < H; y += 2) { if (!isBg(x, y)) { all = false; break; } } if (all) cols[1]++; else break; }
      for (let y = 0; y < H; y++) { let all = true; for (let x = 0; x < W; x += 2) { if (!isBg(x, y)) { all = false; break; } } if (all) rows[0]++; else break; }
      for (let y = H - 1; y >= 0; y--) { let all = true; for (let x = 0; x < W; x += 2) { if (!isBg(x, y)) { all = false; break; } } if (all) rows[1]++; else break; }
    } catch (e) { /* webgl copy may need preserveDrawingBuffer */ }

    const playerInView = p && cam && p.x >= cam.scrollX && p.x <= cam.scrollX + 640 / zoom && p.y >= cam.scrollY && p.y <= cam.scrollY + 360 / zoom;
    const mapW = d ? d.width * 16 : 0, mapH = d ? d.height * 16 : 0;
    return {
      map: s ? s.currentMapId : null,
      win: [window.innerWidth, window.innerHeight],
      css: [Math.round(r.width), Math.round(r.height)],
      pos: [Math.round(r.left), Math.round(r.top)],
      fills: Math.abs(r.width - window.innerWidth) < 3 && Math.abs(r.height - window.innerHeight) < 3,
      centered: Math.abs(r.left - (window.innerWidth - r.width) / 2) < 3 && Math.abs(r.top - (window.innerHeight - r.height) / 2) < 3,
      backing: [c.width, c.height],
      zoom, scroll: cam ? [Math.round(cam.scrollX), Math.round(cam.scrollY)] : null,
      view: [640 / zoom, 360 / zoom],
      mapPx: [mapW, mapH],
      pan: mapW - 640 / zoom > 30 || mapH - 360 / zoom > 30,
      player: p ? [Math.round(p.x), Math.round(p.y)] : null,
      playerInView,
      bgBandCols: cols, bgBandRows: rows,
      cssInfo,
    };
  })()`, 'm-' + mapId);
}

async function runWindow(w, h) {
  log('--- res ' + w + 'x' + h + ' ---');
  win = new BrowserWindow({
    width: w, height: h, show: true, x: -4000, y: 0,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const index = path.join(__dirname, '..', 'dist', 'index.html');
  await withT(win.loadFile(index), 30000, 'load');
  await js(`window.__errs=[]; window.addEventListener('error', e => window.__errs.push(String(e.message))); 1`, 'errs');
  if (!(await boot())) { log('FATAL no menu'); await win.destroy(); return; }

  // small room
  await goMap('casa');
  let m = await metrics('casa');
  log('casa ' + JSON.stringify(m));
  fs.writeFileSync(path.join(SHOTS, `${w}x${h}-casa.png`), await win.webContents.capturePage().then(i => i.toPNG()));

  // big exterior
  await goMap('sendero_distancia');
  m = await metrics('sendero');
  log('sendero ' + JSON.stringify(m));
  fs.writeFileSync(path.join(SHOTS, `${w}x${h}-sendero.png`), await win.webContents.capturePage().then(i => i.toPNG()));

  // camera follow behavior on exterior (walk up -> camera moves)
  const camBefore = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); s.player.body.reset(40*16+8, 40*16+12); s.player.x = 40*16+8; s.player.y = 40*16+12; return [s.cameras.main.scrollX, s.cameras.main.scrollY]; })()`, 'walkTp');
  await wait(500);
  const camAfterTp = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); return [s.cameras.main.scrollX, s.cameras.main.scrollY]; })()`, 'camTp');
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'W' });
  await wait(800);
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'W' });
  await wait(150);
  const camAfter = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); return { p: [Math.round(s.player.x), Math.round(s.player.y)], scroll: [Math.round(s.cameras.main.scrollX), Math.round(s.cameras.main.scrollY)] }; })()`, 'camAfter');
  log('followW ' + JSON.stringify({ tp: camAfterTp, after: camAfter }));

  // dialogue fixed on screen (exterior, zoom1)
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); s.forceDialog = true; s.dialogueSystem.show(['Prueba de caja de diálogo fija en pantalla - línea larga para medir el ancho correcto.']); return 1; })()`, 'dlg');
  await wait(400);
  const dlgMetrics = await metrics('sendero');
  log('dlg ' + JSON.stringify({ scroll: dlgMetrics.scroll, css: dlgMetrics.css }));
  fs.writeFileSync(path.join(SHOTS, `${w}x${h}-dialog.png`), await win.webContents.capturePage().then(i => i.toPNG()));
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.dialogueSystem.hide) s.dialogueSystem.hide(); return 1; })()`, 'dlgHide');

  // arena with boss bar (zoom auto 1.5)
  await goMap('boss_toxicidad');
  m = await metrics('boss_toxicidad');
  log('arena ' + JSON.stringify(m));
  fs.writeFileSync(path.join(SHOTS, `${w}x${h}-arena.png`), await win.webContents.capturePage().then(i => i.toPNG()));

  const errs = await js(`JSON.stringify(window.__errs || [])`, 'errs2');
  log('errors ' + errs);
  await win.destroy();
  await wait(1500);
  win = null;
}

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  for (const [w, h] of RES) {
    try { await runWindow(w, h); } catch (e) { log('ERR ' + w + 'x' + h + ' ' + (e && e.message)); }
  }
  log('[end]');
  app.exit(0);
}

app.whenReady().then(main);