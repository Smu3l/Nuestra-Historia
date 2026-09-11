const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'electron', 'scale-out.txt');

function log(line) {
  fs.appendFileSync(OUT, line + '\n');
  console.log(line);
}

function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + label)), ms)),
  ]);
}

async function run() {
  fs.writeFileSync(OUT, '[probe start]\n');

  try {
    const index = path.join(__dirname, '..', 'dist', 'index.html');
    if (!fs.existsSync(index)) {
      log('dist/index.html NOT FOUND');
      app.exit(0);
      return;
    }

    const win = new BrowserWindow({
      width: 1280,
      height: 720,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });
    win.webContents.on('console-message', (_e, level, msg) => {
      if (msg) log('  [renderer] ' + msg.slice(0, 160));
    });
    win.webContents.on('render-process-gone', (_e, d) => log('render-process-gone: ' + JSON.stringify(d)));

    await withTimeout(win.loadFile(index), 30000, 'loadFile');
    log('loaded, waiting for boot...');
    await withTimeout(new Promise(r => setTimeout(r, 4500)), 20000, 'boot');

    const state = await withTimeout(
      win.webContents.executeJavaScript(`(() => {
        const c = document.querySelector('canvas');
        if (!c) return { error: 'no canvas' };
        const r = c.getBoundingClientRect();
        const sc = window.__game ? window.__game.scale : null;
        const scene = window.__game ? window.__game.scene && window.__game.scene.getScenes(true)[0] : null;
        return {
          size: [window.innerWidth, window.innerHeight],
          dpr: window.devicePixelRatio,
          canvasAttr: [c.width, c.height],
          canvasStyle: [c.style.width, c.style.height],
          canvasRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          bodySize: [document.body.clientWidth, document.body.clientHeight],
          scale: sc ? {
            base: sc.baseSize ? [sc.baseSize.width, sc.baseSize.height] : null,
            game: sc.gameSize ? [sc.gameSize.width, sc.gameSize.height] : null,
            display: sc.displaySize ? [sc.displaySize.width, sc.displaySize.height] : null,
            expand: sc.expandParent,
            parentIsWindow: sc.parentIsWindow === true,
          } : null,
          scene: scene ? scene.scene.key : null,
        };
      })()`),
      10000,
      'measure'
    );
    log('RESULT: ' + JSON.stringify(state, null, 2));

    try {
      const img = await withTimeout(win.webContents.capturePage(), 10000, 'screenshot');
      const shot = path.join(__dirname, '..', 'electron', 'scale-1280x720.png');
      fs.writeFileSync(shot, img.toPNG());
      log('screenshot saved: ' + shot);
    } catch (e) {
      log('screenshot failed: ' + e.message);
    }

    win.destroy();
  } catch (e) {
    log('FATAL: ' + (e && e.stack || e));
  }

  log('[probe end]');
  app.exit(0);
}

process.on('unhandledRejection', (e) => log('unhandledRejection: ' + (e && e.message)));

app.whenReady().then(run);