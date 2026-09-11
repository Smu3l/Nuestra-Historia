import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { IntroScene } from './scenes/IntroScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { FinalScene } from './scenes/FinalScene';
import { MemoryScene } from './scenes/MemoryScene';
import { ConfigScene } from './scenes/ConfigScene';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 640,
  height: 360,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
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
window.__game = game;
export default game;
