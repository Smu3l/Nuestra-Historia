import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { RENDER_SCALE } from '../config/Render.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.hearts = [];
    this.fragmentIcons = [];
    this.mapName = null;
    this.create();
  }

  create() {
    this.heartContainer = this.scene.add.container(10, 10);
    this.heartContainer.setDepth(250);
    this.heartContainer.setScrollFactor(0);

    for (let i = 0; i < Math.ceil(GameState.maxHP / 2); i++) {
      const heart = this.scene.add.image(i * 14, 0, 'ui_heart').setOrigin(0);
      heart.setScrollFactor(0);
      this.heartContainer.add(heart);
      this.hearts.push(heart);
    }

    this.mapNameText = this.scene.add.text(320, 8, '', {
      fontSize: '10px',
      color: '#c4a35a',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(250).setAlpha(0.8);
    this.mapNameText.setScrollFactor(0);

    this.fragmentContainer = this.scene.add.container(620, 10);
    this.fragmentContainer.setDepth(250);
    this.fragmentContainer.setScrollFactor(0);

    const fragLabel = this.scene.add.text(0, 0, 'Fragmentos:', {
      fontSize: '8px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.fragmentContainer.add(fragLabel);

    this.fragmentCount = this.scene.add.text(0, 10, `0/5`, {
      fontSize: '10px',
      color: '#fff',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.fragmentContainer.add(this.fragmentCount);

    this.interactPrompt = this.scene.add.text(320, 330, '[E] Interactuar', {
      fontSize: '9px',
      color: '#fff',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 0.5).setDepth(250).setVisible(false);
    this.interactPrompt.setScrollFactor(0);

    this.scene.interactPrompt = this.interactPrompt;
  }

  update() {
    this.updateHearts();
    this.fragmentCount.setText(`${GameState.fragments.length}/5`);
    this.reposition();
  }

  reposition() {
    const cam = this.scene.cameras.main;
    if (!cam || !this.heartContainer) return;

    // UI anclada: scrollFactor 0 en todo, sin leer scrollX/scrollY.
    // El zoom sí afecta a lo dibujado, así que se compensa con escala
    // y posición contra el pivote central: canvas = z*mundo + T.
    // RENDER_SCALE multiplica ambos ejes porque el canvas real es mayor.
    const z = cam.zoom;
    const s = RENDER_SCALE / z;
    const X = (c) => (RENDER_SCALE * (c + 320 * (z - 1))) / z;
    const Y = (c) => (RENDER_SCALE * (c + 180 * (z - 1))) / z;

    this.heartContainer.setPosition(X(10), Y(10)).setScale(s);
    this.mapNameText.setPosition(X(320), Y(8)).setScale(s);
    this.fragmentContainer.setPosition(X(630), Y(10)).setScale(s);
    this.interactPrompt.setPosition(X(320), Y(330)).setScale(s);
  }

  updateHearts() {
    const totalHeartsNeeded = Math.ceil(GameState.maxHP / 2);
    while (this.hearts.length < totalHeartsNeeded) {
      const i = this.hearts.length;
      const heart = this.scene.add.image(i * 14, 0, 'ui_heart').setOrigin(0);
      heart.setScrollFactor(0);
      this.heartContainer.add(heart);
      this.hearts.push(heart);
    }

    const fullHearts = Math.floor(GameState.hp / 2);
    const halfHeart = GameState.hp % 2 === 1;

    this.hearts.forEach((heart, i) => {
      if (i < fullHearts) {
        heart.setTexture('ui_heart');
        heart.setAlpha(1);
      } else if (i === fullHearts && halfHeart) {
        heart.setTexture('ui_heart');
        heart.setAlpha(0.6);
      } else {
        heart.setTexture('ui_heart_empty');
        heart.setAlpha(1);
      }
    });
  }

  showMapName(name) {
    this.mapNameText.setText(name);
    this.mapNameText.setAlpha(0);
    this.scene.tweens.add({
      targets: this.mapNameText,
      alpha: 0.8,
      duration: 1000,
      hold: 2000,
      yoyo: true,
    });
  }

  destroy() {
    this.heartContainer.destroy();
    this.mapNameText.destroy();
    this.fragmentContainer.destroy();
    this.interactPrompt.destroy();
  }
}
