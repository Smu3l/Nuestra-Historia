const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'verify-out.txt');
const SHOTS = path.join(__dirname, 'verify-shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);

let win;
async function js(code, label, timeout) {
  return withT(win.webContents.executeJavaScript(code), timeout || 10000, label);
}
async function shot(name) {
  try {
    fs.writeFileSync(path.join(SHOTS, name + '.png'), await win.webContents.capturePage().then(i => i.toPNG()));
  } catch (e) { log('  shot FAIL ' + name + ': ' + e.message); }
}

async function boot(w, h) {
  win = new BrowserWindow({
    width: w, height: h, show: true, x: -4000, y: 0,
    frame: false,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  await withT(win.loadFile(index), 30000, 'load');
  await js(`1`, 'ping');
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await wait(400);
    try {
      if (await js(`!!(window.__game && window.__game.scene.getScenes(true).some(s => s.scene.key === 'MenuScene'))`, 'poll')) { ok = true; break; }
    } catch (e) { /* retry */ }
  }
  log('boot=' + ok);
  return ok;
}

async function goMap(mapId) {
  await js(`window.__game.scene.start('GameScene', { map: '${mapId}' }); 0`, 'go');
  await wait(1500);
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); if (s.isDialogActive && s.dialogueSystem.hide) s.dialogueSystem.hide(); if (s.player) { s.player.invincible = true; s.player.hp = s.player.maxHP; } return 1; })()`, 'arm');
  await wait(300);
}

async function keyDown(k) { win.webContents.sendInputEvent({ type: 'keyDown', keyCode: k }); }
async function keyUp(k) { win.webContents.sendInputEvent({ type: 'keyUp', keyCode: k }); }

async function snapshot(label) {
  const r = await js(`(() => {
    const g = window.__game, s = g.scene.getScene('GameScene');
    if (!s || !s.sys.isActive()) return null;
    const cam = s.cameras.main, p = s.player, d = s.currentMapData;
    const zoom = cam.zoom, vw = 640 / zoom, vh = 360 / zoom;
    return {
      map: s.currentMapId,
      scroll: [+(cam.scrollX).toFixed(1), +(cam.scrollY).toFixed(1)],
      player: p ? [Math.round(p.x), Math.round(p.y)] : null,
      inView: p && cam.scrollX <= p.x && p.x <= cam.scrollX + vw && cam.scrollY <= p.y && p.y <= cam.scrollY + vh,
      viewSize: [vw, vh],
      mapPx: [d.width * 16, d.height * 16],
      zoom,
    };
  })()`, label);
  return r;
}

async function walkAndSample(key, durationMs, sampleInterval) {
  const samples = [];
  await keyDown(key);
  const t0 = Date.now();
  while (Date.now() - t0 < durationMs) {
    await wait(sampleInterval);
    const s = await snapshot('ws');
    if (s) samples.push(s);
  }
  await keyUp(key);
  await wait(100);
  return samples;
}

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  log('=== VERIFICACION VISUAL v2 ===');

  const disp = require('electron').screen.getPrimaryDisplay();
  log('display ' + JSON.stringify(disp.workArea));

  await boot(1920, 1080);
  win.setFullScreen(true);
  await wait(800);

  // --- CASA ---
  log('\n--- CASA ---');
  await goMap('casa');
  let s = await snapshot('casa');
  log('casa: ' + JSON.stringify(s));
  await shot('01-casa');

  // dialog
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); s.dialogueSystem.show(['Prueba de caja de diálogo: texto de prueba centrado en pantalla.']); return 1; })()`, 'dlg');
  await wait(400);
  const dlgBox = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const b = s.dialogueSystem.container.getBounds(); return { bx: b.x, by: b.y, bw: b.width, bh: b.height, cx: b.x + b.width/2, cy: b.y + b.height/2, scX: s.dialogueSystem.container.scaleX, scY: s.dialogueSystem.container.scaleY }; })()`, 'dlgbox');
  log('dialogBox: ' + JSON.stringify(dlgBox));
  await shot('02-dialog');
  await js(`window.__game.scene.getScene('GameScene').dialogueSystem.hide(); 1`, 'dlgH');
  await wait(200);

  // --- SENDERO: camera follow walking ---
  log('\n--- SENDERO: camera follow ---');
  await goMap('sendero_distancia');

  // walk to center first
  s = await snapshot('sendero-start');
  log('sendero start: ' + JSON.stringify(s));
  await shot('03-sendero-start');

  // Walk LEFT for 2s from spawn (should move camera left)
  log('walking LEFT 2s...');
  const walkL = await walkAndSample('A', 2000, 100);
  if (walkL.length >= 2) {
    const first = walkL[0], last = walkL[walkL.length - 1];
    const scrollDX = last.scroll[0] - first.scroll[0];
    const playerDX = last.player[0] - first.player[0];
    log('walkL: scrollDX=' + scrollDX.toFixed(1) + ' playerDX=' + playerDX + ' firstScroll=' + JSON.stringify(first.scroll) + ' lastScroll=' + JSON.stringify(last.scroll));
  }
  await shot('04-sendero-walkL');

  // Walk UP for 2s (camera should follow up)
  log('walking UP 2s...');
  const walkU = await walkAndSample('W', 2000, 100);
  if (walkU.length >= 2) {
    const first = walkU[0], last = walkU[walkU.length - 1];
    const scrollDY = last.scroll[1] - first.scroll[1];
    const playerDY = last.player[1] - first.player[1];
    log('walkU: scrollDY=' + scrollDY.toFixed(1) + ' playerDY=' + playerDY + ' firstScroll=' + JSON.stringify(first.scroll) + ' lastScroll=' + JSON.stringify(last.scroll));
  }
  await shot('05-sendero-walkU');

  // Walk RIGHT for 2s
  log('walking RIGHT 2s...');
  const walkR = await walkAndSample('D', 2000, 100);
  if (walkR.length >= 2) {
    const first = walkR[0], last = walkR[walkR.length - 1];
    const scrollDX = last.scroll[0] - first.scroll[0];
    log('walkR: scrollDX=' + scrollDX.toFixed(1) + ' firstScroll=' + JSON.stringify(first.scroll) + ' lastScroll=' + JSON.stringify(last.scroll));
  }

  // Walk DOWN for 2s
  log('walking DOWN 2s...');
  const walkD = await walkAndSample('S', 2000, 100);
  if (walkD.length >= 2) {
    const first = walkD[0], last = walkD[walkD.length - 1];
    const scrollDY = last.scroll[1] - first.scroll[1];
    log('walkD: scrollDY=' + scrollDY.toFixed(1) + ' firstScroll=' + JSON.stringify(first.scroll) + ' lastScroll=' + JSON.stringify(last.scroll));
  }
  await shot('06-sendero-walkD');

  // Check camera clamp at edges (after walking to edge, camera should stop)
  s = await snapshot('after-walk');
  log('after-all-walks: ' + JSON.stringify(s));
  const clampX = s.scroll[0], clampY = s.scroll[1];
  const maxX = s.mapPx[0] - s.viewSize[0];
  const maxY = s.mapPx[1] - s.viewSize[1];
  const clampCheck = {
    scrollX_clamped: clampX >= -0.5 && clampX <= maxX + 0.5,
    scrollY_clamped: clampY >= -0.5 && clampY <= maxY + 0.5,
    playerInView: s.inView,
  };
  log('edgeClamp: ' + JSON.stringify(clampCheck));
  await shot('07-sendero-edge');

  // --- BOSS ARENA ---
  log('\n--- BOSS ARENA ---');
  await goMap('boss_distancia');
  s = await snapshot('boss-dist');
  const bossInfo = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const b = s.currentBoss; return { active: !!b && !b.isDead, hp: b ? b.hp : -1, name: b ? b.nameText.text : null, barX: b ? Math.round(b.hpBarBg.x) : null, barY: b ? Math.round(b.hpBarBg.y) : null, barScale: b ? b.hpBarBg.scaleX : null }; })()`, 'bi');
  log('boss: ' + JSON.stringify({ scene: s, boss: bossInfo }));
  await shot('08-boss-distancia');

  // --- TOXICIDAD ARENA ---
  await goMap('boss_toxicidad');
  const boss2 = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const b = s.currentBoss; return { hp: b ? b.hp : -1, name: b ? b.nameText.text : null }; })()`, 'bi2');
  log('bossToxicidad: ' + JSON.stringify(boss2));
  await shot('09-boss-toxicidad');

  // --- TRANSITIONS ---
  log('\n--- TRANSITIONS ---');
  // casa -> sendero via door
  await goMap('casa');
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const door = s.interactables.find(o => o.interactType === 'exit' && o.targetMap === 'sendero_distancia'); if (door) { s.player.setPosition(door.x, door.y); } return door ? 'found' : 'not-found'; })()`, 'find-door');
  await wait(200);
  await keyDown('E'); await wait(100); await keyUp('E');
  await wait(1500);
  s = await snapshot('after-door');
  log('casa->sendero: ' + JSON.stringify(s));

  // --- DEATH/RESPAWN ---
  log('\n--- DEATH/RESPAWN ---');
  await goMap('sendero_distancia');
  await js(`(() => { const s = window.__game.scene.getScene('GameScene'); s.player.takeDamage(999); return 1; })()`, 'kill');
  await wait(2500);
  s = await snapshot('after-death');
  log('death/respawn: ' + JSON.stringify(s));

  // --- HUD positions during camera movement ---
  log('\n--- HUD FIXED CHECK ---');
  await goMap('sendero_distancia');
  const hudSnap1 = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const cam = s.cameras.main; return { scroll: [cam.scrollX, cam.scrollY], hearts: { x: s.hud.heartContainer.x, y: s.hud.heartContainer.y }, mapName: { x: s.hud.mapNameText.x, y: s.hud.mapNameText.y }, frag: { x: s.hud.fragmentContainer.x, y: s.hud.fragmentContainer.y } }; })()`, 'hud1');
  await walkAndSample('D', 1200, 100);
  const hudSnap2 = await js(`(() => { const s = window.__game.scene.getScene('GameScene'); const cam = s.cameras.main; return { scroll: [cam.scrollX, cam.scrollY], hearts: { x: s.hud.heartContainer.x, y: s.hud.heartContainer.y }, mapName: { x: s.hud.mapNameText.x, y: s.hud.mapNameText.y }, frag: { x: s.hud.fragmentContainer.x, y: s.hud.fragmentContainer.y } }; })()`, 'hud2');
  const hudDeltaX = hudSnap2.hearts.x - hudSnap1.hearts.x;
  const hudDeltaY = hudSnap2.hearts.y - hudSnap1.hearts.y;
  const scrollDeltaX = hudSnap2.scroll[0] - hudSnap1.scroll[0];
  log('hud1: ' + JSON.stringify(hudSnap1));
  log('hud2: ' + JSON.stringify(hudSnap2));
  log('hud follow scroll: heartsDX=' + hudDeltaX.toFixed(1) + ' heartsDY=' + hudDeltaY.toFixed(1) + ' scrollDX=' + scrollDeltaX.toFixed(1));

  // --- F11 ---
  log('\n--- F11 ---');
  await keyDown('F11'); await wait(100); await keyUp('F11');
  await wait(600);
  const fsState = win.isFullScreen();
  const fsGeom = await js(`(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height], win: [window.innerWidth, window.innerHeight] }; })()`, 'fs');
  log('F11: fs=' + fsState + ' ' + JSON.stringify(fsGeom));
  await shot('10-fullscreen');

  // exit fullscreen
  win.setFullScreen(false);
  await wait(600);
  const exitGeom = await js(`(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], win: [window.innerWidth, window.innerHeight], centered: Math.abs(r.left - (window.innerWidth - r.width) / 2) < 3 }; })()`, 'efs');
  log('afterF11: ' + JSON.stringify(exitGeom));

  // --- PIXEL ART CHECK ---
  log('\n--- PIXEL ART CHECK ---');
  await goMap('sendero_distancia');
  await walkAndSample('W', 800, 100);
  const pixelCheck = await js(`(() => {
    const c = document.querySelector('canvas');
    const cp = document.createElement('canvas');
    cp.width = c.width; cp.height = c.height;
    const cx = cp.getContext('2d');
    cx.drawImage(c, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height;
    // sample 20 horizontal scanlines at different heights, count distinct color transitions
    let totalTransitions = 0;
    for (let y = 20; y < H; y += 18) {
      let prev = null, transitions = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const c = d[i] + ',' + d[i+1] + ',' + d[i+2];
        if (prev !== null && c !== prev) transitions++;
        prev = c;
      }
      totalTransitions += transitions;
    }
    // check bg band columns/rows
    const isBg = (x, y) => { const i = (y*W+x)*4; return d[i]===10 && d[i+1]===10 && d[i+2]===26; };
    let bgL=0, bgR=0, bgT=0, bgB=0;
    for (let x=0;x<W;x++){let ok=true;for(let y=0;y<H;y+=2){if(!isBg(x,y)){ok=false;break;}}if(ok)bgL++;else break;}
    for (let x=W-1;x>=0;x--){let ok=true;for(let y=0;y<H;y+=2){if(!isBg(x,y)){ok=false;break;}}if(ok)bgR++;else break;}
    for (let y=0;y<H;y++){let ok=true;for(let x=0;x<W;x+=2){if(!isBg(x,y)){ok=false;break;}}if(ok)bgT++;else break;}
    for (let y=H-1;y>=0;y--){let ok=true;for(let x=0;x<W;x+=2){if(!isBg(x,y)){ok=false;break;}}if(ok)bgB++;else break;}
    return { transitions: totalTransitions, avgPerLine: +(totalTransitions/20).toFixed(1), bgBand: [bgL,bgR,bgT,bgB], W, H };
  })()`, 'pixel');
  log('pixelCheck: ' + JSON.stringify(pixelCheck));
  await shot('11-pixel-check');

  // --- ERRORS ---
  const errs = await js(`JSON.stringify(window.__errs || [])`, 'errs');
  log('\nERRORS: ' + errs);
  log('[end]');
  app.exit(0);
}

app.whenReady().then(main).catch(e => { log('FATAL ' + (e && e.stack || e)); app.exit(1); });