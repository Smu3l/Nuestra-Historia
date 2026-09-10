import Phaser from 'phaser';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.skipKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.isSkipping = false;

    const introLines = [
      { text: 'María José...', delay: 2000, hold: 1500 },
      { text: 'Hay historias que comienzan por casualidad.', delay: 2500, hold: 2000 },
      { text: 'Y otras que, con el tiempo,\nse convierten en recuerdos.', delay: 2500, hold: 2000 },
      { text: 'Pero alguien decidió\ntomar nuestros recuerdos...', delay: 2500, hold: 2000 },
    ];

    const coleLines = [
      { text: 'Tengo a Samuel.', delay: 1500, hold: 2000 },
      { text: 'Si quieres volver a verlo,\ntendrás que recuperar\nlos fragmentos de nuestra historia.', delay: 2500, hold: 2500 },
      { text: 'Cada fragmento se encuentra\nen un lugar diferente.', delay: 2000, hold: 2000 },
      { text: 'Pero ten cuidado...', delay: 1500, hold: 1500 },
      { text: 'Porque cada recuerdo está\nprotegido por algo que puede\ndestruir una relación.', delay: 2500, hold: 2000 },
      { text: 'Distancia.\nToxicidad.\nDesinterés.\nInseguridad.\nCelos.\nY muchos más.', delay: 3000, hold: 2500 },
      { text: 'Si consigues recuperar\ntodos los fragmentos...\nquizás puedas encontrarlo.', delay: 2500, hold: 2000 },
      { text: 'ATT: El Coleccionista', delay: 1500, hold: 2000 },
    ];

    const allLines = [...introLines, ...coleLines];

    const textDisplay = this.add.text(320, 180, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 500 },
      lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    const skipText = this.add.text(600, 345, '[ESPACIO] Saltar', {
      fontSize: '8px',
      color: '#555',
      fontFamily: 'monospace',
    }).setOrigin(1, 1);

    let lineIndex = 0;

    const showLine = () => {
      if (lineIndex >= allLines.length || this.isSkipping) {
        this.finishIntro();
        return;
      }

      const line = allLines[lineIndex];

      if (lineIndex === introLines.length) {
        this.cameras.main.flash(500, 0, 0, 50);
        textDisplay.setColor('#e94560');
      }

      textDisplay.setText(line.text);
      textDisplay.setAlpha(0);

      this.tweens.add({
        targets: textDisplay,
        alpha: 1,
        duration: 500,
        onComplete: () => {
          this.time.delayedCall(line.hold, () => {
            this.tweens.add({
              targets: textDisplay,
              alpha: 0,
              duration: 500,
              onComplete: () => {
                lineIndex++;
                showLine();
              },
            });
          });
        },
      });
    };

    this.skipKey.on('down', () => {
      this.isSkipping = true;
      this.finishIntro();
    });

    this.time.delayedCall(500, showLine);
  }

  finishIntro() {
    if (this._finished) return;
    this._finished = true;
    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      this.scene.start('GameScene', { map: 'casa' });
    });
  }
}
