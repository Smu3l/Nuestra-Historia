// Assets definitivos de la Casa de María José.
export const CASA_TEXTURE_FILES = {
  casa_cama: 'assets/casa/cama.png',
  casa_escritorio: 'assets/casa/escritorio.png',
  casa_mesa_fotos: 'assets/casa/mesa_fotos.png',
  casa_espejo: 'assets/casa/espejo.png',
  casa_puerta: 'assets/casa/puerta.png',
  casa_ventana: 'assets/casa/ventana.png',
};

// Proporciones compactas: Maria Jose como referente.
// MJ ~28-32px alto en mundo. Cama/escritorio < MJ vertical. Puerta > MJ.
// Mesa un poco mas pequena que cama, a su derecha en pared superior.
export const MAP_CASA_ART = {
  piezas: [
    { key: 'casa_cama',       tileX: 1,  tileY: 1,  height: 26 }, // cama < MJ
    { key: 'casa_mesa_fotos', tileX: 4,  tileY: 1,  height: 22 }, // mesa < cama, a su derecha
    { key: 'casa_ventana',    tileX: 7,  tileY: 1,  height: 26 },
    { key: 'casa_espejo',     tileX: 9,  tileY: 1,  height: 28 },
    { key: 'casa_escritorio', tileX: 11, tileY: 1,  height: 24 }, // escritorio < MJ, esquina superior derecha area pared
    { key: 'casa_puerta',     tileX: 1,  tileY: 7,  height: 36 }, // puerta > MJ
  ],

  ocultarTiles: ['1,1', '4,1', '7,1', '9,1', '11,1', '2,5', '1,7'],
  ocultarObjetos: ['casa_bed', 'casa_desk', 'casa_mirror', 'casa_photo', 'casa_window', 'casa_letter_samuel'],
  ocultarSalida: true,

  colliders: {
    17: { width: 12, height: 6,  offsetX: -6, offsetY: 0 },  // cama base
    18: { width: 12, height: 5,  offsetX: -6, offsetY: 0 },  // escritorio base
    19: { width: 12, height: 4,  offsetX: -6, offsetY: 0 },  // espejo base
    20: { width: 10, height: 4,  offsetX: -5, offsetY: 0 },  // mesa base
    21: { width: 8,  height: 4,  offsetX: -4, offsetY: 0 },  // carta base
    22: { width: 10, height: 8,  offsetX: -5, offsetY: -1 }, // puerta base
    23: { width: 12, height: 4,  offsetX: -6, offsetY: 0 },  // ventana base
  },
};
