export const Maps = {
  casa: {
    name: 'Casa de María José',
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
      { tileX: 3, tileY: 10, type: 'exit', target: 'sendero_distancia', spawnX: 10, spawnY: 18 },
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
    width: 30,
    height: 20,
    bgColor: 0x2d3436,
    playerStart: { x: 10, y: 1 },
    tiles: generateDistanceMap(),
    tileNames: { 0: 'tile_grass', 1: 'tile_dirt', 2: 'tile_stone', 3: 'tile_water', 4: 'tile_tree', 5: 'tile_bridge', 6: 'tile_rock', 7: 'tile_flowers', 8: 'tile_sign' },
    walls: [4, 3, 6],
    objects: [
      { tileX: 15, tileY: 5, type: 'interact', id: 'distancia_intro', sprite: 'tile_sign', dialogue: 'distancia_intro' },
      { tileX: 27, tileY: 10, type: 'boss_arena', id: 'boss_distancia', target: 'boss_distancia' },
      { tileX: 5, tileY: 2, type: 'exit', target: 'casa', spawnX: 3, spawnY: 11 },
    ],
    npcs: [
      { tileX: 8, tileY: 4, sprite: 'npc_wanderer', dialogue: 'distancia_npc1', name: 'Caminante' },
      { tileX: 20, tileY: 12, sprite: 'npc_wanderer', dialogue: 'distancia_npc2', name: 'Caminante Solitario' },
    ],
    enemies: [
      { type: 'enemy_shadow', x: 12, y: 7, hp: 2, damage: 1, patrol: [{ x: 12, y: 7 }, { x: 16, y: 7 }] },
      { type: 'enemy_echo', x: 18, y: 14, hp: 2, damage: 1, patrol: [{ x: 18, y: 14 }, { x: 22, y: 14 }] },
      { type: 'enemy_shadow', x: 24, y: 6, hp: 3, damage: 1, patrol: [{ x: 24, y: 6 }, { x: 26, y: 6 }] },
    ],
    boss: null,
    letters: [
      { tileX: 14, tileY: 16, id: 'letter_1' },
    ],
  },

  boss_distancia: {
    name: 'Arena de la Distancia',
    width: 15,
    height: 15,
    bgColor: 0x1a1a2e,
    playerStart: { x: 7, y: 13 },
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
    width: 30,
    height: 20,
    bgColor: 0x1a2a1a,
    playerStart: { x: 1, y: 10 },
    tiles: generateSwampMap(),
    tileNames: { 0: 'tile_marsh', 1: 'tile_marsh_water', 2: 'tile_tree', 3: 'tile_rock', 4: 'tile_dirt', 5: 'tile_fog' },
    walls: [2, 3],
    objects: [
      { tileX: 15, tileY: 3, type: 'interact', id: 'toxicidad_intro', sprite: 'tile_sign', dialogue: 'toxicidad_intro' },
      { tileX: 27, tileY: 10, type: 'boss_arena', id: 'boss_toxicidad', target: 'boss_toxicidad' },
    ],
    npcs: [
      { tileX: 10, tileY: 6, sprite: 'npc_sage', dialogue: 'toxicidad_npc1', name: 'Alma Perdida' },
    ],
    enemies: [
      { type: 'enemy_crawler', x: 8, y: 8, hp: 3, damage: 1, patrol: [{ x: 8, y: 8 }, { x: 12, y: 8 }] },
      { type: 'enemy_fog', x: 16, y: 12, hp: 2, damage: 1, patrol: [{ x: 16, y: 12 }, { x: 20, y: 12 }] },
      { type: 'enemy_crawler', x: 22, y: 6, hp: 3, damage: 1, patrol: [{ x: 22, y: 6 }, { x: 25, y: 6 }] },
    ],
    boss: null,
    letters: [
      { tileX: 5, tileY: 4, id: 'letter_2' },
    ],
  },

  boss_toxicidad: {
    name: 'Arena de la Toxicidad',
    width: 15,
    height: 15,
    bgColor: 0x0d1f0d,
    playerStart: { x: 7, y: 13 },
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
      fragmentName: 'Fragmento de la Comprensión',
    },
    letters: [],
  },

  valle_desinteres: {
    name: 'El Valle del Desinterés',
    width: 30,
    height: 20,
    bgColor: 0x4a4a4a,
    playerStart: { x: 1, y: 10 },
    tiles: generateValleyMap(),
    tileNames: { 0: 'tile_dirt', 1: 'tile_stone', 2: 'tile_brick', 3: 'tile_wood', 4: 'tile_wall', 5: 'tile_door' },
    walls: [4],
    objects: [
      { tileX: 8, tileY: 3, type: 'interact', id: 'desinteres_intro', sprite: 'tile_sign', dialogue: 'desinteres_intro' },
      { tileX: 27, tileY: 10, type: 'boss_arena', id: 'boss_desinteres', target: 'boss_desinteres' },
    ],
    npcs: [
      { tileX: 12, tileY: 8, sprite: 'npc_child', dialogue: 'desinteres_npc1', name: 'Espíritu' },
    ],
    enemies: [
      { type: 'enemy_puppet', x: 15, y: 6, hp: 3, damage: 1, patrol: [{ x: 15, y: 6 }, { x: 18, y: 6 }] },
      { type: 'enemy_void', x: 20, y: 14, hp: 2, damage: 1, patrol: [{ x: 20, y: 14 }, { x: 23, y: 14 }] },
    ],
    boss: null,
    letters: [
      { tileX: 18, tileY: 3, id: 'letter_3' },
    ],
  },

  boss_desinteres: {
    name: 'Arena del Desinterés',
    width: 15,
    height: 15,
    bgColor: 0x2a2a2a,
    playerStart: { x: 7, y: 13 },
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
      name: 'Desinterés',
      dialogue_intro: 'desinteres_boss_intro',
      dialogue_defeat: 'desinteres_boss_defeat',
      fragment: 'fragment_desinteres',
      fragmentName: 'Fragmento de la Atención',
    },
    letters: [],
  },

  montanas_inseguridad: {
    name: 'Las Montañas de la Inseguridad',
    width: 30,
    height: 20,
    bgColor: 0x2d1b69,
    playerStart: { x: 1, y: 10 },
    tiles: generateMountainMap(),
    tileNames: { 0: 'tile_stone', 1: 'tile_snow', 2: 'tile_rock', 3: 'tile_water', 4: 'tile_tree', 5: 'tile_cabin_wall' },
    walls: [2, 5],
    objects: [
      { tileX: 5, tileY: 5, type: 'interact', id: 'inseguridad_intro', sprite: 'tile_sign', dialogue: 'inseguridad_intro' },
      { tileX: 15, tileY: 8, type: 'interact', id: 'inseguridad_cabin', sprite: 'tile_cabin_wall', dialogue: 'inseguridad_letter_cabin' },
      { tileX: 27, tileY: 10, type: 'boss_arena', id: 'boss_inseguridad', target: 'boss_inseguridad' },
    ],
    npcs: [
      { tileX: 10, tileY: 12, sprite: 'npc_elder', dialogue: 'inseguridad_npc1', name: 'Ermitaño' },
    ],
    enemies: [
      { type: 'enemy_shadow', x: 8, y: 4, hp: 3, damage: 1, patrol: [{ x: 8, y: 4 }, { x: 12, y: 4 }] },
      { type: 'enemy_void', x: 20, y: 8, hp: 3, damage: 1, patrol: [{ x: 20, y: 8 }, { x: 24, y: 8 }] },
    ],
    boss: null,
    letters: [
      { tileX: 15, tileY: 16, id: 'letter_4' },
    ],
  },

  boss_inseguridad: {
    name: 'Arena de la Inseguridad',
    width: 15,
    height: 15,
    bgColor: 0x1a0d2e,
    playerStart: { x: 7, y: 13 },
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
    width: 30,
    height: 20,
    bgColor: 0x0a1628,
    playerStart: { x: 1, y: 10 },
    tiles: generateLakeMap(),
    tileNames: { 0: 'tile_grass', 1: 'tile_water', 2: 'tile_tree', 3: 'tile_rock', 4: 'tile_island', 5: 'tile_dark' },
    walls: [2, 3, 1],
    wallBodies: { 2: { width: 6, height: 6, offsetX: 5, offsetY: 10 } },
    objects: [
      { tileX: 5, tileY: 5, type: 'interact', id: 'celos_intro', sprite: 'tile_sign', dialogue: 'celos_intro' },
      { tileX: 27, tileY: 10, type: 'boss_arena', id: 'boss_celos', target: 'boss_celos' },
    ],
    npcs: [
      { tileX: 7, tileY: 12, sprite: 'npc_wanderer', dialogue: 'celos_npc1', name: 'Guardián' },
    ],
    enemies: [
      { type: 'enemy_shadow', x: 10, y: 6, hp: 3, damage: 1, patrol: [{ x: 10, y: 6 }, { x: 14, y: 6 }] },
      { type: 'enemy_echo', x: 22, y: 12, hp: 3, damage: 1, patrol: [{ x: 22, y: 12 }, { x: 26, y: 12 }] },
    ],
    boss: null,
    letters: [
      { tileX: 23, tileY: 3, id: 'letter_5' },
    ],
  },

  boss_celos: {
    name: 'Arena de los Celos',
    width: 15,
    height: 15,
    bgColor: 0x0a0a1e,
    playerStart: { x: 7, y: 13 },
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
      fragmentName: 'Fragmento de Unión',
    },
    letters: [],
  },

  reino_recuerdos: {
    name: 'El Reino de los Recuerdos',
    width: 25,
    height: 20,
    bgColor: 0xffecd2,
    playerStart: { x: 12, y: 18 },
    tiles: generateMemoryMap(),
    tileNames: { 0: 'tile_memorial', 1: 'tile_flowers', 2: 'tile_light', 3: 'tile_fragment' },
    walls: [2],
    objects: [
      { tileX: 12, tileY: 5, type: 'final_boss', id: 'boss_coleccionista', target: 'boss_coleccionista' },
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
    playerStart: { x: 10, y: 13 },
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
  const w = 30, h = 20;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(4);
      } else if ((y === 5 || y === 12) && x >= 8 && x <= 22) {
        row.push(3);
      } else if ((y === 9 || y === 10) && x >= 14 && x <= 16) {
        row.push(5);
      } else if ((y === 5 && x === 9) || (y === 12 && x === 20)) {
        row.push(6);
      } else if ((x + y) % 7 === 0) {
        row.push(7);
      } else if (y > 2 && y < 17 && x > 2 && x < 27) {
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
  const w = 30, h = 20;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if ((x + y * 3) % 5 === 0 || (x * 2 + y) % 7 === 0) {
        row.push(1);
      } else if ((x + y) % 11 === 0) {
        row.push(3);
      } else if ((x * y) % 13 === 0) {
        row.push(2);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function generateValleyMap() {
  const w = 30, h = 20;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(4);
      } else if ((y === 3 || y === 7 || y === 12) && x >= 5 && x <= 10) {
        row.push(4);
      } else if (y === 3 && x >= 10 && x <= 12) {
        row.push(5);
      } else if ((y === 7 || y === 12) && x >= 10 && x <= 12) {
        row.push(5);
      } else if ((x + y) % 9 === 0) {
        row.push(3);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function generateMountainMap() {
  const w = 30, h = 20;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if (y < 5 || (y < 8 && x > 20)) {
        row.push(1);
      } else if ((y === 8 || y === 9) && x >= 14 && x <= 16) {
        row.push(3);
      } else if (y === 8 && x >= 14 && x <= 17) {
        row.push(5);
      } else if ((x + y) % 8 === 0) {
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
  return parseMap([
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TDDDDDDDDDDDDDDDDDDDDDDDDDDDDT',
    'TDRDDDDDDTDDDDDDDDDDTDDDDDDDDT',
    'TDDDDDDDDTDDDDDDDDDTDDDDDDRDDT',
    'TDDDTDDDTTDDRDDDDDDDTDDDDDRDDT',
    'TDDDDDDDD......TT...T....DDDDT',
    'TDDDDDDDD......~~~~..TTT.DDDDT',
    'TDDDDDDDD~~~#~~~.~...TTTDDDDDT',
    'TDDDDDDDD~~~~~#~~...TTT.DDDDDT',
    'TDDDDDD...~~~~#~~.....T......T',
    'TDDDDD.......................T',
    'TDDDDDD~~~~~~#~~~~...........T',
    'TDDDDDD......................T',
    'TDDDDD~~~~~~~........T.......T',
    'TDDDD..........R.............T',
    'T............................T',
    'T............................T',
    'T...R....................R...T',
    'TDDDD....RRR.......R.........T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ]);
}

function generateBossArena() {
  const w = 15, h = 15;
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
  const w = 25, h = 20;
  const map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        row.push(2);
      } else if ((x + y) % 4 === 0) {
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
