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

  setTimeout(() => app.quit(), 90000);

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  setTimeout(async () => {
    await win.webContents.executeJavaScript(`
      window.__errs = [];
      window.addEventListener('error', e => { window.__errs.push('A ' + (e.message || '')); });
      true;
    `).catch(() => {});

    const run = (js) => win.webContents.executeJavaScript(js).catch(e => 'RUN-ERR: ' + e.message);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const countL = () => run(`
      (() => {
        const gs = window.__game.scene.getScene('GameScene');
        if (!gs) return 'no gs';
        const kb = c => gs.input && gs.input.keyboard ? gs.input.keyboard.listenerCount('keydown-' + c) : -1;
        return JSON.stringify({
          evDeath: gs.events.listenerCount('player-death'),
          evHurt: gs.events.listenerCount('player-hurt'),
          evBossStart: gs.events.listenerCount('boss-start'),
          evBossDef: gs.events.listenerCount('boss-defeated'),
          kbSpace: kb('SPACE'), kbE: kb('E'), kbEnter: kb('ENTER'),
          pointer: gs.input ? gs.input.listenerCount('pointerdown') : -1,
          esc: gs.escKey ? gs.escKey.listenerCount('down') : -1,
          hp: gs.player ? gs.player.hp : null,
          map: gs.currentMapId,
        });
      })()
    `);

    const snap = () => run(`
      (() => {
        const gs = window.__game.scene.getScene('GameScene');
        const ms = window.__game.scene.getScene('MemoryScene');
        const active = window.__game.scene.getScenes(true).map(x => x.scene.key).join('+');
        return JSON.stringify({
          active, map: gs ? gs.currentMapId : null, dlg: gs ? gs.isDialogActive : null,
          camAlpha: gs ? gs.cameras.main.alpha : null,
          playerDead: gs && gs.player ? (gs.player.isDead || null) : null,
          playerX: gs && gs.player ? Math.round(gs.player.x) : null,
          boss: gs && gs.currentBoss ? { active: gs.currentBoss.active !== false, dead: gs.currentBoss.isDead } : null,
          msActive: ms ? (ms.scene.isActive('MemoryScene') != null ? undefined : ms.scene.isActive()) : undefined,
        });
      })()
    `);

    // Grab GameState via scenes to force deaths
    await sleep(4000);
    await run(`window.__game.scene.start('GameScene', { map: 'boss_toxicidad' }); true`).catch(() => {});
    await sleep(1200);

    console.log('ENTRY :', 'L=' + await countL(), 'S=' + await snap());

    for (let cycle = 1; cycle <= 3; cycle++) {
      // force death
      await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.player) gs.player.takeDamage(99); return true; })()`);
      await sleep(100);
      console.log('DEATH'+cycle+' :', 'L=' + await countL(), 'S=' + await snap());
      // give time for fade (1000) + restart (1200) + fadeIn (500)
      await sleep(3500);
      console.log('AFTER '+cycle+' :', 'L=' + await countL(), 'S=' + await snap());
    }

    // After 3 deaths, check fatal state
    console.log('ERRS:', JSON.stringify(await run(`(() => window.__errs)()`)));
    console.log('CONSOLE:', JSON.stringify(errs));
    app.quit();
  }, 3000);
});