import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';

export class MemoryScene extends Phaser.Scene {
  constructor() {
    super('MemoryScene');
  }

  init(data) {
    this.fragmentId = data.fragmentId;
    this.fragmentName = data.fragmentName;
    this.returnMap = data.returnMap || GameState.currentMap;
    this.returnX = data.returnX;
    this.returnY = data.returnY;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.circle(320, 180, 100, 0xf1c40f, 0.1);

    const fragSprite = this.add.image(320, 160, 'tile_fragment').setScale(3);
    this.tweens.add({
      targets: fragSprite,
      scale: { from: 2, to: 3.5 },
      alpha: { from: 0.5, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const sp = this.add.image(320, 180, 'sparkle');
      sp.setTint(0xf1c40f);
      sp.setScale(0.8);
      this.tweens.add({
        targets: sp,
        x: 320 + Math.cos(angle) * 80,
        y: 180 + Math.sin(angle) * 80,
        alpha: { from: 0.3, to: 1 },
        duration: 1500,
        delay: i * 100,
        repeat: -1,
        yoyo: true,
      });
    }

    const nameText = this.add.text(320, 240, this.fragmentName || 'Fragmento obtenido', {
      fontSize: '14px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: nameText,
      alpha: 1,
      duration: 1000,
      delay: 500,
    });

    this.time.delayedCall(3000, () => {
      this.cameras.main.fade(1000, 0, 0, 0);
      this.time.delayedCall(1200, () => {
        this.scene.start('GameScene', { map: this.returnMap, spawnX: this.returnX, spawnY: this.returnY });
      });
    });
  }
}
