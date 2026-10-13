import Phaser from 'phaser';
import { RENDER_SCALE, CAM_OFFSET_X, CAM_OFFSET_Y, TEXT_RESOLUTION } from './config/Render.js';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { IntroScene } from './scenes/IntroScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { FinalScene } from './scenes/FinalScene';
import { MemoryScene } from './scenes/MemoryScene';
import { ConfigScene } from './scenes/ConfigScene';

// ---------------------------------------------------------------------------
// NITIDEZ GLOBAL
// El juego se sigue "pensando" en 640x360 pero el canvas real es más grande
// (RENDER_SCALE). Cada cámara arranca con zoom RENDER_SCALE y su scroll
// desplazado, de modo que el contenido lógico sigue 1:1 con el espacio
// 640x360 pero con el doble de píxeles reales (adiós al escalado borroso del
// navegador). GameScene después ajusta su propio zoom/scroll encima.
// ---------------------------------------------------------------------------
const CameraManagerProto = Phaser.Cameras.Scene2D.CameraManager.prototype;

// OJO: hay DOS momentos en los que la cámara principal aparece.
//  - boot(): solo la primera vez que la escena arranca.
//  - start(): en CADA arranque/reinicio. CameraManager.shutdown() pone
//    main = undefined y destruye las cámaras, así que start() vuelve a
//    crearlas con zoom 1 y scroll 0.
// Si solo se parchea boot(), la segunda vez que se abre una escena (menú,
// pausa, recuerdos, final, intro, config...) el contenido lógico 640x360 se
// dibuja en el cuarto superior-izquierdo del canvas 1280x720: "la pantalla se
// encoge". Por eso hay que devolver el zoom/scroll base en ambos métodos.
function applyRenderCamera(manager) {
  const cam = manager.main;
  if (!cam) return;
  cam.setZoom(RENDER_SCALE);
  cam.setScroll(-CAM_OFFSET_X, -CAM_OFFSET_Y);
}

['boot', 'start'].forEach((method) => {
  const original = CameraManagerProto[method];
  CameraManagerProto[method] = function patchedCameraLifecycle() {
    const result = original.apply(this, arguments);
    applyRenderCamera(this);
    return result;
  };
});

// ---------------------------------------------------------------------------
// NITIDEZ DEL TEXTO
// Los Text se dibujan en un canvas interno de fontSize * resolution y luego se
// escalan hacia abajo: subir la resolución = letras con más detalle sin que
// cambien de tamaño. Además se les pone filtro LINEAR (con pixelArt el filtro
// por defecto es NEAREST, que sierra los bordes al reescalar).
// ---------------------------------------------------------------------------
const GameObjectFactoryProto = Phaser.GameObjects.GameObjectFactory.prototype;
const originalFactoryText = GameObjectFactoryProto.text;
GameObjectFactoryProto.text = function text(x, y, content, style) {
  const merged = Object.assign({ resolution: TEXT_RESOLUTION }, style || {});
  return originalFactoryText.call(this, x, y, content, merged);
};

const GameObjectCreatorProto = Phaser.GameObjects.GameObjectCreator.prototype;
const originalCreatorText = GameObjectCreatorProto.text;
GameObjectCreatorProto.text = function text(config, addToScene) {
  const merged = Object.assign({}, config || {});
  if (!merged.resolution) {
    merged.resolution = TEXT_RESOLUTION;
  }
  return originalCreatorText.call(this, merged, addToScene);
};

const TextProto = Phaser.GameObjects.Text.prototype;
const originalUpdateText = TextProto.updateText;
TextProto.updateText = function updateText() {
  const result = originalUpdateText.apply(this, arguments);
  const source = this.frame && this.frame.source;
  if (source) {
    source.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return result;
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 640 * RENDER_SCALE,
  height: 360 * RENDER_SCALE,
  pixelArt: true,
  roundPixels: true,
  preserveDrawingBuffer: true,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    autoRound: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    IntroScene,
    GameScene,
    PauseScene,
    FinalScene,
    MemoryScene,
    ConfigScene,
  ],
};

const game = new Phaser.Game(config);

// Phaser, con pixelArt, fuerza image-rendering: pixelated en el canvas. Como
// ahora el canvas ya se renderiza casi a la resolución de la pantalla, ese
// reescalado "duro" solo empeora las cosas: lo dejamos suave.
game.canvas.style.imageRendering = 'auto';

window.__game = game;
export default game;
