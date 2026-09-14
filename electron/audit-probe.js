const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'electron', 'audit-out.txt');
let errors = [];
function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);

let win;

async function js(code, label, timeout) {
  return withT(win.webContents.executeJavaScript(code), timeout || 8000, label);
}

const ALL_MAPS = [
  'casa', 'sendero_distancia', 'pantano_toxicidad', 'valle_desinteres',
  'montanas_inseguridad', 'lago_celos', 'reino_recuerdos',
  'boss_distancia', 'boss_toxicidad', 'boss_desinteres', 'boss_inseguridad', 'boss_celos', 'boss_coleccionista'
];

async function boot() {
  let menuUp = false;
  for (let i = 0; i < 40; i++) {
    await wait(400);
    try {
      const st = await js(`(() => {
        const g = window.__game; if (!g) return 'no game';
        return JSON.stringify(g.scene.getScenes(true).map(s => s.scene.key));
      })()`, 'poll');
      menuUp = st.includes('MenuScene');
      if (menuUp) break;
    } catch (e) { log('poll err ' + (e && e.message)); }
  }
  log('AUDIT boot: menuUp=' + menuUp);
  if (!menuUp) { log('AUDIT FATAL: menu never came up'); app.exit(1); }
}

async function clearDialogsAndArm() {
  await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    if (!s) return 'no-scene';
    if (s.isDialogActive && s.dialogueSystem && s.dialogueSystem.hide) s.dialogueSystem.hide();
    if (s.player) { s.player.invincible = true; s.player.hp = s.player.maxHP; }
    return 'armed';
  })()`, 'arm');
}

async function startMap(mapId) {
  await js(`window.__game.scene.start('GameScene', { map: '${mapId}' }); 0`, 'start-' + mapId);
  await wait(1600);
  await clearDialogsAndArm();
}

async function sampleMap(mapId) {
  const data = await js(`(() => {
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    if (!s || !s.sys.isActive()) return { active: false };
    const cam = s.cameras.main;
    const d = s.currentMapData;
    const zoom = cam.zoom;
    const viewW = 640 / zoom, viewH = 360 / zoom;
    const mapW = d.width * 16, mapH = d.height * 16;
    const p = s.player;
    const inView = p && p.x >= cam.scrollX && p.x <= cam.scrollX + 640 / zoom && p.y >= cam.scrollY && p.y <= cam.scrollY + 360 / zoom;
    return {
      active: true,
      map: s.currentMapId,
      zoom: zoom,
      view: [viewW, viewH],
      mapPx: [mapW, mapH],
      fitsHoriz: viewW <= mapW + 0.5,
      fitsVert: viewH <= mapH + 0.5,
      scroll: [cam.scrollX, cam.scrollY],
      bounds: [cam._bounds ? cam._bounds.width : -1, cam._bounds ? cam._bounds.height : -1],
      player: [Math.round(p.x), Math.round(p.y)],
      playerInView: !!inView,
      bossBar: (s.currentBoss && s.currentBoss.hpBarBg) ? [Math.round(s.currentBoss.hpBarBg.x), Math.round(s.currentBoss.hpBarBg.y)] : null,
      deathListeners: s.events.listenerCount('player-death'),
      activeScenes: g.scene.getScenes(true).map(x => x.scene.key),
    };
  })()`, 'sample-' + mapId);
  return data;
}

async function bfsMap(mapId) {
  const data = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height;
    const walls = new Set(d.walls || []);
    const start = [(s.spawnX ?? d.playerStart.x), (s.spawnY ?? d.playerStart.y)];
    const pass = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !walls.has(d.tiles[y][x]);
    const seen = new Set(); const q = [start]; seen.add(start.join(','));
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const [nx, ny] = [x+dx, y+dy];
        if (pass(nx, ny) && !seen.has(nx+','+ny)) { seen.add(nx+','+ny); q.push([nx, ny]); }
      }
    }
    let walkable = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pass(x, y)) walkable++;
    const targets = [];
    const mark = (label, x, y) => { targets.push({ id: label, tile: [x, y], re: pass(x, y) && seen.has(x + ',' + y) }); };
    (d.objects || []).forEach((o, i) => {
      const t = o.type === 'exit' ? 'exit:' + o.target : (o.type === 'boss_arena' ? 'boss: ' + o.target : (o.type === 'final_boss' ? 'final:' + o.target : 'obj:' + o.id));
      mark(t, o.tileX, o.tileY);
    });
    (d.npcs || []).forEach((n, i) => mark('npc' + i, n.tileX, n.tileY));
    (d.letters || []).forEach((l, i) => mark('letter' + i, l.tileX, l.tileY));
    (d.enemies || []).forEach((e, i) => mark('enemy' + i, Math.floor(e.x), Math.floor(e.y)));
    return { reachable: seen.size, walkable, ratio: +(seen.size / walkable).toFixed(3), targets };
  })()`, 'bfs-' + mapId);
  return data;
}

async function walkTest(mapId) {
  // teleport to the nearest walkable tile around the map center, then move W and assert camera follows + player stays in view
  await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height;
    const walls = new Set(d.walls || []);
    let cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    const boundsOk = (x, y) => x >= 2 && x < W - 2 && y >= 2 && y < H - 2 && !walls.has(d.tiles[y][x]);
    for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (boundsOk(cx + dx, cy + dy)) { cx += dx; cy += dy; }
    }
    s.player.body.reset(cx * 16 + 8, cy * 16 + 12);
    s.player.x = cx * 16 + 8; s.player.y = cy * 16 + 12;
    return [cx, cy];
  })()`, 'center-' + mapId);
  await wait(200);
  const before = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const c = s.cameras.main; return [s.player.x, s.player.y, c.scrollX, c.scrollY, c.zoom]; })()`, 'walkbefore');
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'W' });
  await wait(700);
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'W' });
  await wait(150);
  const after = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const c = s.cameras.main;
    return { player: [Math.round(s.player.x), Math.round(s.player.y)], scroll: [Math.round(c.scrollX), Math.round(c.scrollY)], inView: s.player.x >= c.scrollX && s.player.x <= c.scrollX + 640 / c.zoom && s.player.y >= c.scrollY && s.player.y <= c.scrollY + 360 / c.zoom, zoom: c.zoom };
  })()`, 'walkafter');
  return { before, after, moved: after.player[1] < before[1], followedVert: after.scroll[1] !== before[3] };
}

async function borderCheck(mapId) {
  const edges = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height;
    const walls = new Set(d.walls || []);
    const pass = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !walls.has(d.tiles[y][x]);
    const find = (px, py) => {
      for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (pass(px + dx, py + dy)) return [px + dx, py + dy];
      }
      return null;
    };
    return {
      W, H,
      top: find(Math.floor(W / 2), 2),
      bottom: find(Math.floor(W / 2), H - 3),
      left: find(2, Math.floor(H / 2)),
      right: find(W - 3, Math.floor(H / 2)),
    };
  })()`, 'edges-' + mapId);
  const results = [];
  for (const label of ['top', 'bottom', 'left', 'right']) {
    const [tx, ty] = edges[label] || [null, null];
    if (tx == null) { results.push(label + ':no-walkable-tile'); continue; }
    await js(`(() => {
      const s = window.__game.scene.getScene('GameScene');
      s.player.body.reset(${tx} * 16 + 8, ${ty} * 16 + 12);
      s.player.x = ${tx} * 16 + 8; s.player.y = ${ty} * 16 + 12;
      return 1;
    })()`, 'edge-' + mapId + '-' + label);
    await wait(350);
    const st = await js(`(() => {
      const s = window.__game.scene.getScene('GameScene');
      const c = s.cameras.main;
      const zoom = c.zoom;
      const mw = s.currentMapData.width * 16, mh = s.currentMapData.height * 16;
      const cw = 640 / zoom, ch = 360 / zoom;
      return {
        inView: s.player.x >= c.scrollX && s.player.x <= c.scrollX + cw && s.player.y >= c.scrollY && s.player.y <= c.scrollY + ch,
        scrollOK: c.scrollX >= -0.5 && c.scrollX <= mw - cw + 0.5 && c.scrollY >= -0.5 && c.scrollY <= mh - ch + 0.5,
        scroll: [Math.round(c.scrollX), Math.round(c.scrollY)],
      };
    })()`, 'edgecheck-' + mapId + '-' + label);
    results.push(label + ':' + JSON.stringify(st));
  }
  return results;
}

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  const index = path.join(__dirname, '..', 'dist', 'index.html');

  win = new BrowserWindow({
    width: 1280, height: 720, show: true, x: -2000, y: 0,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.webContents.on('console-message', (_e, level, msg) => {
    if (level >= 2 && !/has-save/.test(String(msg))) errors.push(String(msg).slice(0, 180));
    log('  [r' + level + '] ' + String(msg).slice(0, 180));
  });

  await withT(win.loadFile(index), 30000, 'load');
  await js(`window.__errs=[]; window.addEventListener('error', e => window.__errs.push(String(e.message))); (()=>{ window.__game; return 1; })()`, 'hang');
  await boot();

  log('AUDIT scenes-registered:');
  const reg = await js(`JSON.stringify(window.__game.scene.getScenes(false).map(s => s.scene.key))`, 'registry');
  log('  ' + reg);

  const mapResults = [];
  for (const mapId of ALL_MAPS) {
    await startMap(mapId);
    const st = await sampleMap(mapId);
    if (!st.active) { mapResults.push(mapId + ': NOT ACTIVE'); log(mapId + ': NOT ACTIVE'); continue; }
    const bfs = await bfsMap(mapId);
    const walk = await walkTest(mapId);
    const borders = await borderCheck(mapId);
    const row = {
      map: mapId, zoom: st.zoom, view: st.view, mapPx: st.mapPx,
      fitsHoriz: st.fitsHoriz, fitsVert: st.fitsVert,
      playerInView: st.playerInView,
      scroll: st.scroll, bounds: st.bounds,
      bossBar: st.bossBar,
      deathListeners: st.deathListeners,
      activeScenes: st.activeScenes,
      reachable: bfs.reachable, walkable: bfs.walkable, ratio: bfs.ratio,
      targetsBad: (bfs.targets || []).filter(t => !t.re).map(t => t.id + '@' + t.tile),
      moved: walk.moved, followedVert: walk.followedVert,
      borders,
    };
    mapResults.push(row);
    log('AUDIT ' + JSON.stringify(row));
  }

  // ---- transitions: casa -> sendero (E on door), death/respawn, pause ----
  log('AUDIT transition casa->sendero:');
  await startMap('casa');
  await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.body.reset(3 * 16 + 8, 10 * 16 + 12);
    s.player.x = 3 * 16 + 8; s.player.y = 10 * 16 + 12;
    return 1;
  })()`, 'tdoor');
  await wait(200);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'E' });
  win.webContents.sendInputEvent({ type: 'char', keyCode: 'E' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'E' });
  await wait(1600);
  const t1 = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    return { map: s.currentMapId, player: [Math.round(s.player.x), Math.round(s.player.y)] };
  })()`, 't-casa-exit');
  log('  casa door -> ' + JSON.stringify(t1));

  log('AUDIT death/respawn:');
  await startMap('sendero_distancia');
  await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    s.player.takeDamage(999);
    return 1;
  })()`, 'kill');
  await wait(1800);
  const t2 = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    return { map: s.currentMapId, hp: s.player.hp, maxHP: s.player.maxHP, alive: !s._deathInProgress };
  })()`, 't-death');
  log('  death respawn -> ' + JSON.stringify(t2));

  log('AUDIT pause resume:');
  await js(`(() => { const g = window.__game; if (!g.scene.isActive('GameScene')) g.scene.start('GameScene', { map: 'lago_celos' }); return 1; })()`, 'ens-game');
  await wait(1800);
  await clearDialogsAndArm();
  await js(`(() => { const g = window.__game; const s = g.scene.getScene('GameScene'); s.scene.launch('PauseScene'); s.scene.pause(); return 1; })()`, 'pause');
  await wait(400);
  const t3 = await js(`(() => { const g = window.__game; return { pause: g.scene.isActive('PauseScene'), gamePaused: g.scene.isPaused('GameScene') }; })()`, 't-pause');
  await js(`(() => { const g = window.__game; const s = g.scene.getScene('GameScene'); s.scene.resume(); s.scene.stop('PauseScene'); return 1; })()`, 'resume');
  log('  pause -> ' + JSON.stringify(t3));

  // ---- boss HUD anchor check (boss_toxicidad) ----
  log('AUDIT boss hud anchor:');
  await startMap('boss_toxicidad');
  const t4 = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const b = s.currentBoss;
    const c = s.cameras.main;
    return {
      bossActive: !!b && !b.isDead,
      zoom: c.zoom,
      scroll: [c.scrollX, c.scrollY],
      barWorld: b ? [Math.round(b.hpBarBg.x), Math.round(b.hpBarBg.y)] : null,
      barExpected: [(c.scrollX + 320 / c.zoom), (c.scrollY + 20 / c.zoom)],
      hp: b ? b.hp : -1,
    };
  })()`, 't-boss');
  log('  boss -> ' + JSON.stringify(t4));

  // ---- dialogues: casa intro blocks movement ----
  log('AUDIT dialogue blocking:');
  await js(`window.__game.scene.start('GameScene', { map: 'casa' }); 0`, 'dlg-start');
  await wait(1400);
  const dlgBefore = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); return { active: s.isDialogActive, px: s.player.x, py: s.player.y }; })()`, 'dlg-before');
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'W' });
  await wait(600);
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'W' });
  const dlgAfter = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); return { px: s.player.x, py: s.player.y }; })()`, 'dlg-after');
  if (dlgBefore.active) {
    await clearDialogsAndArm();
  } else {
    await clearDialogsAndArm();
  }
  log('  dialog-block (movedY=' + (Math.round(dlgAfter.py) !== Math.round(dlgBefore.py)) + ' active=' + dlgBefore.active + ')');

  // ---- memory / final scenes ----
  log('AUDIT MemoryScene:');
  await js(`window.__game.scene.start('MemoryScene', { fragmentId: 'fragment_distancia', fragmentName: 'Test', returnMap: 'casa', returnX: 3, returnY: 11 }); 0`, 'mem-start');
  await wait(500);
  const t5 = await js(`(() => ({ mem: window.__game.scene.isActive('MemoryScene') }))()`, 'mem-active');
  log('  MemoryScene active=' + t5.mem);
  await wait(4500);
  const t6 = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); return { game: window.__game.scene.isActive('GameScene'), map: s ? s.currentMapId : '?' }; })()`, 'mem-return');
  log('  MemoryScene auto-return -> ' + JSON.stringify(t6));

  log('AUDIT FinalScene:');
  await js(`window.__game.scene.start('FinalScene', { final: true }); 0`, 'fin-start');
  await wait(600);
  const t7 = await js(`(() => ({ fin: window.__game.scene.isActive('FinalScene') }))()`, 'fin-active');
  log('  FinalScene active=' + t7.fin);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: ' ' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: ' ' });
  await wait(3200);
  const t8 = await js(`(() => ({ menu: window.__game.scene.isActive('MenuScene') }))()`, 'fin-return');
  log('  FinalScene skip -> menu=' + t8.menu);

  // ---- resolutions + fullscreen ---- 
  log('AUDIT resolutions:');
  for (const [w, h, name] of [[1366, 768, 'r1366'], [1600, 900, 'r1600'], [1920, 1080, 'r1920']]) {
    win.setSize(w, h);
    await wait(700);
    const r = await js(`(() => {
      const g = window.__game;
      const c = document.querySelector('canvas');
      const cr = c.getBoundingClientRect();
      const cam = g.scene.getScene('GameScene').cameras.main;
      return {
        window: [window.innerWidth, window.innerHeight],
        rect: [Math.round(cr.left), Math.round(cr.top), Math.round(cr.width), Math.round(cr.height)],
        zoom: cam.zoom,
        scroll: [cam.scrollX, cam.scrollY],
        view: [640 / cam.zoom, 360 / cam.zoom],
        playerInView: (p => p.x >= cam.scrollX && p.x <= cam.scrollX + 640 / cam.zoom && p.y >= cam.scrollY && p.y <= cam.scrollY + 360 / cam.zoom)(g.scene.getScene('GameScene').player),
      };
    })()`, 'res-' + name);
    log('  ' + name + ': ' + JSON.stringify(r));
  }

  log('AUDIT fullscreen F11:');
  await win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'F11' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'F11' });
  await wait(700);
  const fs1 = win.isFullScreen();
  log('  fullscreen=' + fs1);
  await win.setFullScreen(false);
  await wait(400);

  // ---- perf snapshot on lago ----
  log('AUDIT perf:');
  await js(`window.__game.scene.start('GameScene', { map: 'lago_celos' }); 0`, 'perf-start');
  await wait(1800);
  await clearDialogsAndArm();
  await wait(1500);
  const perf = await js(`(() => {
    const g = window.__game;
    const s = g.scene.getScene('GameScene');
    return {
      fps: Math.round(g.loop.actualFps),
      activeScenes: g.scene.getScenes(true).length,
      mapObjects: s.children.list.length,
      dies: s.events.listenerCount('player-death'),
      asBytes: 0,
    };
  })()`, 'perf-snap');
  log('  lago perf: ' + JSON.stringify(perf));

  const pageErrs = await js(`JSON.stringify(window.__errs || [])`, 'geterrs');
  log('AUDIT renderer-errors: ' + pageErrs);
  log('AUDIT console-errors (' + errors.length + '):');
  errors.forEach(e => log('  ERR ' + e));

  const badMaps = mapResults.filter(r => (r.mapPx[0] > r.view[0] && !r.fitsHoriz) || (r.mapPx[1] > r.view[1] && !r.fitsVert) || !r.playerInView || r.deathListeners > 1 || r.targetsBad.length > 0 || (r.bossBar && r.bossBar.length && Math.abs(r.bossBar[0] - (r.scroll[0] + 320 / r.zoom)) > 2) || (r.bossBar && Math.abs(r.bossBar[1] - (r.scroll[1] + 20 / r.zoom)) > 2));
  log('AUDIT badMaps=' + JSON.stringify(badMaps.map(r => r.map)));

  log('[end]');
  win.destroy();
  app.exit(0);
}

app.whenReady().then(main).catch(e => { log('FATAL ' + (e && e.stack || e)); app.exit(1); });