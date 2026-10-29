// Generado por tools/npc_process.py. No editar a mano.
// Sprites estaticos de los NPCs (fondo blanco removido, PNG sin perdida).

// key de textura -> archivo (usado por PreloadScene)
export const NPC_TEXTURE_FILES = {
  npc_milan: 'assets/sprites/npcs/npc_milan.png',
  npc_caminante: 'assets/sprites/npcs/npc_caminante.png',
  npc_caminante_solitario: 'assets/sprites/npcs/npc_caminante_solitario.png',
  npc_alma_perdida: 'assets/sprites/npcs/npc_alma_perdida.png',
  npc_espiritu: 'assets/sprites/npcs/npc_espiritu.png',
  npc_ermitano: 'assets/sprites/npcs/npc_ermitano.png',
  npc_guardian: 'assets/sprites/npcs/npc_guardian.png',
};

// NPC.name (en Maps.js) -> datos de render del sprite estatico.
// originX/originY anclan el sprite a los pies del personaje; contentH es la
// altura real del personaje en pixeles; height la altura deseada en mundo.
export const NPC_BY_NAME = {
  'Milan': { key: 'npc_milan', originX: 0.5151, originY: 0.977, contentH: 416, height: 10 },
  'Caminante': { key: 'npc_caminante', originX: 0.4822, originY: 0.9507, contentH: 351, height: 28 },
  'Caminante Solitario': { key: 'npc_caminante_solitario', originX: 0.4789, originY: 0.9881, contentH: 411, height: 28 },
  'Alma Perdida': { key: 'npc_alma_perdida', originX: 0.4923, originY: 1.0, contentH: 368, height: 30 },
  'Espíritu': { key: 'npc_espiritu', originX: 0.4757, originY: 0.9777, contentH: 384, height: 27 },
  'Ermitaño': { key: 'npc_ermitano', originX: 0.5108, originY: 0.9821, contentH: 422, height: 30 },
  'Guardián': { key: 'npc_guardian', originX: 0.4927, originY: 1.0, contentH: 467, height: 30 },
};
