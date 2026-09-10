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

  setTimeout(() => app.quit(), 120000);

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  setTimeout(async () => {
    await win.webContents.executeJavaScript(`
      window.__errs = [];
      window.addEventListener('error', e => {
        window.__errs.push({ m: 'A ' + (e.message || ''), s: (e.error && e.error.stack || '').split('\\n').slice(0,4).join(' | ') });
      });
      true;
    `).catch(() => {});

    const run = (js) => win.webContents.executeJavaScript(js).catch(e => 'RUN-ERR: ' + e.message);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const snap = () => run(`
      (() => {
        const gs = window.__game.scene.getScene('GameScene');
        const ms = window.__game.scene.getScene('MemoryScene');
        const active = window.__game.scene.getScenes(true).map(x => x.scene.key).join('+');
        return JSON.stringify({
          active,
          map: gs ? gs.currentMapId : null,
          evDeath: gs ? gs.events.listenerCount('player-death') : -1,
          portal: gs && gs.interactables ? gs.interactables.filter(z => z.interactType === 'exit').length : 0,
          hp: gs && gs.player ? gs.player.hp : null,
          xs: gs && gs.player ? Math.round(gs.player.x) + ',' + Math.round(gs.player.y) : null,
          msFrag: ms && ms.scene.isActive() ? ms.fragmentName : null,
        });
      })()
    `);

    const start = (map) => run(`window.__game.scene.start('GameScene', { map: '${map}' }); true`);
    const kill = () => run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.scene.isActive() && gs.player && !gs.player.isDead) { gs.player.takeDamage(99); } return true; })()`);

    await sleep(4000);

    // ===== PRUEBA B: normal map death x2 =====
    await start('pantano_toxicidad');
    await sleep(1200);
    for (let d = 1; d <= 2; d++) {
      await kill();
      let t = 0, recovered = false;
      for (let i = 0; i < 30; i++) {
        await sleep(200); t += 200;
        const s = JSON.parse(await snap());
        if (s.map === 'pantano_toxicidad' && s.hp === 6 && s.active.includes('GameScene')) { recovered = true; console.log('PRUEBA-B death' + d + ' recovered in ~' + t + 'ms ', s.evDeath); break; }
      }
      if (!recovered) console.log('PRUEBA-B death' + d + ' NOT RECOVERED ' + JSON.stringify(await snap()));
    }
    await sleep(600);

    // ===== PRUEBA A/C: boss_toxicidad defeat -> fragment -> memory -> return -> die retry =====
    await start('boss_toxicidad');
    await sleep(1200);
    console.log('B1 ERR:', JSON.stringify(await run(`(() => window.__errs)()`)));
    // defeat boss
    await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.currentBoss) gs.currentBoss.takeDamage(99); return true; })()`);
    await sleep(3500);
    console.log('B2 ERR:', JSON.stringify(await run(`(() => window.__errs)()`)));
    // advance fragment dialogue enough times
    for (let i = 0; i < 12; i++) {
      await run(`(() => { const gs = window.__game.scene.getScene('GameScene'); if (gs && gs.isDialogActive) gs.dialogueSystem.advance(); return true; })()`);
      await sleep(250);
    }
    await sleep(2500);
    console.log('R1 BOSS-DEFEATED-FLOW:', await snap());
    console.log('R1 ERR:', JSON.stringify(await run(`(() => window.__errs)()`)));

    // wait until returned to arena and GameScene active
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const s = JSON.parse(await snap());
      if (s.active.includes('GameScene') && s.map === 'boss_toxicidad' && !s.msFrag) break;
    }
    console.log('R1 BACK-IN-ARENA:', await snap());

    // die now (arena, defeated boss, portal present)
    await kill();
    let t2 = 0, rec2 = false;
    for (let i = 0; i < 30; i++) {
      await sleep(250); t2 += 250;
      const s = JSON.parse(await snap());
      if (s.map === 'boss_toxicidad' && s.hp === 6 && s.active.includes('GameScene')) { rec2 = true; console.log('R1 death recovered in ~' + t2 + 'ms evDeath=' + s.evDeath + ' portal=' + s.portal); break; }
    }
    if (!rec2) console.log('R1 NOT RECOVERED:', JSON.stringify(await snap()));
    console.log('R1 ERR:', JSON.stringify(await run(`(() => window.__errs)()`)));

    // die again (retry in arena)
    await kill();
    let t3 = 0, rec3 = false;
    for (let i = 0; i < 30; i++) {
      await sleep(250); t3 += 250;
      const s = JSON.parse(await snap());
      if (s.map === 'boss_toxicidad' && s.hp === 6 && s.active.includes('GameScene')) { rec3 = true; console.log('R2 death recovered in ~' + t3 + 'ms evDeath=' + s.evDeath + ' portal=' + s.portal); break; }
    }
    if (!rec3) console.log('R2 NOT RECOVERED:', JSON.stringify(await snap()));
    console.log('R2 AFTER SECOND DEATH:', await snap());
    console.log('R2 ERR:', JSON.stringify(await run(`(() => window.__errs)()`)));

    console.log('ERRS:', JSON.stringify(await run(`(() => window.__errs)()`)));
    console.log('CONSOLE:', JSON.stringify(errs));
    app.quit();
  }, 3000);
});