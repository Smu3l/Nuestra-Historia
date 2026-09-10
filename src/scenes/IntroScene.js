import Phaser from 'phaser';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.isSkipping = false;
    this.introTimer = null;
    this.finished = false;
    this.currentIndex = 0;

    this.introLines = [
      { text: 'María José...' },
      { text: 'Hay historias que comienzan por casualidad.' },
      { text: 'Y otras que, con el tiempo,\nse convierten en recuerdos.' },
      { text: 'Pero alguien decidió\ntomar nuestros recuerdos...' },
    ];

    const coleLines = [
      { text: 'Tengo a Samuel.' },
      { text: 'Si quieres volver a verlo,\ntendrás que recuperar\nlos fragmentos de nuestra historia.' },
      { text: 'Cada fragmento se encuentra\nen un lugar diferente.' },
      { text: 'Pero ten cuidado...' },
      { text: 'Porque cada recuerdo está\nprotegido por algo que puede\ndestruir una relación.' },
      { text: 'Distancia.\nToxicidad.\nDesinterés.\nInseguridad.\nCelos.\nY muchos más.' },
      { text: 'Si consigues recuperar\ntodos los fragmentos...\nquizás puedas encontrarlo.' },
      { text: 'ATT: El Coleccionista' },
    ];

    this.lines = [...this.introLines, ...coleLines];
    this.introLinesCount = this.introLines.length;

    const textDisplay = this.add.text(320, 180, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 500 },
      lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    const hintText = this.add.text(320, 330, '[ENTER / ESPACIO / CLICK] Avanzar', {
      fontSize: '8px',
      color: '#555',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.7);

    this.textDisplay = textDisplay;
    this.hintText = hintText;

    const onAdvanceInput = () => this.advance();

    this.input.keyboard.on('keydown-ENTER', onAdvanceInput);
    this.input.keyboard.on('keydown-SPACE', onAdvanceInput);
    this.input.on('pointerdown', onAdvanceInput);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off('keydown-ENTER', onAdvanceInput);
      this.input.keyboard.off('keydown-SPACE', onAdvanceInput);
      this.input.off('pointerdown', onAdvanceInput);
      if (this.introTimer) this.introTimer.remove();
    });

    this.time.delayedCall(600, () => this.showLine());
  }

  readTimeFor(text) {
    const clean = text.replace(/\n/g, ' ');
    return Math.min(Math.max(3000 + clean.length * 12, 3000), 5000);
  }

  advance() {
    if (this.finished || this.isSkipping) return;
    if (this.introTimer) {
      this.introTimer.remove();
      this.introTimer = null;
    }

    this.tweens.add({
      targets: this.textDisplay,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.currentIndex++;
        this.showLine();
      },
    });
  }

  showLine() {
    if (this.currentIndex >= this.lines.length || this.isSkipping) {
      this.finishIntro();
      return;
    }

    const line = this.lines[this.currentIndex];

    if (this.currentIndex === this.introLinesCount) {
      this.cameras.main.flash(400, 0, 0, 50);
      this.textDisplay.setColor('#e94560');
    }

    this.textDisplay.setText(line.text);
    this.textDisplay.setAlpha(0);

    this.tweens.add({
      targets: this.textDisplay,
      alpha: 1,
      duration: 350,
      onComplete: () => {
        this.introTimer = this.time.delayedCall(this.readTimeFor(line.text), () => this.advance());
      },
    });
  }

  finishIntro() {
    if (this.finished) return;
    this.finished = true;
    this.isSkipping = true;
    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      this.scene.start('GameScene', { map: 'casa' });
    });
  }
}