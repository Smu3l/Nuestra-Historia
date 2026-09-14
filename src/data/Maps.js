export const Maps = {
  casa: {
    name: 'Casa de MarÃ­a JosÃ©',
    width: 20,
    height: 15,
    bgColor: 0x2d1b69,
    playerStart: { x: 10, y: 10 },
    tiles: [
      [15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,18,16,16,16,16,16,16,16,16,16,19,16,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,16,16,16,17,16,16,16,16,16,16,16,16,16,21,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,20,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,22,16,16,16,16,16,16,16,16,16,16,16,16,16,23,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,16,15],
      [15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15],
    ],
    tileNames: { 0: null, 1: 'tile_grass', 2: 'tile_dirt', 3: 'tile_stone', 4: 'tile_water', 5: 'tile_sand', 15: 'tile_wall', 16: 'tile_floor', 17: 'tile_bed', 18: 'tile_desk', 19: 'tile_mirror', 20: 'tile_photo', 21: 'tile_letter', 22: 'tile_door', 23: 'tile_window' },
    walls: [15],
    objects: [
      { tileX: 6, tileY: 5, type: 'interact', id: 'casa_bed', sprite: 'tile_bed' },
      { tileX: 3, tileY: 3, type: 'interact', id: 'casa_desk', sprite: 'tile_desk' },
      { tileX: 13, tileY: 3, type: 'interact', id: 'casa_mirror', sprite: 'tile_mirror' },
      { tileX: 14, tileY: 7, type: 'interact', id: 'casa_photo', sprite: 'tile_photo' },
      { tileX: 16, tileY: 5, type: 'interact', id: 'casa_computer', sprite: 'tile_desk' },
      { tileX: 2, tileY: 9, type: 'interact', id: 'casa_letter_samuel', sprite: 'tile_letter' },
      { tileX: 3, tileY: 10, type: 'exit', target: 'sendero_distancia', spawnX: 40, spawnY: 42 },
      { tileX: 17, tileY: 9, type: 'interact', id: 'casa_window', sprite: 'tile_lantern' },
    ],
    npcs: [
      { tileX: 8, tileY: 8, sprite: 'npc_elder', dialogue: 'npc_house_friend', name: 'Amiga' }
    ],
    enemies: [],
    boss: null,
    letters: [],
    triggers: [{ once: true, id: 'casa_intro', condition: 'first_visit', dialogue: 'casa_tutorial' }],
  },

  sendero_distancia: {
    name: 'El Sendero de la Distancia',
    width: 80,
    height: 45,
    bgColor: 0x2d3436,
    playerStart: { x: 40, y: 42 },
    tiles: generateDistanceMap(),
    tileNames: { 0: 'tile_grass', 1: 'tile_dirt', 2: 'tile_stone', 3: 'tile_water', 4: 'tile_tree', 5: 'tile_bridge', 6: 'tile_rock', 7: 'tile_flowers', 8: 'tile_sign' },
    walls: [4, 3, 6],
    objects: [
      { tileX: 40, tileY: 41, type: 'interact', id: 'distancia_intro', sprite: 'tile_sign', dialogue: 'distancia_intro' },
      { tileX: 72, tileY: 8, type: 'boss_arena', id: 'boss_distancia', target: 'boss_distancia' },
      { tileX: 8, tileY: 6, type: 'exit', target: 'casa', spawnX: 3, spawnY: 11 },
    ],
    npcs: [
      { tileX: 30, tileY: 19, sprite: 'npc_wanderer', dialogue: 'distancia_npc1', name: 'Caminante' },
      { tileX: 54, tileY: 36, sprite: 'npc_wanderer', dialogue: 'distancia_npc2', name: 'Caminante Solitario' },
    ],
    enemies: [
      { type: 'enemy_shadow', x: 34, y: 12, hp: 2, damage: 1, patrol: [{ x: 34, y: 12 }, { x: 38, y: 12 }] },
      { type: 'enemy_echo', x: 36, y: 28, hp: 2, damage: 1, patrol: [{ x: 36, y: 28 }, { x: 40, y: 28 }] },
      { type: 'enemy_shadow', x: 48, y: 30, hp: 3, damage: 1, patrol: [{ x: 48, y: 30 }, { x: 52, y: 30 }] },
    ],
    boss: null,
    letters: [
      { tileX: 16, tileY: 40, id: 'letter_1' },
    ],
  },

  boss_distancia: {
    name: 'Arena de la Distancia',
    width: 20,
    height: 15,
    bgColor: 0x1a1a2e,
    playerStart: { x: 10, y: 12 },
    tiles: generateBossArena(),
    tileNames: { 0: 'tile_stone', 1: 'tile_dark', 2: 'tile_wall' },
    walls: [2],
    objects: [],
    npcs: [],
    enemies: [],
    boss: {
      type: 'boss_distancia',
      hp: 12,
      damage: 1,
      name: 'Distancia',
      dialogue_intro: 'distancia_boss_intro',
      dialogue_defeat: 'distancia_boss_defeat',
      fragment: 'fragment_distancia',
      fragmentName: 'Fragmento de la Distancia',
    },
    letters: [],
  },

  pantano_toxicidad: {
    name: 'El Pantano de la Toxicidad',
    width: 80,
    height: 45,
    bgColor: 0x1a2a1a,
    playerStart: { x: 16, y: 42 },
    tiles: generateSwampMap(),
    tileNames: { 0: 'tile_marsh', 1: 'tile_marsh_water', 2: 'tile_tree', 3: 'tile_rock', 4: 'tile_dirt', 5: 'tile_fog' },
    walls: [2, 3],
    objects: [
      { tileX: 16, tileY: 38, type: 'interact', id: 'toxicidad_intro', sprite: 'tile_sign', dialogue: 'toxicidad_intro' },
      { tileX: 72, tileY: 10, type: 'boss_arena', id: 'boss_toxicidad', target: 'boss_toxicidad' },
    ],
    npcs: [
      { tileX: 33, tileY: 24, sprite: 'npc_sage', dialogue: 'toxicidad_npc1', name: 'Alma Perdida' },
    ],
    enemies: [
      { type: 'enemy_crawler', x: 20, y: 18, hp: 3, damage: 1, patrol: [{ x: 20, y: 18 }, { x: 24, y: 18 }] },
      { type: 'enemy_fog', x: 40, y: 28, hp: 2, damage: 1, patrol: [{ x: 40, y: 28 }, { x: 44, y: 28 }] },
      { type: 'enemy_crawler', x: 56, y: 12, hp: 3, damage: 1, patrol: [{ x: 56, y: 12 }, { x: 60, y: 12 }] },
    ],
    boss: null,
    letters: [
      { tileX: 66, tileY: 42, id: 'letter_2' },
    ],
  },

  boss_toxicidad: {
    name: 'Arena de la Toxicidad',
    width: 20,
    height: 15,
    bgColor: 0x0d1f0d,
    playerStart: { x: 10, y: 12 },
    tiles: generateBossArena(),
    tileNames: { 0: 'tile_marsh', 1: 'tile_marsh_water', 2: 'tile_wall' },
    walls: [2],
    objects: [],
    npcs: [],
    enemies: [],
    boss: {
      type: 'boss_toxicidad',
      hp: 14,
      damage: 1,
      name: 'Toxicidad',
      dialogue_intro: 'toxicidad_boss_intro',
      dialogue_defeat: 'toxicidad_boss_defeat',
      fragment: 'fragment_toxicidad',
      fragmentName: 'Fragmento de la ComprensiÃ³n',
    },
    letters: [],
  },

  valle_desinteres: {
    name: 'El Valle del DesinterÃ©s',
    width: 80,
    height: 45,
    bgColor: 0x4a4a4a,
    playerStart: { x: 6, y: 41 },
    tiles: generateValleyMap(),
    tileNames: { 0: 'tile_dirt', 1: 'tile_stone', 2: 'tile_brick', 3: 'tile_wood', 4: 'tile_wall', 5: 'tile_door' },
    walls: [4],
    objects: [
      { tileX: 12, tileY: 40, type: 'interact', id: 'desinteres_intro', sprite: 'tile_sign', dialogue: 'desinteres_intro' },
      { tileX: 72, tileY: 10, type: 'boss_arena', id: 'boss_desinteres', target: 'boss_desinteres' },
    ],
    npcs: [
      { tileX: 40, tileY: 22, sprite: 'npc_child', dialogue: 'desinteres_npc1', name: 'EspÃ­ritu' },
    ],
    enemies: [
      { type: 'enemy_puppet', x: 30, y: 6, hp: 3, damage: 1, patrol: [{ x: 30, y: 6 }, { x: 34, y: 6 }] },
      { type: 'enemy_void', x: 58, y: 34, hp: 2, damage: 1, patrol: [{ x: 58, y: 34 }, { x: 62, y: 34 }] },
    ],
    boss: null,
    letters: [
      { tileX: 64, tileY: 42, id: 'letter_3' },
    ],
  },

  boss_desinteres: {
    name: 'Arena del DesinterÃ©s',
    width: 20,
    height: 15,
    bgColor: 0x2a2a2a,
    playerStart: { x: 10, y: 12 },
    tiles: generateBossArena(),
    tileNames: { 0: 'tile_dirt', 1: 'tile_stone', 2: 'tile_wall' },
    walls: [2],
    objects: [],
    npcs: [],
    enemies: [],
    boss: {
      type: 'boss_desinteres',
      hp: 14,
      damage: 1,
      name: 'DesinterÃ©s',
      dialogue_intro: 'desinteres_boss_intro',
      dialogue_defeat: 'desinteres_boss_defeat',
      fragment: 'fragment_desinteres',
      fragmentName: 'Fragmento de la AtenciÃ³n',
    },
    letters: [],
  },

  montanas_inseguridad: {
    name: 'Las MontaÃ±as de la Inseguridad',
    width: 80,
    height: 45,
    bgColor: 0x2d1b69,
    playerStart: { x: 8, y: 42 },
    tiles: generateMountainMap(),
    tileNames: { 0: 'tile_stone', 1: 'tile_snow', 2: 'tile_rock', 3: 'tile_water', 4: 'tile_tree', 5: 'tile_cabin_wall' },
    walls: [2, 5],
    objects: [
      { tileX: 12, tileY: 40, type: 'interact', id: 'inseguridad_intro', sprite: 'tile_sign', dialogue: 'inseguridad_intro' },
      { tileX: 16, tileY: 24, type: 'interact', id: 'inseguridad_cabin', sprite: 'tile_cabin_wall', dialogue: 'inseguridad_letter_cabin' },
      { tileX: 72, tileY: 10, type: 'boss_arena', id: 'boss_inseguridad', target: 'boss_inseguridad' },
    ],
    npcs: [
      { tileX: 24, tileY: 30, sprite: 'npc_elder', dialogue: 'inseguridad_npc1', name: 'ErmitaÃ±o' },
    ],
    enemies: [
      { type: 'enemy_shadow', x: 16, y: 16, hp: 3, damage: 1, patrol: [{ x: 16, y: 16 }, { x: 16, y: 20 }] },
      { type: 'enemy_void', x: 48, y: 26, hp: 3, damage: 1, patrol: [{ x: 48, y: 26 }, { x: 48, y: 30 }] },
    ],
    boss: null,
    letters: [
      { tileX: 60, tileY: 42, id: 'letter_4' },
    ],
  },

  boss_inseguridad: {
    name: 'Arena de la Inseguridad',
    width: 20,
    height: 15,
    bgColor: 0x1a0d2e,
    playerStart: { x: 10, y: 12 },
    tiles: generateBossArena(),
    tileNames: { 0: 'tile_stone', 1: 'tile_snow', 2: 'tile_wall' },
    walls: [2],
    objects: [],
    npcs: [],
    enemies: [],
    boss: {
      type: 'boss_inseguridad',
      hp: 16,
      damage: 1,
      name: 'Inseguridad',
      dialogue_intro: 'inseguridad_boss_intro',
      dialogue_defeat: 'inseguridad_boss_defeat',
      fragment: 'fragment_inseguridad',
      fragmentName: 'Fragmento de Confianza',
    },
    letters: [],
  },

  lago_celos: {
    name: 'El Lago de los Celos',
    width: 80,
    height: 45,
    bgColor: 0x0a1628,
    playerStart: { x: 38, y: 41 },
    tiles: generateLakeMap(),
    tileNames: { 0: 'tile_grass', 1: 'tile_water', 2: 'tile_tree', 3: 'tile_rock', 4: 'tile_island', 5: 'tile_dark' },
    walls: [2, 3, 1],
    wallBodies: { 2: { width: 6, height: 6, offsetX: 5, offsetY: 10 } },
    objects: [
      { tileX: 38, tileY: 38, type: 'interact', id: 'celos_intro', sprite: 'tile_sign', dialogue: 'celos_intro' },
      { tileX: 74, tileY: 18, type: 'boss_arena', id: 'boss_celos', target: 'boss_celos' },
    ],
    npcs: [
      { tileX: 36, tileY: 18, sprite: 'npc_wanderer', dialogue: 'celos_npc1', name: 'GuardiÃ¡n' },
    ],
    enemies: [
      { type: 'enemy_shadow', x: 18, y: 36, hp: 3, damage: 1, patrol: [{ x: 18, y: 36 }, { x: 22, y: 36 }] },
      { type: 'enemy_echo', x: 58, y: 12, hp: 3, damage: 1, patrol: [{ x: 58, y: 12 }, { x: 62, y: 12 }] },
    ],
    boss: null,
    letters: [
      { tileX: 10, tileY: 10, id: 'letter_5' },
    ],
  },

  boss_celos: {
    name: 'Arena de los Celos',
    width: 20,
    height: 15,
    bgColor: 0x0a0a1e,
    playerStart: { x: 10, y: 12 },
    tiles: generateBossArena(),
    tileNames: { 0: 'tile_water', 1: 'tile_island', 2: 'tile_wall' },
    walls: [2],
    objects: [],
    npcs: [],
    enemies: [],
    boss: {
      type: 'boss_celos',
      hp: 18,
      damage: 1,
      name: 'Celos',
      dialogue_intro: 'celos_boss_intro',
      dialogue_defeat: 'celos_boss_defeat',
      fragment: 'fragment_celos',
      fragmentName: 'Fragmento de UniÃ³n',
    },
    letters: [],
  },

  reino_recuerdos: {
    name: 'El Reino de los Recuerdos',
    width: 80,
    height: 45,
    bgColor: 0xffecd2,
    playerStart: { x: 40, y: 42 },
    tiles: generateMemoryMap(),
    tileNames: { 0: 'tile_memorial', 1: 'tile_flowers', 2: 'tile_light' },
    walls: [2],
    objects: [
      { tileX: 72, tileY: 10, type: 'final_boss', id: 'boss_coleccionista', target: 'boss_coleccionista' },
    ],
    npcs: [],
    enemies: [],
    boss: null,
    letters: [],
  },

  boss_coleccionista: {
    name: 'Arena Final',
    width: 20,
    height: 15,
    bgColor: 0x0a0a1e,
    playerStart: { x: 10, y: 12 },
    tiles: generateFinalArena(),
    tileNames: { 0: 'tile_dark', 1: 'tile_memorial', 2: 'tile_wall' },
    walls: [2],
    objects: [],
    npcs: [],
    enemies: [],
    boss: {
      type: 'boss_coleccionista',
      hp: 30,
      damage: 2,
      name: 'El Coleccionista',
      dialogue_intro: 'coleccionista_intro',
      dialogue_defeat: 'coleccionista_defeat',
      fragment: null,
      fragmentName: null,
      phases: 3,
    },
    letters: [],
  },
};

function generateDistanceMap() {
  const w = 80, h = 45;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(4);
      } else if (y === 16 && x >= 18 && x <= 62) {
        row.push(x >= 28 && x <= 31 ? 5 : 3);
      } else if (y === 32 && x >= 20 && x <= 66) {
        row.push(x >= 44 && x <= 47 ? 5 : 3);
      } else if ((x === 22 && y === 15) || (x === 58 && y === 17) || (x === 24 && y === 31) || (x === 60 && y === 33)) {
        row.push(6);
      } else if (x === 36 && y >= 4 && y <= 42) {
        row.push(1);
      } else if ((x * 7 + y * 13) % 37 === 0 && y > 3 && y < 42 && x > 8 && x < 72) {
        row.push(4);
      } else if ((x * 5 + y * 3) % 19 === 0) {
        row.push(7);
      } else if (y > 1 && y < 44 && x > 1 && x < 79) {
        row.push(0);
      } else {
        row.push(1);
      }
    }
    map.push(row);
  }
  return map;
}

function generateSwampMap() {
  const w = 80, h = 45;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const road = (x % 16 === 0 && y >= 2 && y <= 42) || (y % 10 === 0 && x >= 2 && x <= 77);
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if (road) {
        row.push(4);
      } else if ((x * 2 + y * 3) % 9 === 0) {
        row.push(1);
      } else if ((x * 4 + y * 7) % 19 === 0) {
        row.push(2);
      } else if (x % 23 === 0 && y % 13 === 0) {
        row.push(3);
      } else if ((x * 3 + y * 5) % 13 === 4) {
        row.push(5);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function generateValleyMap() {
  const w = 80, h = 45;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const road = (x % 16 === 0 && y >= 2 && y <= 42) || (y % 10 === 0 && x >= 2 && x <= 77);
      const lx = x % 16, ly = y % 10;
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(4);
      } else if (road) {
        row.push(3);
      } else if (lx >= 4 && lx <= 9 && ly >= 3 && ly <= 7) {
        row.push(4);
      } else if ((x * 3 - y * 5) % 29 === 0) {
        row.push(2);
      } else if ((x + y) % 23 === 0) {
        row.push(1);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function generateMountainMap() {
  const w = 80, h = 45;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const road = (x % 16 === 0 && y >= 2 && y <= 42) || (y % 10 === 0 && x >= 2 && x <= 77);
      const lx = x % 16, ly = y % 10;
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if (road) {
        row.push(0);
      } else if (y > 1 && y <= 8 && x > 1 && x < 79) {
        row.push(1);
      } else if (x >= 2 && x <= 14 && y >= 34 && y <= 40) {
        row.push(3);
      } else if (lx >= 6 && lx <= 11 && ly >= 4 && ly <= 8) {
        row.push(2);
      } else if ((x * 5 + y * 7) % 29 === 0) {
        row.push(4);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function parseMap(rows) {
  const codes = { '.': 0, '~': 1, 'T': 2, 'R': 3, '#': 4, 'D': 5, };
  return rows.map(row => row.split('').map(c => codes[c] ?? 0));
}

function generateLakeMap() {
  const w = 80, h = 45;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const dx = x - 40, dy = y - 22;
      const inLake = (dx * dx) / (26 * 26) + (dy * dy) / (11 * 11) <= 1.02;
      const bridge = y === 22 && x >= 6 && x <= 74;
      const spine = x === 36 && y >= 14 && y <= 30;
      const island = (x === 16 && y === 22) || (x === 60 && y === 22) || (x === 26 && y === 18) || (x === 50 && y === 26);
      const rock = (x === 10 && y === 14) || (x === 68 && y === 30) || (x === 40 && y === 14) || (x === 40 && y === 31);
      const dark = (x === 14 && y === 30) || (x === 64 && y === 14);
      if (x < 3 || x > w - 4 || y < 3 || y > h - 4) {
        row += 'T';
      } else if (bridge || spine) {
        row += '.';
      } else if (island) {
        row += '#';
      } else if (inLake) {
        row += '~';
      } else if (rock) {
        row += 'R';
      } else if (dark) {
        row += 'D';
      } else {
        row += '.';
      }
    }
    rows.push(row);
  }
  return parseMap(rows);
}

function generateBossArena() {
  const w = 20, h = 15;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function generateMemoryMap() {
  const w = 80, h = 45;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if (x === 40 || y === 22) {
        row.push(1);
      } else if (x % 17 >= 2 && x % 17 <= 3 && y % 13 >= 2 && y % 13 <= 3) {
        row.push(2);
      } else if ((x * 3 + y * 7) % 31 === 0) {
        row.push(1);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function generateFinalArena() {
  const w = 20, h = 15;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if ((x + y) % 3 === 0) {
        row.push(1);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}
