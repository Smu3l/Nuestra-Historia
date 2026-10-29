const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'npc-out.json');
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  const win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -2000, y: 0,
    webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  await win.loadFile(index);
  const run = js => win.webContents.executeJavaScript(js).catch(e => 'ERR: ' + e.message);

  for (let i = 0; i < 40; i++) {
    await wait(400);
    if (await run(`window.__game && window.__game.scene.isActive('MenuScene')`) === true) break;
  }

  async function dump(map) {
    const err = await win.webContents.executeJavaScript(
      `window.__game.scene.start('GameScene',{map:'${map}'}); true`).catch(e => 'ERR: ' + e.message);
    await wait(1400);
    const a1 = await run(`(() => {
      const s = window.__game.scene.getScene('GameScene');
      return JSON.stringify(s.npcSprites.map(n => ({
        name: n.npcName,
        key: n.texture && n.texture.key,
        x: +n.x.toFixed(1), y: +n.y.toFixed(1),
        dw: +n.displayWidth.toFixed(1), dh: +n.displayHeight.toFixed(1),
        ox: n.originX.toFixed(3), oy: n.originY.toFixed(3),
        angle: +n.angle.toFixed(2),
      })));
    })()`);
    await wait(400);
    const a2 = await run(`(() => {
      const s = window.__game.scene.getScene('GameScene');
      return JSON.stringify(s.npcSprites.map(n => +n.angle.toFixed(2)));
    })()`);
    let info = a1, angles2 = a2;
    try { info = JSON.parse(a1); } catch (e) {}
    try { angles2 = JSON.parse(a2); } catch (e) {}
    return { info, angles2 };
  }

  const res = {};
  res.sendero = await dump('sendero_distancia');
  res.casa = await dump('casa');

  await run(`window.__game.scene.start('GameScene', { map: 'sendero_distancia' }); true`);
  await wait(1200);
  fs.writeFileSync(path.join(__dirname, 'npc-sendero.png'), (await win.webContents.capturePage()).toPNG());

  await run(`window.__game.scene.start('GameScene', { map: 'casa' }); true`);
  await wait(1200);
  fs.writeFileSync(path.join(__dirname, 'npc-casa.png'), (await win.webContents.capturePage()).toPNG());

  fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res, null, 2));
  win.destroy();
  app.exit(0);
}

app.whenReady().then(main).catch(e => { console.log('FATAL ' + (e && e.stack || e)); app.exit(1); });
