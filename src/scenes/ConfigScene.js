import Phaser from 'phaser';

export class ConfigScene extends Phaser.Scene {
  constructor() {
    super('ConfigScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0a1e);

    this.add.text(320, 40, 'Configuración', {
      fontSize: '18px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const controls = [
      'CONTROLES',
      '',
      'WASD / Flechas ........... Mover',
      'ESPACIO ................. Atacar',
      'E ....................... Interactuar',
      'ESC ..................... Pausa',
      'ENTER ................... Aceptar',
      '',
      '',
      'Creado con amor para María José',
      'por Samuel.',
      '',
      'Una aventura sobre los recuerdos',
      'que construimos juntos.',
    ];

    controls.forEach((line, i) => {
      const isHeader = line === 'CONTROLES';
      const isSpecial = line.includes('Samuel') || line.includes('María José') || line.includes('amor');
      this.add.text(320, 80 + i * 16, line, {
        fontSize: isHeader ? '13px' : '10px',
        color: isHeader ? '#f1c40f' : isSpecial ? '#ff6b9d' : '#ccc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    const backBtn = this.add.image(320, 330, 'btn').setInteractive({ useHandCursor: true });
    const backText = this.add.text(320, 330, 'Volver', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    backBtn.on('pointerover', () => backText.setColor('#f1c40f'));
    backBtn.on('pointerout', () => backText.setColor('#ffffff'));

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.scene.start('MenuScene');
    });
  }
}
