const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'dir-out.txt');
function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);
let win;
async function js(code, label, timeout) { return withT(win.webContents.executeJavaScript(code), timeout || 10000, label); }

const MAPS = [
  'sendero_distancia', 'casa', 'boss_distancia', 'pantano_toxicidad', 'boss_toxicidad',
  'valle_desinteres', 'montanas_inseguridad', 'boss_inseguridad', 'lago_celos', 'boss_celos',
  'reino_recuerdos', 'boss_coleccionista',
];

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  win = new BrowserWindow({
    width: 1280, height: 800, show: true, x: -4000, y: 0,
    frame: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  await withT(win.loadFile(path.join(__dirname, '..', 'dist', 'index.html')), 30000, 'load');
  for (let i = 0; i < 60; i++) {
    await wait(400);
    try { if (await js(`!!(window.__game && window.__game.scene.getScenes(true).some(s => s.scene.key === 'MenuScene'))`, 'poll')) break; } catch (e) { /* retry */ }
  }
  await js(`(window.__suppressDialog = setInterval(() => { const s = window.__game && window.__game.scene.getScene('GameScene'); if (s && s.isDialogActive && s.dialogueSystem && s.dialogueSystem.hide) s.dialogueSystem.hide(); }, 50), 0)`, 'sup');

  for (const map of MAPS) {
    await js(`window.__game.scene.start('GameScene', { map: '${map}' }); 0`, 'go');
    await wait(1800);
    await js(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.isDialogActive && s.dialogueSystem.hide) s.dialogueSystem.hide(); if (s.player) { s.player.invincible = true; s.player.hp = s.player.maxHP; } })()`, 'arm');
    await wait(300);
    const results = {};
    for (const key of ['L', 'R', 'U', 'D']) {
      const kc = { L: 'Left', R: 'Right', U: 'Up', D: 'Down' }[key];
      await js(`window.__mv = { bx: Math.round(window.__game.scene.getScene('GameScene').player.x), by: Math.round(window.__game.scene.getScene('GameScene').player.y) }, 0`, 'prep');
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: kc });
      await wait(950);
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: kc });
      await wait(120);
      const r = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const p = s.player; const dx = Math.round(p.x - window.__mv.bx); const dy = Math.round(p.y - window.__mv.by); const cam = s.cameras.main; const sx = (p.x - cam.scrollX) * cam.zoom; const sy = (p.y - cam.scrollY) * cam.zoom; const inView = sx >= -12 && sx <= 640 + 12 && sy >= -12 && sy <= 360 + 12; const kb = p.body ? { bL: p.body.blocked.left, bR: p.body.blocked.right, bU: p.body.blocked.up, bD: p.body.blocked.down } : null; p.setVelocity(0, 0); return JSON.stringify({ dx, dy, inView, kb, zoom: cam.zoom, p: [Math.round(p.x), Math.round(p.y)], scroll: [Math.round(cam.scrollX), Math.round(cam.scrollY)], mw: s.currentMapData.width * 16, mh: s.currentMapData.height * 16 }); })()`, 'sample');
      results[key] = JSON.parse(r);
    }
    let fail = '';
    for (const d of ['L', 'R', 'U', 'D']) {
      const res = results[d];
      const m = Math.abs(res.dx) + Math.abs(res.dy);
      if (m < 8 || !res.inView) {
        fail += ' ' + d + ' dx=' + res.dx + ' dy=' + res.dy + ' inView=' + res.inView + ' zoom=' + res.zoom + ' p=' + JSON.stringify(res.p);
      }
    }
    log((fail ? 'FAIL' : 'OK') + ' ' + map + (fail || ''));
  }
  log('[end]');
  app.exit(0);
}
app.whenReady().then(main).catch(e => { log('FATAL ' + (e && e.stack || e)); app.exit(1); });