const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'tree-out.txt');
const log = l => { fs.appendFileSync(OUT, l + '\n'); console.log(l); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, tag) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + tag)), ms))]);

async function main() {
  fs.writeFileSync(OUT, '[start]\n');
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  const win = new BrowserWindow({
    width: 960, height: 540, show: true, x: -2000, y: 0,
    webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  await withT(win.loadFile(index), 30000, 'load');

  const run = js => win.webContents.executeJavaScript(js).catch(e => 'ERR: ' + e.message);
  for (let i = 0; i < 40; i++) {
    await wait(400);
    if (await run(`window.__game && window.__game.scene.isActive('MenuScene')`) === true) break;
  }

  await run(`window.__game.scene.start('GameScene', { map: 'lago_celos', spawnX: 1, spawnY: 10 }); true`);
  await wait(900);

  // 1) body verification
  const bodyInfo = JSON.parse(await run(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height;
    const walls = new Set(d.walls);
    // find interior tree (not on border, with passable above AND left)
    const interior = [];
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (d.tiles[ty][tx] === 2 && !walls.has(d.tiles[ty-1][tx]) && !walls.has(d.tiles[ty][tx-1])) {
        interior.push([tx, ty]);
      }
    }
    if (!interior.length) return JSON.stringify({ error: 'no interior trees found' });
    const [tx, ty] = interior[0];
    const tile = s.mapTiles.find(t => Math.floor((t.x-8)/16) === tx && Math.floor((t.y-8)/16) === ty);
    return JSON.stringify({
      tree: [tx, ty],
      frame: [tile.frame.realWidth, tile.frame.realHeight],
      body: { w: tile.body.width, h: tile.body.height, ox: tile.body.offset.x, oy: tile.body.offset.y },
      allInteriorTrees: interior.length,
    });
  })()`));
  log('BODY ' + JSON.stringify(bodyInfo, null, 2));

  if (bodyInfo.error) { log('[end-err]'); win.destroy(); app.exit(0); return; }

  // 2) place player at canopy zone (above trunk) — body should NOT overlap trunk → not blocked
  const canopyResult = JSON.parse(await run(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height, walls = new Set(d.walls);
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (d.tiles[ty][tx] === 2 && !walls.has(d.tiles[ty][tx-1])) {
        const trunkTop = ty * 16 + 10;
        const px = tx * 16 + 8;
        // place player so body bottom is 4px above trunk top
        const canopyY = trunkTop - 16;  // body bottom = canopyY + 12 = trunkTop - 4
        s.player.body.reset(px - 20, canopyY);
        return JSON.stringify({
          tree: [tx, ty], canopyY,
          playerBodyBottom: canopyY + 12, trunkTop,
          gap: trunkTop - (canopyY + 12),
          bodyOverlapsTrunk: (canopyY + 12) > trunkTop,
        });
      }
    }
    return JSON.stringify({ error: 'not found' });
  })()`));
  log('CANOPY-ZONE ' + JSON.stringify(canopyResult, null, 2));

  // 3) place player at trunk zone — body SHOULD overlap trunk
  const trunkResult = JSON.parse(await run(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    const d = s.currentMapData;
    const W = d.width, H = d.height, walls = new Set(d.walls);
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (d.tiles[ty][tx] === 2 && !walls.has(d.tiles[ty][tx-1])) {
        const trunkTop = ty * 16 + 10;
        const px = tx * 16 + 8;
        // place player so body bottom is 4px into trunk
        const trunkY = trunkTop - 16 + 8;  // body bottom = trunkTop + 4 → overlaps trunk
        s.player.body.reset(px - 20, trunkY);
        return JSON.stringify({
          tree: [tx, ty], trunkY,
          playerBodyBottom: trunkY + 12, trunkTop,
          bodyOverlapsTrunk: (trunkY + 12) > trunkTop,
          overlapPx: (trunkY + 12) - trunkTop,
        });
      }
    }
    return JSON.stringify({ error: 'not found' });
  })()`));
  log('TRUNK-ZONE ' + JSON.stringify(trunkResult, null, 2));

  log('[end]');
  win.destroy();
  app.exit(0);
}

app.whenReady().then(main).catch(e => { log('FATAL ' + (e && e.stack || e)); app.exit(1); });