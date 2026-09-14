const { app, BrowserWindow } = require('electron');
const path = require('path');
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -2000, y: 0,
    webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.webContents.on('console-message', (_e, level, msg) => console.log('R(' + level + '):', String(msg).slice(0, 150)));
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  let menu = false;
  for (let i = 0; i < 30 && !menu; i++) {
    await wait(400);
    try { menu = (await win.webContents.executeJavaScript(`(() => { const g = window.__game; return g ? JSON.stringify(g.scene.getScenes(true).map(s => s.scene.key)) : 'nogame'; })()`)).includes('MenuScene'); } catch (e) {}
  }
  console.log('menu:', menu);
  await win.webContents.executeJavaScript(`(() => { window.__game.scene.start('GameScene', { map: 'casa' }); return 1; })()`);
  await wait(2200);
  const dump = await win.webContents.executeJavaScript(`(() => {
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    const cam = s.cameras.main;
    const scale = g.scale;
    const wv = cam.worldView;
    return JSON.stringify({
      zoom: cam.zoom,
      scroll: [cam.scrollX, cam.scrollY],
      useBounds: cam.useBounds,
      hasFollow: !!cam.follow,
      boundsW: cam._bounds && cam._bounds.width,
      boundsH: cam._bounds && cam._bounds.height,
      worldView: [wv.width, wv.height, wv.x, wv.y],
      camW: cam.width, camH: cam.height,
      scaleBase: [scale.baseSize.width, scale.baseSize.height],
      scaleDisplay: [scale.displaySize.width, scale.displaySize.height],
      scaleZoom: scale.zoom,
      scaleAuto: scale.autoRound,
      cfg: [g.config.width, g.config.height],
      player: [s.player.x, s.player.y],
    });
  })()`);
  console.log('DUMP:', dump);
  await win.webContents.executeJavaScript(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const cam = s.cameras.main;
    cam.setScroll(0, 0);
    return 1;
  })()`);
  await wait(1200);
  const after = await win.webContents.executeJavaScript(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const cam = s.cameras.main;
    return JSON.stringify({ scroll: [cam.scrollX, cam.scrollY], worldView: [cam.worldView.width, cam.worldView.height] });
  })()`);
  console.log('AFTER RESET:', after);
  win.destroy(); app.exit(0);
}
app.whenReady().then(main).catch(e => { console.log('FATAL', e); app.exit(1); });