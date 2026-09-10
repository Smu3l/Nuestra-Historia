import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0a1e);

    const bg = this.add.image(320, 180, 'menu_bg');

    for (let i = 0; i < 30; i++) {
      const star = this.add.circle(
        Math.random() * 640,
        Math.random() * 360,
        Math.random() * 1.5 + 0.5,
        0xffffff,
        Math.random() * 0.6 + 0.2
      );
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: star.alpha * 0.3 },
        duration: 1500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }

    this.add.text(320, 60, 'Los Fragmentos de', {
      fontSize: '14px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(320, 85, 'Nuestra Historia', {
      fontSize: '22px',
      color: '#f1c40f',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const heartIcon = this.add.image(320, 115, 'ui_heart').setScale(1.5);
    this.tweens.add({
      targets: heartIcon,
      scale: { from: 1.3, to: 1.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(320, 135, 'Una aventura de María José', {
      fontSize: '10px',
      color: '#ff6b9d',
      fontFamily: 'monospace',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.selectedOption = 0;
    this.hoverIndex = -1;
    this.menuOptions = [];

    const makeOption = (text, action, y) => {
      const btn = this.add.image(320, y, 'btn').setInteractive({ useHandCursor: true });
      const label = this.add.text(320, y, text, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      btn.on('pointerover', () => {
        this.hoverIndex = this.menuOptions.findIndex(o => o.btn === btn);
        this.updateSelection();
      });

      btn.on('pointerout', () => {
        if (this.hoverIndex !== -1) {
          this.hoverIndex = -1;
          this.updateSelection();
        }
      });

      btn.on('pointerdown', () => {
        action();
      });

      return { btn, text: label, label, action, y };
    };

    this.menuOptions.push(makeOption('Nueva historia', () => this.newGame(), 190));
    this.continueOption = makeOption('Continuar', () => this.continueGame(), 226);
    this.continueOption.btn.setVisible(false).setAlpha(0).disableInteractive();
    this.continueOption.label.setVisible(false).setAlpha(0);

    this.visibleOptions = [this.menuOptions[0]];
    this.visibleOptions.push(makeOption('Configuración', () => this.showConfig(), 262));
    this.visibleOptions.push(makeOption('Salir', () => this.quitGame(), 298));

    this.menuOptions = [
      this.menuOptions[0],
      this.continueOption,
      this.visibleOptions[1],
      this.visibleOptions[2],
    ];

    this.refreshVisibleOptions();

    this.add.text(320, 345, 'WASD/↑↓: Mover | ENTER: Seleccionar', {
      fontSize: '8px',
      color: '#666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.lastInput = 0;
    this.updateSelection();

    const saveSystem = new SaveSystem();
    saveSystem.hasSave().then(hasSave => {
      if (hasSave && this.scene.isActive('MenuScene')) {
        this.continueOption.btn.setVisible(true).setAlpha(1).setInteractive({ useHandCursor: true });
        this.continueOption.label.setVisible(true).setAlpha(1);
        this.refreshVisibleOptions();
      }
    }).catch(() => {});
  }

  refreshVisibleOptions() {
    this.visibleOptions = this.menuOptions.filter(o => o.btn.visible);
    if (this.selectedOption >= this.visibleOptions.length) {
      this.selectedOption = 0;
    }
  }

  update(time) {
    if (time - this.lastInput < 200) return;

    if (this.cursors.down.isDown || this.sKey.isDown) {
      this.selectedOption = (this.selectedOption + 1) % this.visibleOptions.length;
      this.updateSelection();
      this.lastInput = time;
    } else if (this.cursors.up.isDown || this.wKey.isDown) {
      this.selectedOption = (this.selectedOption - 1 + this.visibleOptions.length) % this.visibleOptions.length;
      this.updateSelection();
      this.lastInput = time;
    } else if (this.enterKey.isDown) {
      this.visibleOptions[this.selectedOption].action();
      this.lastInput = time;
    }
  }

  updateSelection() {
    const activeIndex = this.hoverIndex >= 0 ? this.hoverIndex : this.selectedOption;
    this.visibleOptions.forEach((opt, i) => {
      const active = i === activeIndex;
      opt.label.setColor(active ? '#f1c40f' : '#ffffff');
      opt.btn.setTint(active ? 0xffffff : 0x8a8a8a);
      this.tweens.killTweensOf(opt.btn);
      this.tweens.add({
        targets: opt.btn,
        scale: active ? 1.06 : 1,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });
  }

  newGame() {
    GameState.reset();
    this.scene.start('IntroScene');
  }

  continueGame() {
    const saveSystem = new SaveSystem();
    saveSystem.load().then(() => {
      this.scene.start('GameScene');
    });
  }

  showConfig() {
    this.scene.start('ConfigScene');
  }

  quitGame() {
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  }
}