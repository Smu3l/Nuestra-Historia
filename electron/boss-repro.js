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

  let errs = [];
  win.webContents.on('console-message', (e, level, message) => {
    if (level >= 2 && !message.includes('Security Warning')) errs.push(message.slice(0, 400));
  });

  setTimeout(() => app.quit(), 60000);

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  setTimeout(async () => {
    await win.webContents.executeJavaScript(`
      window.__errs = [];
      window.addEventListener('error', e => { window.__errs.push('A ' + (e.message || '') ); });
      true;
    `).catch(() => {});

    const run = (js) => win.webContents.executeJavaScript(js).catch(e => 'RUN-ERR: ' + e.message);
    const snap = () => run(`
      (() => {
        const game = window.__game;
        const gs = game.scene.getScene('GameScene');
        const ms = game.scene.getScene('MemoryScene');
        const active = game.scene.getScenes(true).map(x => x.scene.key).join('+');
        const b = gs && gs.currentBoss;
        const portal = gs && gs.interactables ? gs.interactables.filter(z => z.interactType === 'exit').length : 0;
        return { scenes: active, map: gs ? gs.currentMapId : null, dlg: gs ? gs.isDialogActive : null,
                 boss: b ? { active: b.active !== false, dead: b.isDead, destroyed: !!b.destroyed } : null,
                 msFrag: ms && ms.scene.isActive() ? ms.fragmentName : null,
                 portal };
      })()
    `);

    await new Promise(r => setTimeout(r, 4000));
    await run(`window.__game.scene.start('GameScene', { map: 'boss_distancia' }); true`).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    for (let i = 0; i < 4; i++) {
      await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.isDialogActive) gs.dialogueSystem.advance(); return true; })()`);
      await new Promise(r => setTimeout(r, 250));
    }
    await new Promise(r => setTimeout(r, 500));
    console.log('STEP1 inicial:', JSON.stringify(await snap()));

    await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.currentBoss) gs.currentBoss.takeDamage(99); return true; })()`);
    console.log('STEP2 tras muerte:', JSON.stringify(await snap()));

    for (let i = 1; i <= 4; i++) {
      await new Promise(r => setTimeout(r, 1000));
      console.log('STEP3 t+' + i + ':', JSON.stringify(await snap()));
    }

    for (let i = 0; i < 12; i++) {
      await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.isDialogActive) gs.dialogueSystem.advance(); return true; })()`);
      await new Promise(r => setTimeout(r, 250));
    }

    for (let i = 1; i <= 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      console.log('STEP4 t+' + i + ':', JSON.stringify(await snap()));
    }

    // Try moving after everything
    const move = await run(`
      (() => { const gs = window.__game.scene.getScene('GameScene');
        if (!gs) return 'no scene';
        const before = { x: gs.player.x, y: gs.player.y };
        gs.dKey.isDown = true;
        return new Promise(res => setTimeout(() => { gs.dKey.isDown = false; res(JSON.stringify({ before, after: { x: gs.player.x, y: gs.player.y } })); }, 500));
      })()
    `);
    console.log('MOVE tras todo:', move);

    const portalTest = await run(`
      (() => { const gs = window.__game.scene.getScene('GameScene');
        if (!gs) return 'no game';
        const pz = gs.interactables && gs.interactables.find(z => z.interactType === 'exit');
        if (!pz) return 'no portal';
        gs.player.setPosition(pz.x, pz.y);
        return new Promise(res => setTimeout(() => {
          gs.player.checkInteractables();
          gs.player.interact();
          res('interacted @' + Math.round(pz.x) + ',' + Math.round(pz.y) + ' -> ' + pz.targetMap);
        }, 100));
      })()
    `);
    console.log('PORTAL TEST:', portalTest);
    await new Promise(r => setTimeout(r, 1800));
    console.log('AFTER PORTAL:', JSON.stringify(await snap()));

    console.log('ERRS:', JSON.stringify(await run(`(() => window.__errs)()`)));
    console.log('CONSOLE:', JSON.stringify(errs));
    app.quit();
  }, 3000);
});