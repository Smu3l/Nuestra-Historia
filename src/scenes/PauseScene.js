import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    const cam = this.cameras.main;

    this.add.rectangle(320, 180, 640, 360, 0x000000, 0.7);

    this.add.text(320, 40, 'Pausa', {
      fontSize: '18px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(320, 65, `Zona: ${GameState.currentMap}`, {
      fontSize: '9px',
      color: '#888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(320, 80, `Fragmentos: ${GameState.fragments.length}/5`, {
      fontSize: '9px',
      color: '#f1c40f',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const menuItems = [
      { text: 'Reanudar', action: () => this.resume() },
      { text: 'Guardar partida', action: () => this.saveGame() },
      { text: 'Volver al menú', action: () => this.backToMenu() },
    ];

    this.selectedOption = 0;
    this.menuOptions = [];

    menuItems.forEach((item, i) => {
      const y = 130 + i * 40;
      const btn = this.add.image(320, y, 'btn').setInteractive({ useHandCursor: true });
      const text = this.add.text(320, y, item.text, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      btn.on('pointerover', () => {
        this.selectedOption = i;
        this.updateSelection();
      });
      btn.on('pointerdown', () => item.action());

      this.menuOptions.push({ btn, text, action: item.action });
    });

    this.selectedOption = 0;
    this.updateSelection();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.add.text(320, 340, 'ESC: Reanudar | ↑↓: Navegar | ENTER: Seleccionar', {
      fontSize: '8px',
      color: '#555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.lastInput = 0;
    this.saveMessage = null;
  }

  update(time) {
    if (time - this.lastInput < 200) return;

    if (this.escKey.isDown) {
      this.resume();
      this.lastInput = time;
      return;
    }

    if (this.cursors.down.isDown || this.sKey.isDown) {
      this.selectedOption = (this.selectedOption + 1) % this.menuOptions.length;
      this.updateSelection();
      this.lastInput = time;
    } else if (this.cursors.up.isDown || this.wKey.isDown) {
      this.selectedOption = (this.selectedOption - 1 + this.menuOptions.length) % this.menuOptions.length;
      this.updateSelection();
      this.lastInput = time;
    } else if (this.enterKey.isDown) {
      this.menuOptions[this.selectedOption].action();
      this.lastInput = time;
    }
  }

  updateSelection() {
    this.menuOptions.forEach((opt, i) => {
      if (i === this.selectedOption) {
        opt.text.setColor('#f1c40f');
        opt.btn.setScale(1.05);
      } else {
        opt.text.setColor('#ffffff');
        opt.btn.setScale(1);
      }
    });
  }

  resume() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  async saveGame() {
    const saveSystem = new SaveSystem();
    const success = await saveSystem.save();

    if (this.saveMessage) this.saveMessage.destroy();
    this.saveMessage = this.add.text(320, 280, success ? 'Partida guardada' : 'Error al guardar', {
      fontSize: '10px',
      color: success ? '#55efc4' : '#e74c3c',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      if (this.saveMessage) {
        this.saveMessage.destroy();
        this.saveMessage = null;
      }
    });
  }

  backToMenu() {
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}
