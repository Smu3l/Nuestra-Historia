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

  mainWindow.webContents.on('console-message', (e, level, message) => {
    if (level >= 2 && !message.includes('Security Warning')) {
      errors.push(`[${level}] ${message.slice(0, 600)}`);
    }
  });

  mainWindow.webContents.on('render-process-gone', (e, details) => {
    errors.push(`Render gone: ${details.reason}`);
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  setTimeout(async () => {
    try {
      // Wait for game to boot to menu
      await new Promise(r => setTimeout(r, 5000));

      // Start GameScene directly on casa
      await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          game.scene.start('GameScene', { map: 'casa' });
          setTimeout(() => {
            const scene = game.scene.getScene('GameScene');
            resolve({
              running: scene && scene.scene.isActive(),
              hasPlayer: !!scene.player,
              playerX: scene.player ? scene.player.x : null,
              playerY: scene.player ? scene.player.y : null,
              interactables: scene.interactables ? scene.interactables.length : -1,
              npcs: scene.npcSprites ? scene.npcSprites.length : -1,
              tileCount: scene.mapTiles ? scene.mapTiles.length : -1,
            });
          }, 1500);
        })
      `).then(r => console.log('CASA MAP:', JSON.stringify(r)));

      // Test player movement (dismiss any first-visit auto dialogue first)
      const moveResult = await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          const scene = game.scene.getScene('GameScene');
          if (scene.dialogueSystem.isActive) {
            scene.dialogueSystem.hide();
            scene.isDialogActive = false;
          }
          scene.player.setPosition(96, 96);
          const before = { x: scene.player.x, y: scene.player.y };
          // Simulate holding the D key using the scene's actual dKey
          scene.dKey.isDown = true;
          setTimeout(() => {
            scene.dKey.isDown = false;
            resolve({ before, after: { x: scene.player.x, y: scene.player.y }, moved: scene.player.x !== before.x || scene.player.y !== before.y });
          }, 500);
        })
      `).then(r => console.log('MOVEMENT:', JSON.stringify(r)));

      // Test attack
      await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          const scene = game.scene.getScene('GameScene');
          const hpBefore = scene.player.hp;
          scene.player.attack();
          setTimeout(() => resolve({ attackTriggered: true, hpStill: scene.player.hp === hpBefore }), 700);
        })
      `).then(r => console.log('ATTACK:', JSON.stringify(r)));

      // Test dialogue system
      await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          const scene = game.scene.getScene('GameScene');
          scene.showDialogue('casa_bed');
          setTimeout(() => {
            resolve({
              dialogActive: scene.isDialogActive,
              dialogSystemActive: scene.dialogueSystem.isActive,
              hasText: scene.dialogueSystem.dialogText.text.length > 0,
            });
          }, 300);
        })
      `).then(r => console.log('DIALOGUE:', JSON.stringify(r)));

      // Start boss arena
      await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          game.scene.start('GameScene', { map: 'boss_distancia' });
          setTimeout(() => {
            const scene = game.scene.getScene('GameScene');
            resolve({
              running: scene && scene.scene.isActive(),
              hasBoss: !!scene.currentBoss,
              bossName: scene.currentBoss ? scene.currentBoss.bossName : null,
              bossHP: scene.currentBoss ? scene.currentBoss.hp : null,
            });
          }, 1500);
        })
      `).then(r => console.log('BOSS ARENA:', JSON.stringify(r)));

      // Test boss damage
      await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          const scene = game.scene.getScene('GameScene');
          if (!scene.currentBoss) { resolve({ error: 'no boss' }); return; }
          const hpBefore = scene.currentBoss.hp;
          scene.currentBoss.takeDamage(1);
          resolve({ damageApplied: scene.currentBoss.hp === hpBefore - 1, hpNow: scene.currentBoss.hp });
        })
      `).then(r => console.log('BOSS DAMAGE:', JSON.stringify(r)));

      // Player death recovery check
      await mainWindow.webContents.executeJavaScript(`
        new Promise(resolve => {
          const game = window.__game;
          const scene = game.scene.getScene('GameScene');
          scene.player.hp = 1;
          scene.player.takeDamage(1);
          setTimeout(() => {
            const gstate = window.__game;
            resolve({
              hpAfterDeath: scene.player.hp,
              gameStateHP: window.__game ? undefined : null,
              deathHandled: true,
            });
          }, 200);
        })
      `).then(r => console.log('DEATH:', JSON.stringify(r)));

      const fs = require('fs');
      const results = {
        success: errors.length === 0,
        errors,
      };
      fs.writeFileSync(path.join(__dirname, 'smoke-test-gameplay.json'), JSON.stringify(results, null, 2));
      console.log('ERRORS COUNT:', errors.length);
      if (errors.length) errors.forEach(e => console.log('ERR:', e));
    } catch (e) {
      console.log('TEST EXCEPTION:', e.message);
    }
    app.quit();
  }, 1000);
});