const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'electron', 'gameplay-out.txt');
function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  const index = path.join(__dirname, '..', 'dist', 'index.html');

  const win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -2000, y: 0,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.webContents.on('console-message', (_e, level, msg) => {
    log('  [r' + level + '] ' + String(msg).slice(0, 220));
  });

  await withT(win.loadFile(index), 30000, 'load');

  // wait until the menu is up (boot animation ~3s + preload ~2.5s)
  let menuUp = false;
  for (let i = 0; i < 40; i++) {
    await wait(400);
    try {
      const st = await win.webContents.executeJavaScript(`(() => {
        const g = window.__game;
        if (!g) return 'no game';
        const act = g.scene.getScenes(true).map(s => s.scene.key);
        return JSON.stringify(act);
      })()`);
      menuUp = st.includes('MenuScene');
      log('poll ' + i + ' scenes=' + st);
    } catch (e) {
      log('poll ' + i + ' error ' + (e && e.message));
    }
    if (menuUp) break;
  }
  log('menuUp=' + menuUp);
  if (!menuUp) { log('menu never came up — aborting'); app.exit(1); return; }

  // jump into the lake map
  await withT(win.webContents.executeJavaScript(`window.__game.scene.start('GameScene', { map: 'lago_celos', spawnX: 1, spawnY: 10 }); 0`), 8000, 'start');
  await wait(1800);

  const state = await withT(win.webContents.executeJavaScript(`(() => {
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    const cam = s.cameras.main;
    const d = s.currentMapData;
    const scale = g.scale;
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return {
      scene: s.scene.key,
      window: [window.innerWidth, window.innerHeight],
      canvasRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      display: [scale.displaySize.width, scale.displaySize.height],
      zoom: cam.zoom,
      scroll: [cam.scrollX, cam.scrollY],
      playerTile: [Math.floor(s.player.x / 16), Math.floor(s.player.y / 16)],
      playerWorld: [s.player.x, s.player.y],
      map: [d.width, d.height],
      mapTiles: d.tiles.length,
    };
  })()`), 8000, 'state');
  log('STATE: ' + JSON.stringify(state, null, 2));

  // live BFS from player start to boss arena, using the REAL map data
  const bfs = await withT(win.webContents.executeJavaScript(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height;
    const walls = new Set(d.walls);
    const pass = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !walls.has(d.tiles[y][x]);
    const seen = new Set();
    const q = [[1, 10]];
    seen.add('1,10');
    const dist = { '1,10': 0 };
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const k = (x+dx) + ',' + (y+dy);
        if (pass(x+dx, y+dy) && !seen.has(k)) { seen.add(k); dist[k] = dist[x+','+y] + 1; q.push([x+dx, y+dy]); }
      }
    }
    const boss = [27, 10];
    const npc = [7, 12];
    return {
      reachableTiles: seen.size,
      bossReachable: pass(boss[0], boss[1]) && dist[boss[0]+','+boss[1]] !== undefined,
      bossDist: dist[boss[0]+','+boss[1]],
      npcReachable: dist[npc[0]+','+npc[1]] !== undefined,
      tileBoss: d.tiles[10][27],
    };
  })()`), 8000, 'bfs');
  log('LIVE BFS: ' + JSON.stringify(bfs, null, 2));

  // teleport player near the boss arena to validate walk + camera follows
  await withT(win.webContents.executeJavaScript(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(27*16+8, 10*16+12);
    s.player.x = 27*16+8; s.player.y = 10*16+12;
    window.__game.scene.getScene('GameScene').cameras.main.centerOn(s.player.x, s.player.y);
    return 'ok';
  })()`), 8000, 'teleport');
  await wait(500);
  const after = await withT(win.webContents.executeJavaScript(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const cam = s.cameras.main;
    return { playerWorld: [s.player.x, s.player.y], scroll: [cam.scrollX, cam.scrollY], zoom: cam.zoom };
  })()`), 8000, 'after');
  log('AFTER TELEPORT: ' + JSON.stringify(after, null, 2));

  // capture screenshots
  for (const [w, h, name] of [[1280, 720, 'lago-1280'], [800, 450, 'lago-800']]) {
    win.setSize(w, h);
    await wait(600);
    const img = await withT(win.webContents.capturePage(), 10000, 'shot');
    const f = path.join(__dirname, '..', 'electron', name + '.png');
    fs.writeFileSync(f, img.toPNG());
    log('saved ' + name);
  }

  log('[end]');
  win.destroy();
  app.exit(0);
}

app.whenReady().then(main).catch(e => { log('FATAL ' + (e && e.stack || e)); app.exit(1); });