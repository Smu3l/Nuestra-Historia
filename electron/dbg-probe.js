const { app, BrowserWindow } = require('electron');
const path = require('path');
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -2000, y: 0,
    webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.webContents.on('console-message', (_e, level, msg) => console.log('renderer(r' + level + '):', String(msg).slice(0, 150)));
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  let menu = false;
  for (let i = 0; i < 30 && !menu; i++) {
    await wait(400);
    try { menu = (await win.webContents.executeJavaScript(`(() => { const g = window.__game; return g ? JSON.stringify(g.scene.getScenes(true).map(s => s.scene.key)) : 'nogame'; })()`)).includes('MenuScene'); } catch (e) {}
  }
  console.log('menu:', menu);
  const r1 = await win.webContents.executeJavaScript(`(() => { const g = window.__game; g.scene.start('GameScene', { map: 'casa' }); return 'started'; })()`);
  await wait(2000);
  const r2 = await win.webContents.executeJavaScript(`(() => {
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    return JSON.stringify({ key: s && s.scene.key, active: s && s.active, systemsActive: s && s.sys ? s.sys.isActive() : 'no-sys', running: g.scene.isActive('GameScene'), keys: g.scene.getScenes(true).map(x => x.scene.key) });
  })()`);
  console.log('check1:', r2);
  const r3 = await win.webContents.executeJavaScript(`(() => { const g = window.__game; g.scene.start('GameScene', { map: 'lago_celos' }); return 'ok'; })()`);
  await wait(2000);
  const r4 = await win.webContents.executeJavaScript(`(() => {
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    return JSON.stringify({ active: s && s.active, running: g.scene.isActive('GameScene'), keys: g.scene.getScenes(true).map(x => x.scene.key) });
  })()`);
  console.log('check2:', r4);
  win.destroy(); app.exit(0);
}
app.whenReady().then(main).catch(e => { console.log('FATAL', e); app.exit(1); });