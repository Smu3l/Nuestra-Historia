import Phaser from 'phaser';
import { ProceduralAssets } from '../systems/ProceduralAssets.js';
import { NPC_TEXTURE_FILES } from '../data/NpcSprites.js';
import { CASA_TEXTURE_FILES } from '../data/CasaSprites.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.image('mariajose_sheet', 'assets/sprites/mariajose_sheet.png');
    this.load.image('samuel', 'assets/sprites/samuel_npc.png');
    Object.entries(NPC_TEXTURE_FILES).forEach(([key, path]) => {
      this.load.image(key, path);
    });
    Object.entries(CASA_TEXTURE_FILES).forEach(([key, path]) => {
      this.load.image(key, path);
    });
  }

  create() {
    // Filtro LINEAR para el arte importado (casa y NPCs): el pixelArt
    // global usa NEAREST y el reescalado reducido lo serraría.
    [...Object.keys(NPC_TEXTURE_FILES), ...Object.keys(CASA_TEXTURE_FILES)].forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });

    this.cameras.main.setBackgroundColor(0x0a0a1e);

    const barW = 300, barH = 20;
    const barX = (640 - barW) / 2;
    const barY = 180;

    this.add.text(320, 150, 'Generando el mundo...', {
      fontSize: '12px',
      color: '#c4a35a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const bg = this.add.rectangle(320, barY + barH / 2, barW, barH, 0x333333);
    const fill = this.add.rectangle(barX, barY, 0, barH, 0xc4a35a).setOrigin(0, 0);
    const pctText = this.add.text(320, barY + barH + 15, '0%', {
      fontSize: '10px',
      color: '#888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const assets = new ProceduralAssets(this);

    const steps = [
      { name: 'Personajes', fn: () => { assets.generatePlayer(); assets.generateNPCs(); assets.generateSamuel(); } },
      { name: 'Enemigos', fn: () => assets.generateEnemies() },
      { name: 'Jefes', fn: () => assets.generateBosses() },
      { name: 'Terreno', fn: () => assets.generateTiles() },
      { name: 'Objetos', fn: () => assets.generateItems() },
      { name: 'Interfaz', fn: () => assets.generateUI() },
      { name: 'Efectos', fn: () => assets.generateEffects() },
    ];

    let currentStep = 0;
    const runStep = () => {
      if (currentStep >= steps.length) {
        fill.width = barW;
        pctText.setText('100%');
        this.add.text(320, barY + barH + 35, '¡Listo!', {
          fontSize: '10px',
          color: '#55efc4',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        this.time.delayedCall(800, () => {
          this.scene.start('MenuScene');
        });
        return;
      }

      const step = steps[currentStep];
      this.add.text(320, barY - 15, step.name, {
        fontSize: '9px',
        color: '#aaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      try {
        step.fn();
      } catch (e) {
        console.warn(`Step ${step.name} had issues:`, e);
      }

      currentStep++;
      const progress = currentStep / steps.length;
      fill.width = barW * progress;
      pctText.setText(`${Math.round(progress * 100)}%`);

      this.time.delayedCall(200, runStep);
    };

    this.time.delayedCall(300, runStep);
  }
}
