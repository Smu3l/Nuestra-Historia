const { app, BrowserWindow } = require('electron');
const path = require('path');

app.on('ready', () => {
  const win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -2000, y: 0,
    backgroundColor: '#0a0a1e',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
    },
  });
  setTimeout(() => app.quit(), 45000);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  setTimeout(async () => {
    const run = (js) => win.webContents.executeJavaScript(js).catch(e => 'RUN-ERR: ' + e.message);
    const moveTest = (label) => run(`
      (() => {
        const gs = window.__game.scene.getScene('GameScene');
        const before = { x: gs.player.x, y: gs.player.y, hurt: gs.player.isHurt, att: gs.player.isAttacking, dlg: gs.isDialogActive };
        gs.dKey.isDown = true;
        const stuck = gs.dKey.isDown;
        return new Promise(res => {
          setTimeout(() => { gs.dKey.isDown = false; res(JSON.stringify({ before, after: { x: gs.player.x, y: gs.player.y }, stuck, moved: gs.player.x !== before.x })); }, 500);
        });
      })()
    `).then(r => console.log(label + ':', r));

    await new Promise(r => setTimeout(r, 4000));
    await run(`window.__game.scene.start('GameScene', { map: 'casa' }); true`);
    await new Promise(r => setTimeout(r, 1300));
    await run(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.isDialogActive) { s.dialogueSystem.hide(); s.isDialogActive = false; } return true; })()`);
    await new Promise(r => setTimeout(r, 200));
    await moveTest('CASA-vivo');

    await run(`window.__game.scene.start('GameScene', { map: 'boss_distancia' }); true`);
    await new Promise(r => setTimeout(r, 1300));
    await run(`(() => { const s = window.__game.scene.getScene('GameScene'); let g = 0; while (s && s.isDialogActive && g < 4) { s.dialogueSystem.advance(); g++; if (g > 1 && s.isDialogActive) break; } return true; })()`);
    await new Promise(r => setTimeout(r, 400));
    await moveTest('BOSS-vivo');

    await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.currentBoss) gs.currentBoss.takeDamage(99); return true; })()`);
    await new Promise(r => setTimeout(r, 1400));
    await moveTest('BOSS-muerto');

    await new Promise(r => setTimeout(r, 1200));
    app.quit();
  }, 3000);
});