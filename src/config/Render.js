// Configuración de render: el juego se autoriza en un espacio lógico de
// 640x360, pero el canvas (backing store) se crea a RENDER_SCALE veces ese
// tamaño y cada cámara aplica ese mismo zoom. Así el navegador ya no tiene
// que escalar ~2x con NEAREST (que emborronaba/aserruchaba todo) y los
// sprites/textos pueden tener más píxeles reales.
export const RENDER_SCALE = 2;

// Re-escalado del arte horneado (hoja de María José y NPC Samuel).
// 1 = 16x24 (original), 4 = 64x96 (coincide 1:1 con lo que ocupa el sprite
// en pantalla al zoom máximo: 16x24 * RENDER_SCALE 2 * zoom mundo 2).
export const SPRITE_BAKE = 4;

// Factor de resolución del canvas interno de Phaser.GameObjects.Text.
// Cubre el zoom máximo visible (mundo 2 x RENDER_SCALE 2 = 4).
export const TEXT_RESOLUTION = 4;

// Desplazamiento de scroll que hay que restar en las cámaras con follow para
// que el mundo siga mapeando 1:1 con el espacio lógico 640x360.
export const CAM_OFFSET_X = 320 * (RENDER_SCALE - 1);
export const CAM_OFFSET_Y = 180 * (RENDER_SCALE - 1);

// Escala a la que hay que dibujar los sprites horneados para conservar la
// huella mundial de 16x24.
export const SPRITE_SCALE = 1 / SPRITE_BAKE;
