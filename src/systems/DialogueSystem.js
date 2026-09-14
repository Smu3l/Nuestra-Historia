import Phaser from 'phaser';

export class DialogueSystem {
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;
    this.currentDialogue = [];
    this.currentIndex = 0;
    this.typing = false;
    this.displayedText = '';
    this.fullText = '';
    this.typeTimer = null;
    this.onComplete = null;

    this.container = null;
    this.nameText = null;
    this.dialogText = null;
    this.promptText = null;
    this.portrait = null;
  }

  create() {
    const cam = this.scene.cameras.main;

    this.container = this.scene.add.container(0, cam.height - 100);
    this.container.setDepth(300);
    this.container.setVisible(false);

    this.bg = this.scene.add.rectangle(320, 50, 620, 90, 0x000000, 0.9);
    this.bg.setStrokeStyle(2, 0xc4a35a);
    this.container.add(this.bg);

    this.nameText = this.scene.add.text(40, 10, '', {
      fontSize: '11px',
      color: '#c4a35a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.container.add(this.nameText);

    this.dialogText = this.scene.add.text(40, 28, '', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: 540 },
      lineSpacing: 4,
    });
    this.container.add(this.dialogText);

    this.promptText = this.scene.add.text(580, 72, '▼', {
      fontSize: '10px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    });
    this.container.add(this.promptText);

    this.scene.tweens.add({
      targets: this.promptText,
      y: this.promptText.y + 3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }

  show(dialogueLines, onComplete) {
    if (!dialogueLines || dialogueLines.length === 0 || this.isActive) return;

    this.isActive = true;
    this.currentDialogue = dialogueLines;
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.container.setVisible(true);
    this.scene.isDialogActive = true;
    this.reposition();

    this.showLine();
  }

  reposition() {
    const cam = this.scene.cameras.main;
    if (!cam) return;

    const zoom = cam.zoom;
    const uiScale = 1 / zoom;
    const viewW = 640 / zoom;
    const viewH = 360 / zoom;

    this.container.setScale(uiScale);
    this.container.setPosition(
      cam.scrollX + viewW / 2 - (640 * uiScale) / 2,
      cam.scrollY + viewH - 100 * uiScale
    );
  }

  showLine() {
    if (this.currentIndex >= this.currentDialogue.length) {
      this.hide();
      return;
    }

    const line = this.currentDialogue[this.currentIndex];
    this.fullText = line;
    this.displayedText = '';
    this.typing = true;
    this.dialogText.setText('');

    if (line.includes(':')) {
      const parts = line.split(':');
      this.nameText.setText(parts[0].trim());
      this.fullText = parts.slice(1).join(':').trim();
    } else {
      this.nameText.setText('');
    }

    let charIndex = 0;
    if (this.typeTimer) this.typeTimer.destroy();
    this.promptText.setAlpha(0);
    this.typeTimer = this.scene.time.addEvent({
      delay: 30,
      repeat: this.fullText.length - 1,
      callback: () => {
        if (charIndex < this.fullText.length) {
          this.displayedText += this.fullText[charIndex];
          this.dialogText.setText(this.displayedText);
          charIndex++;
        } else {
          this.typing = false;
          this.promptText.setAlpha(1);
        }
      },
    });
  }

  advance() {
    if (!this.isActive) return;

    if (this.typing) {
      this.typing = false;
      if (this.typeTimer) this.typeTimer.destroy();
      this.displayedText = this.fullText;
      this.dialogText.setText(this.fullText);
    } else {
      this.currentIndex++;
      this.showLine();
    }
  }

  hide() {
    this.isActive = false;
    this.container.setVisible(false);
    this.scene.isDialogActive = false;
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }
}
