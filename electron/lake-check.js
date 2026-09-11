const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'Maps.js'), 'utf8');
const m = src.match(/function generateLakeMap\(\) \{\s*return parseMap\(\[([\s\S]*?)\]\);\s*\}/);
if (!m) { console.error('generateLakeMap block not found'); process.exit(1); }
const rows = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);

const W = 30, H = 20;
let ok = true;
rows.forEach((r, i) => {
  if (r.length !== W) { console.error(`ROW ${i} length ${r.length} != 30`); ok = false; }
  if (r[0] !== 'T' || r[W - 1] !== 'T') { console.error(`ROW ${i} border not T: ${r[0]}...${r[W - 1]}`); ok = false; }
});
if (rows.length !== H) { console.error(`expected ${H} rows, got ${rows.length}`); ok = false; }
if (!ok) process.exit(1);
console.log('Row lengths OK (all 30, bordered).');

const CODES = { '.': 0, '~': 1, 'T': 2, 'R': 3, '#': 4, 'D': 5 };
const map = rows.map(r => r.split('').map(c => CODES[c]));
const WALLS = new Set([2, 3, 1]);
const passable = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !WALLS.has(map[y][x]);

function bfs(sx, sy) {
  const seen = new Set([`${sx},${sy}`]);
  const dist = new Map([[`${sx},${sy}`, 0]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    const d = dist.get(`${x},${y}`);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const k = `${x+dx},${y+dy}`;
      if (passable(x+dx, y+dy) && !seen.has(k)) {
        seen.add(k); dist.set(k, d+1); q.push([x+dx, y+dy]);
      }
    }
  }
  return { seen, dist };
}

const { seen, dist } = bfs(1, 10);
let totalPassable = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (passable(x, y)) totalPassable++;
console.log(`Reachable from (1,10): ${seen.size}/${totalPassable} passable (${(100*seen.size/totalPassable).toFixed(1)}%).`);

const targets = {
  'boss_arena (27,10)': [27, 10],
  'boss_arena adjacents': [[27,9],[27,11],[26,10],[28,10]],
  'sign (5,5)': [5, 5],
  'npc (7,12)': [7, 12],
  'letter (23,3)': [23, 3],
  'enemy1 (10,6)': [10, 6],
  'enemy1 patrol2 (14,6)': [14, 6],
  'enemy2 (22,12)': [22, 12],
  'enemy2 patrol2 (26,12)': [26, 12],
};
let allOk = true;
for (const [name, c] of Object.entries(targets)) {
  const cands = Array.isArray(c[0]) ? c : [c];
  for (const [x, y] of cands) {
    const r = passable(x, y) && dist.has(`${x},${y}`);
    if (!r) allOk = false;
    console.log(`  ${name}: ${r ? 'REACHABLE dist=' + dist.get(`${x},${y}`) : 'NOT REACHABLE'}`);
  }
}
console.log(allOk ? 'ALL TARGETS REACHABLE' : 'SOME TARGETS BLOCKED');

const legend = { 0: '.', 1: '~', 2: 'T', 3: 'R', 4: '#', 5: 'D' };
for (let y = 0; y < H; y++) {
  let row = '';
  for (let x = 0; x < W; x++) row += (x === 27 && y === 10) ? 'B' : legend[map[y][x]];
  console.log(row);
}