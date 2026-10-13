const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron', 'preload.js'),
    },
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[CONSOLE:${level}] ${message} (at ${sourceId}:${line})`);
  });

  const distPath = path.join(__dirname, 'dist', 'index.html');
  await win.loadFile(distPath);

  console.log('[TEST] Game loaded in Electron. Waiting 2 seconds for PreloadScene and MenuScene...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('[TEST] Simulating teleport to boss_toxicidad with 1 HP...');
  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      try {
        const game = window.__PHASER_GAME__ || Phaser.GAMES[Object.keys(Phaser.GAMES)[0]];
        if (!game) return reject(new Error('Phaser game instance not found'));

        // Obtener GameScene
        const gameScene = game.scene.getScene('GameScene');
        if (!gameScene) return reject(new Error('GameScene not found'));

        console.log('[TEST-INSIDE] Starting GameScene on boss_toxicidad...');
        game.scene.start('GameScene', { map: 'boss_toxicidad' });

        setTimeout(() => {
          try {
            const activeScene = game.scene.getScene('GameScene');
            if (!activeScene) return reject(new Error('GameScene not active'));
            console.log('[TEST-INSIDE] Active map:', activeScene.currentMapId);
            console.log('[TEST-INSIDE] Current boss:', activeScene.currentBoss ? activeScene.currentBoss.bossType : 'none');

            if (!activeScene.currentBoss) {
              return reject(new Error('Boss not spawned in boss_toxicidad'));
            }

            console.log('[TEST-INSIDE] Inflicting lethal damage to Toxicidad...');
            activeScene.currentBoss.takeDamage(100);

            console.log('[TEST-INSIDE] Boss HP after lethal hit:', activeScene.currentBoss.hp, 'isDead:', activeScene.currentBoss.isDead);

            // Esperar a que se procese la muerte (tween de 1000ms + delayedCall de 500ms)
            setTimeout(() => {
              try {
                console.log('[TEST-INSIDE] Checking state after 2000ms...');
                console.log('[TEST-INSIDE] isDialogActive:', activeScene.isDialogActive);
                console.log('[TEST-INSIDE] dialogueSystem.isActive:', activeScene.dialogueSystem?.isActive);

                // Si hay diálogo de fragmento, simular presionar tecla para avanzar
                if (activeScene.dialogueSystem && activeScene.dialogueSystem.isActive) {
                  console.log('[TEST-INSIDE] Advancing fragment dialogue line 1...');
                  activeScene.dialogueSystem.advance();
                  setTimeout(() => {
                    console.log('[TEST-INSIDE] Advancing fragment dialogue line 2...');
                    activeScene.dialogueSystem.advance();
                    setTimeout(() => {
                      console.log('[TEST-INSIDE] Advancing fragment dialogue line 3...');
                      activeScene.dialogueSystem.advance();
                      setTimeout(() => {
                        console.log('[TEST-INSIDE] Checking if MemoryScene started...');
                        const memScene = game.scene.getScene('MemoryScene');
                        console.log('[TEST-INSIDE] MemoryScene active:', memScene?.scene.isActive());
                        resolve({ success: true, memorySceneActive: memScene?.scene.isActive() });
                      }, 1500);
                    }, 500);
                  }, 500);
                } else {
                  console.log('[TEST-INSIDE] No dialogue was active! Checking state...');
                  resolve({ success: true, noDialogue: true });
                }
              } catch (e) {
                reject(e);
              }
            }, 2000);
          } catch (e) {
            reject(e);
          }
        }, 1000);
      } catch (e) {
        reject(e);
      }
    })
  `);

  console.log('[TEST] Execution result:', result);
  app.quit();
}).catch(err => {
  console.error('[TEST ERROR]', err);
  app.quit();
});
