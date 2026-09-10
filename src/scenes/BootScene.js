import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0a1e);

    const loadingText = this.add.text(320, 160, 'Preparando tu historia...', {
      fontSize: '14px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const dots = this.add.text(320, 185, '', {
      fontSize: '12px',
      color: '#888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    let dotCount = 0;
    this.time.addEvent({
      delay: 300,
      repeat: 9,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        dots.setText('.'.repeat(dotCount));
      },
    });

    this.time.delayedCall(3000, () => {
      this.scene.start('PreloadScene');
    });
  }
}
