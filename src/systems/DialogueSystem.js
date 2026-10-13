import Phaser from 'phaser';
import { RENDER_SCALE } from '../config/Render.js';

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
    // Caja anclada a cámara: scrollFactor 0 en contenedor e hijos,
    // por lo que NUNCA se lee scrollX/scrollY para posicionarla.
    // Solo se compensa el zoom (que sí afecta a todo lo que dibuja
    // la cámara) para clavar el cuadro en canvas (320, 310).
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(300);
    this.container.setVisible(false);
    this.container.setScrollFactor(0);

    this.bg = this.scene.add.rectangle(320, 50, 620, 90, 0x000000, 0.9);
    this.bg.setStrokeStyle(2, 0xc4a35a);
    this.bg.setScrollFactor(0);
    this.container.add(this.bg);

    this.nameText = this.scene.add.text(40, 10, '', {
      fontSize: '11px',
      color: '#c4a35a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.nameText.setScrollFactor(0);
    this.container.add(this.nameText);

    this.dialogText = this.scene.add.text(40, 28, '', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: 540 },
      lineSpacing: 4,
    });
    this.dialogText.setScrollFactor(0);
    this.container.add(this.dialogText);

    this.promptText = this.scene.add.text(580, 72, '▼', {
      fontSize: '10px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    });
    this.promptText.setScrollFactor(0);
    this.container.add(this.promptText);

    this.scene.tweens.add({
      targets: this.promptText,
      y: this.promptText.y + 3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.reposition();
  }

  show(dialogueLines, onComplete) {
    if (!dialogueLines || dialogueLines.length === 0) return;

    if (this.isActive) {
      // Si ya hay un diálogo abierto (p. ej. fase de boss + fragmento),
      // se encola en vez de perderse: perder el onComplete dejaba el
      // juego sin salida (softlock tras derrotar un boss).
      this._queue = this._queue || [];
      this._queue.push({ lines: dialogueLines, onComplete });
      return;
    }

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
    if (!cam || !this.container) return;

    // Sin leer scrollX/scrollY: con scrollFactor 0 el scroll no afecta.
    // El zoom sí afecta a todo lo dibujado (matriz de cámara), así que
    // se compensa con escala 1/zoom y posición contra el pivote central
    // para clavar el cuadro en canvas (320, 310) a zoom 1 y 1.5.
    // RENDER_SCALE multiplica posición y escala (el canvas real es mayor).
    const zoom = cam.zoom;
    this.container.setScale(RENDER_SCALE / zoom);
    this.container.setPosition(
      (RENDER_SCALE * (320 * (zoom - 1))) / zoom,
      (RENDER_SCALE * (260 + 180 * (zoom - 1))) / zoom
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
    const cb = this.onComplete;
    this.onComplete = null;
    // Si quedó diálogo encolado, se muestra ahora (conserva su callback).
    if (this._queue && this._queue.length > 0) {
      const next = this._queue.shift();
      this.show(next.lines, next.onComplete);
    }
    if (cb) cb();
  }
}
