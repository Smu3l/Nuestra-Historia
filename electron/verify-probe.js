const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'verify-out.txt');
const log = l => { fs.appendFileSync(OUT, l + '\n'); console.log(l); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, tag) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + tag)), ms))]);

function attachFullscreenHandler(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
      event.preventDefault();
    }
  });
}

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  const win = new BrowserWindow({
    width: 1366, height: 768, show: true, x: -2000, y: 0,
    webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.webContents.on('console-message', (_e, level, m) => {
    if (level >= 2) log('  [r] ' + String(m).slice(0, 200));
  });

  await withT(win.loadFile(index), 30000, 'load');

  const run = js => win.webContents.executeJavaScript(js).catch(e => 'RUN-ERR: ' + e.message);

  // wait for menu
  for (let i = 0; i < 40; i++) {
    await wait(400);
    const up = await run(`window.__game && window.__game.scene.isActive('MenuScene')`);
    if (up === true) break;
  }

  await run(`window.__errs = []; window.addEventListener('error', e => window.__errs.push((e.message||'') + ' @ ' + (e.filename||''))); true`);

  // ---- 1. fill metrics at several window sizes (lago_celos) ----
  const startMap = async (mid, sx, sy) => {
    const extra = (sx !== undefined) ? (', spawnX: ' + sx + ', spawnY: ' + sy) : '';
    await run("window.__game.scene.start('GameScene', { map: '" + mid + "'" + extra + " }); true");
    await wait(900);
  };

  const fill = async (w, h) => {
    win.setSize(w, h);
    await wait(700);
    await startMap('lago_celos', 1, 10);
    return JSON.parse(await run(`(() => {
      const s = window.__game.scene.getScene('GameScene');
      const cam = s.cameras.main;
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return JSON.stringify({
        win: [window.innerWidth, window.innerHeight],
        canvas: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        display: [Math.round(window.__game.scale.displaySize.width), Math.round(window.__game.scale.displaySize.height)],
        zoom: cam.zoom,
      });
    })()`));
  };

  for (const [w, h] of [[1366, 768], [1600, 900], [1920, 1080]]) {
    log('FILL ' + w + 'x' + h + ' ' + JSON.stringify(await fill(w, h)));
  }

  // ---- 2. camera + HUD on several maps ----
  const mapZoomExpected = mapPx => Math.round(Math.min(Math.max(640 / mapPx[0], 360 / mapPx[1]), 1.5) * 1000) / 1000;
  const checkMap = async (mid) => {
    await startMap(mid);
    const o = JSON.parse(await run(`(() => {
      const s = window.__game.scene.getScene('GameScene');
      const cam = s.cameras.main;
      const d = s.currentMapData;
      const viewW = 640 / cam.zoom, viewH = 360 / cam.zoom;
      const inView = (x, y) => x >= cam.scrollX - 1 && x <= cam.scrollX + viewW + 1 && y >= cam.scrollY - 1 && y <= cam.scrollY + viewH + 1;
      const h = s.hud;
      return JSON.stringify({
        map: '${mid}', zoom: cam.zoom, view: [viewW, viewH],
        mapPx: [d.width*16, d.height*16], scroll: [cam.scrollX, cam.scrollY],
        playerTile: [Math.floor(s.player.x/16), Math.floor(s.player.y/16)],
        hud: {
          hearts: [Math.round(h.heartContainer.x), Math.round(h.heartContainer.y), inView(h.heartContainer.x, h.heartContainer.y)],
          mapName: [Math.round(h.mapNameText.x), Math.round(h.mapNameText.y), inView(h.mapNameText.x, h.mapNameText.y)],
          fragments: [Math.round(h.fragmentContainer.x), Math.round(h.fragmentContainer.y), inView(h.fragmentContainer.x, h.fragmentContainer.y)],
          prompt: [Math.round(h.interactPrompt.x), Math.round(h.interactPrompt.y), inView(h.interactPrompt.x, h.interactPrompt.y)],
        },
        errs: window.__errs.slice(0, 3),
      });
    })()`));
    o.expectedZoom = mapZoomExpected(o.mapPx);
    return o;
  };

  for (const mid of ['lago_celos', 'casa', 'boss_toxicidad', 'pantano_toxicidad']) {
    log('MAPCHK ' + mid + ' ' + JSON.stringify(await checkMap(mid)));
  }

  // ---- 3. tree trunk collision (wallBodies) on lago_celos ----
  await startMap('lago_celos', 1, 10);
  const tree = await run(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    if (!s || !s.mapTiles) return 'no scene';
    const tr = s.mapTiles.find(t => { const tx = Math.floor((t.x-8)/16), ty = Math.floor((t.y-8)/16); return s.currentMapData.tiles[ty]?.[tx] === 2; });
    if (!tr) return 'no tree';
    const r = JSON.stringify({ tx: Math.floor((tr.x-8)/16), ty: Math.floor((tr.y-8)/16), body: tr.body ? { w: tr.body.width, h: tr.body.height, ox: tr.body.offset.x, oy: tr.body.offset.y } : null });
    return r;
  })()`);
  log('TREE: ' + tree);

  // walk into a wall tile (water/rock/tree) from above — should be blocked
  const blockWater = await run(`(async () => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const walls = new Set(d.walls);
    let pick = null;
    for (let ty = 1; ty < d.height && !pick; ty++) for (let tx = 0; tx < d.width; tx++) {
      if (walls.has(d.tiles[ty][tx]) && !walls.has(d.tiles[ty-1][tx])) { pick = { tx, ty }; break; }
    }
    if (!pick) return 'no wall found';
    const px = pick.tx*16 + 8, py = (pick.ty-1)*16 + 14;
    s.player.body.reset(px, py);
    s.player.setVelocityY(120);
    await new Promise(r => setTimeout(r, 500));
    s.player.setVelocityY(0);
    return JSON.stringify({ tile: pick, tileId: d.tiles[pick.ty][pick.tx], playerX: Math.round(s.player.x), playerY: Math.round(s.player.y), blockedDown: s.player.body.blocked.down });
  })()`).catch(e => 'T ' + e.message);
  log('WATER-BLOCK ' + blockWater);

  await run(`window.__game.scene.stop('GameScene'); true`);

  // ---- 4. F11 / ESC fullscreen (same handler as real main.js) ----
  attachFullscreenHandler(win);
  await run(`window.__game && window.__game.scene.start('MenuScene'); true`);
  const f11 = await run(`window.__game && window.__game.scene.start('MenuScene'); true`);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'F11' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'F11' });
  await wait(500);
  const fsOn = win.isFullScreen();
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  await wait(500);
  const fsOff = win.isFullScreen();
  log('FULLSCREEN F11=' + fsOn + ' ESC-exit=' + (!fsOn ? 'F11 never entered (skip)' : (!fsOff ? 'FAIL-ESC' : 'OK')));

  log('[end]');
  win.destroy();
  app.exit(0);
}

app.whenReady().then(main).catch(e => { log('FATAL ' + (e && e.stack || e)); app.exit(1); });