import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';

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

    for (let i = 0; i < Math.ceil(GameState.maxHP / 2); i++) {
      const heart = this.scene.add.image(i * 14, 0, 'ui_heart').setOrigin(0);
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

    this.fragmentContainer = this.scene.add.container(620, 10);
    this.fragmentContainer.setDepth(250);

    const fragLabel = this.scene.add.text(0, 0, 'Fragmentos:', {
      fontSize: '8px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    });
    this.fragmentContainer.add(fragLabel);

    this.fragmentCount = this.scene.add.text(0, 10, `0/5`, {
      fontSize: '10px',
      color: '#fff',
      fontFamily: 'monospace',
    });
    this.fragmentContainer.add(this.fragmentCount);

    this.interactPrompt = this.scene.add.text(320, 330, '[E] Interactuar', {
      fontSize: '9px',
      color: '#fff',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 0.5).setDepth(250).setVisible(false);

    this.scene.interactPrompt = this.interactPrompt;
  }

  update() {
    this.updateHearts();
    this.fragmentCount.setText(`${GameState.fragments.length}/5`);
    this.reposition();
  }

  reposition() {
    const cam = this.scene.cameras.main;
    if (!cam) return;

    const zoom = cam.zoom;
    const viewW = 640 / zoom;
    const viewH = 360 / zoom;
    const sx = cam.scrollX;
    const sy = cam.scrollY;
    const uiScale = 1 / zoom;

    this.heartContainer.setPosition(sx + 10, sy + 10).setScale(uiScale);
    this.mapNameText.setPosition(sx + viewW / 2, sy + 8).setScale(uiScale);
    this.fragmentContainer.setPosition(sx + viewW - 85, sy + 10).setScale(uiScale);
    this.interactPrompt.setPosition(sx + viewW / 2, sy + viewH - 28).setScale(uiScale);
  }

  updateHearts() {
    const fullHearts = Math.floor(GameState.hp / 2);
    const halfHeart = GameState.hp % 2 === 1;

    this.hearts.forEach((heart, i) => {
      if (i < fullHearts) {
        heart.setTexture('ui_heart');
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
