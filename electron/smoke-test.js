const { app, BrowserWindow } = require('electron');
const path = require('path');

let errors = [];
let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: true,
    x: -2000,
    y: 0,
backgroundColor: '#0a0a1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    if (level >= 2 && !message.includes('Security Warning')) {
      errors.push(`[${level}] ${message} (${sourceId}:${line})`);
    }
  });

  mainWindow.webContents.on('render-process-gone', (e, details) => {
    errors.push(`Render process gone: ${details.reason}`);
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  const checks = [];

  const runCheck = (id, condition, label) => {
    return mainWindow.webContents.executeJavaScript(condition).then(result => {
      checks.push({ id, label, pass: !!result, result });
    }).catch(err => {
      checks.push({ id, label, pass: false, result: err.message });
    });
  };

  setTimeout(async () => {
    // BootScene should be running (or beyond)
    await runCheck('scene-running', `window.__game && window.__game.scene.isActive('BootScene') || window.__game && window.__game.scene.isActive('PreloadScene') || window.__game && window.__game.scene.isActive('MenuScene')`, 'A game scene is active after boot');

    // The game object should exist
    await runCheck('game-exists', `typeof window.__game !== 'undefined'`, 'Phaser game instance exists');

    // Texture registry should have entries (procedural assets generated)
    await runCheck('textures', `window.__game && window.__game.textures && Object.keys(window.__game.textures.list).length > 0`, 'Textures were generated');

    setTimeout(async () => {
      // Menu should be active after preload
      await runCheck('menu-active', `window.__game && window.__game.scene.isActive('MenuScene')`, 'Menu scene is active');

      const fs = require('fs');
      const results = {
        success: !errors.some(e => e.startsWith('[3]') || e.startsWith('[2]')) && checks.every(c => c.pass),
        errors,
        checks,
      };

      fs.writeFileSync(path.join(__dirname, 'smoke-test-result.json'), JSON.stringify(results, null, 2));
      console.log('SMOKE TEST RESULT:');
      checks.forEach(c => console.log(`${c.pass ? 'PASS' : 'FAIL'}: ${c.label} => ${JSON.stringify(c.result)}`));
      if (errors.length) console.log('ERRORS:', JSON.stringify(errors));
      app.quit();
    }, 8000);
  }, 6000);
});
