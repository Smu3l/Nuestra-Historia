import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';

export class FinalScene extends Phaser.Scene {
  constructor() {
    super('FinalScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.skipKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.isSkipping = false;

    const lines = [
      { text: 'Samuël: ...', delay: 1000, hold: 1000 },
      { text: 'Samuël: MJ...', delay: 1000, hold: 1000 },
      { text: 'Samuël: Sabía que ibas a encontrarme.', delay: 2000, hold: 2000 },
      { text: 'María José: Te dije que no iba a dejarte.', delay: 2000, hold: 2000 },
      { text: 'Samuël: Nunca lo dudé.', delay: 1500, hold: 1500 },
      { text: 'María José: Yo tampoco.', delay: 1500, hold: 1500 },
      { text: 'Samuël: Gracias por no rendirte.', delay: 2000, hold: 2000 },
      { text: 'María José: Gracias por esperarme.', delay: 2000, hold: 2000 },
      { text: '...', delay: 1000, hold: 1000 },
      { text: 'Los fragmentos de recuerdo comienzan a brillar...', delay: 2000, hold: 2000 },
      { text: '', delay: 500, hold: 500 },
      { text: 'Una historia no se trata de no tener problemas.', delay: 2500, hold: 2500 },
      { text: 'Se trata de decidir seguir escribiéndola juntos.', delay: 2500, hold: 3000 },
      { text: '', delay: 500, hold: 500 },
      { text: 'Fin.', delay: 2000, hold: 2000 },
      { text: '', delay: 500, hold: 500 },
      { text: 'Gracias por jugar nuestra historia.', delay: 2000, hold: 2000 },
      { text: 'Con amor, Samuel <3', delay: 2000, hold: 3000 },
    ];

    const textDisplay = this.add.text(320, 180, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 500 },
      lineSpacing: 8,
    }).setOrigin(0.5).setAlpha(0);

    const samuelSprite = this.add.sprite(240, 250, 'samuel').setScale(2).setAlpha(0);
    const mjSprite = this.add.sprite(400, 250, 'player_down_idle_0').setScale(2).setAlpha(0);

    for (let i = 0; i < 20; i++) {
      const spark = this.add.sprite(
        Math.random() * 640,
        Math.random() * 360,
        'sparkle'
      );
      spark.setTint(Phaser.Math.RND.pick([0xf1c40f, 0xff6b9d, 0x74b9ff, 0x55efc4]));
      spark.setAlpha(0);
      spark.setScale(0.5);
    }

    let lineIndex = 0;

    const showLine = () => {
      if (lineIndex >= lines.length || this.isSkipping) {
        this.finishScene();
        return;
      }

      const line = lines[lineIndex];

      if (lineIndex === 9) {
        this.cameras.main.flash(1000, 255, 246, 210);
        this.tweens.add({
          targets: samuelSprite,
          alpha: 1,
          duration: 2000,
        });
        this.tweens.add({
          targets: mjSprite,
          alpha: 1,
          duration: 2000,
        });

        this.children.list.forEach(child => {
          if (child === samuelSprite || child === mjSprite || child === textDisplay) return;
          if (child.type === 'Sprite' && child.texture?.key === 'sparkle') {
            this.tweens.add({
              targets: child,
              alpha: 0.6,
              duration: 2000,
              yoyo: true,
              repeat: -1,
            });
          }
        });
      }

      if (line.text === '') {
        lineIndex++;
        this.time.delayedCall(300, showLine);
        return;
      }

      textDisplay.setText(line.text);
      textDisplay.setAlpha(0);

      this.tweens.add({
        targets: textDisplay,
        alpha: 1,
        duration: 800,
        onComplete: () => {
          this.time.delayedCall(line.hold, () => {
            this.tweens.add({
              targets: textDisplay,
              alpha: 0,
              duration: 800,
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
      this.finishScene();
    });

    this.time.delayedCall(1000, showLine);
  }

  finishScene() {
    if (this._finished) return;
    this._finished = true;

    this.cameras.main.fade(2000, 255, 255, 255);
    this.time.delayedCall(2500, () => {
      this.scene.start('MenuScene');
    });
  }
}
