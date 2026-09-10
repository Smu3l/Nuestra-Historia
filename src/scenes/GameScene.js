import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { Maps } from '../data/Maps.js';
import { Dialogues } from '../data/Dialogues.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { HUD } from '../ui/HUD.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.targetMap = data?.map || GameState.currentMap;
    this.spawnX = data?.spawnX;
    this.spawnY = data?.spawnY;
  }

  create() {
    this.isDialogActive = false;
    this.interactables = [];
    this.npcSprites = [];
    this.enemySprites = [];
    this.EnemyClass = Enemy;

    this.dialogueSystem = new DialogueSystem(this);
    this.dialogueSystem.create();

    this.mapGroup = this.physics.add.staticGroup();
    this.loadMap(this.targetMap);

    this.player = new Player(
      this,
      this.spawnX ?? this.currentMapData.playerStart.x,
      this.spawnY ?? this.currentMapData.playerStart.y
    );
    this.player.setDepth(10);

    this.setupCollisions();
    this.hud = new HUD(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      } else {
        this.player.attack();
      }
    });

    this.input.keyboard.on('keydown-E', () => {
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      } else {
        this.player.interact();
      }
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      }
    });

    this.escKey.on('down', () => {
      if (this.isDialogActive) {
        this.dialogueSystem.hide();
      } else {
        this.scene.launch('PauseScene');
        this.scene.pause();
      }
    });

    this.events.on('player-hurt', (hp) => {
      this.hud.update();
    });

    this.events.on('player-death', () => {
      this.handleDeath();
    });

    this.events.on('boss-defeated', () => {
      this.handleBossDefeated();
    });

    this.events.on('boss-start', (name) => {
      if (this.currentBoss && this.currentBoss.config.dialogue_intro) {
        this.isDialogActive = true;
        const lines = Dialogues[this.currentBoss.config.dialogue_intro] || [];
        this.dialogueSystem.show(lines);
      }
    });

    if (!GameState.visitedMaps.includes(this.targetMap)) {
      GameState.visitedMaps.push(this.targetMap);
    }

    GameState.currentMap = this.targetMap;

    this.hud.showMapName(this.currentMapData.name);

    this.checkTriggers();
    this.createAmbientEffects();

    this.cameras.main.fadeIn(500);
  }

  loadMap(mapId) {
    const mapData = Maps[mapId];
    if (!mapData) {
      console.error('Map not found:', mapId);
      return;
    }

    this.currentMapData = mapData;
    this.currentMapId = mapId;

    this.mapTiles = [];
    this.interactables = [];
    this.npcSprites = [];
    this.enemySprites = [];

    this.cameras.main.setBackgroundColor(mapData.bgColor);
    this.physics.world.setBounds(0, 0, mapData.width * 16, mapData.height * 16);

    const tileGraphics = {};
    for (const [id, name] of Object.entries(mapData.tileNames)) {
      if (name && this.textures.exists(name)) {
        tileGraphics[id] = name;
      }
    }

    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tileId = mapData.tiles[y]?.[x] ?? 0;
        const tileName = tileGraphics[tileId];

        if (tileName && this.textures.exists(tileName)) {
          const tile = this.mapGroup.create(x * 16 + 8, y * 16 + 8, tileName);
          tile.setDepth(0);
          tile.refreshBody();

          if (mapData.walls && mapData.walls.includes(tileId)) {
            tile.body.setSize(16, 16);
          }

          this.mapTiles.push(tile);
        }
      }
    }

    if (mapData.objects) {
      mapData.objects.forEach(obj => {
        const worldX = obj.tileX * 16 + 8;
        const worldY = obj.tileY * 16 + 8;

        if (obj.type === 'exit') {
          const exitZone = this.add.zone(worldX, worldY, 16, 16);
          this.physics.add.existing(exitZone, true);
          exitZone.interactType = 'exit';
          exitZone.targetMap = obj.target;
          exitZone.spawnX = obj.spawnX;
          exitZone.spawnY = obj.spawnY;
          this.interactables.push(exitZone);

          const doorSprite = this.add.image(worldX, worldY, 'tile_door');
          doorSprite.setDepth(1);
        } else if (obj.type === 'boss_arena') {
          const zone = this.add.zone(worldX, worldY, 16, 16);
          this.physics.add.existing(zone, true);
          zone.interactType = 'boss_arena';
          zone.targetMap = obj.target;
          this.interactables.push(zone);

          if (this.textures.exists('tile_campfire')) {
            const sprite = this.add.image(worldX, worldY, 'tile_campfire');
            sprite.setDepth(1);
          }
        } else if (obj.type === 'final_boss') {
          const zone = this.add.zone(worldX, worldY, 16, 16);
          this.physics.add.existing(zone, true);
          zone.interactType = 'boss_arena';
          zone.targetMap = obj.target;
          this.interactables.push(zone);

          const sprite = this.add.image(worldX, worldY, 'tile_fragment');
          sprite.setDepth(1);
          this.tweens.add({
            targets: sprite,
            y: worldY - 4,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        } else if (obj.type === 'interact') {
          const zone = this.add.zone(worldX, worldY, 20, 20);
          this.physics.add.existing(zone, true);
          zone.interactType = 'object';
          zone.interactDialogue = obj.dialogue || obj.id;
          this.interactables.push(zone);

          if (obj.sprite && this.textures.exists(obj.sprite)) {
            const sprite = this.add.image(worldX, worldY, obj.sprite);
            sprite.setDepth(1);
          }

          const indicator = this.add.text(worldX, worldY - 14, '▼', {
            fontSize: '8px', color: '#f1c40f', fontFamily: 'monospace',
          }).setOrigin(0.5).setVisible(false).setDepth(60);
          zone.interactIndicator = indicator;
          this.tweens.add({
            targets: indicator,
            y: worldY - 17,
            duration: 600,
            yoyo: true,
            repeat: -1,
          });
        }
      });
    }

    if (mapData.npcs) {
      mapData.npcs.forEach(npcData => {
        const nx = npcData.tileX * 16 + 8;
        const ny = npcData.tileY * 16 + 12;
        const npcSprite = this.add.sprite(nx, ny, npcData.sprite);
        npcSprite.setDepth(10);

        npcSprite.interactType = 'npc';
        npcSprite.interactDialogue = npcData.dialogue;
        npcSprite.npcName = npcData.name;

        const nameTag = this.add.text(nx, ny - 20, npcData.name, {
          fontSize: '7px', color: '#c4a35a', fontFamily: 'monospace',
          stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(11);

        const indicator = this.add.text(nx, ny - 28, '▼', {
          fontSize: '8px', color: '#f1c40f', fontFamily: 'monospace',
        }).setOrigin(0.5).setVisible(false).setDepth(60);
        npcSprite.interactIndicator = indicator;

        this.tweens.add({
          targets: indicator,
          y: ny - 31,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });

        this.npcSprites.push(npcSprite);
        this.interactables.push(npcSprite);
      });
    }

    if (mapData.enemies && !GameState.defeatedBosses.includes(`boss_${mapId}`)) {
      mapData.enemies.forEach(enemyData => {
        const enemy = new Enemy(this, enemyData.x, enemyData.y, enemyData);
        enemy.setDepth(9);
        this.enemySprites.push(enemy);
      });
    }

    if (mapData.boss && !GameState.defeatedBosses.includes(mapData.boss.type)) {
      const bx = Math.floor(mapData.width / 2);
      const by = 3;
      this.currentBoss = new Boss(this, bx, by, mapData.boss);
      this.currentBoss.setDepth(15);
    }

    if (mapData.letters) {
      mapData.letters.forEach(letterData => {
        if (GameState.collectedLetters.includes(letterData.id)) return;

        const lx = letterData.tileX * 16 + 8;
        const ly = letterData.tileY * 16 + 8;
        const letterSprite = this.add.image(lx, ly, 'tile_letter');
        letterSprite.setDepth(5);

        this.tweens.add({
          targets: letterSprite,
          y: ly - 3,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        const zone = this.add.zone(lx, ly, 16, 16);
        this.physics.add.existing(zone, true);
        zone.interactType = 'letter';
        zone.letterId = letterData.id;

        const indicator = this.add.text(lx, ly - 14, '▼', {
          fontSize: '8px', color: '#f1c40f', fontFamily: 'monospace',
        }).setOrigin(0.5).setVisible(false).setDepth(60);
        zone.interactIndicator = indicator;

        this.tweens.add({
          targets: indicator,
          y: ly - 17,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });

        this.interactables.push(zone);
      });
    }
  }

  setupCollisions() {
    const wallTiles = this.mapTiles.filter(tile => {
      if (!this.currentMapData.walls) return false;
      const tx = Math.floor((tile.x - 8) / 16);
      const ty = Math.floor((tile.y - 8) / 16);
      const tileId = this.currentMapData.tiles[ty]?.[tx] ?? -1;
      return this.currentMapData.walls.includes(tileId);
    });

    if (wallTiles.length > 0) {
      const wallGroup = this.physics.add.staticGroup();
      wallTiles.forEach(w => {
        const newWall = wallGroup.create(w.x, w.y, w.texture.key);
        newWall.setAlpha(0);
        newWall.refreshBody();
      });
      this.physics.add.collider(this.player, wallGroup);
    }

    this.physics.add.overlap(this.player, this.enemySprites, (player, enemy) => {
      if (!enemy.active || enemy.isDead) return;
      if (!player.invincible && !player.isHurt) {
        player.takeDamage(enemy.damage);
      }
    });

    this.enemySprites.forEach(enemy => {
      if (!enemy.active) return;

      this.time.addEvent({
        delay: 100,
        repeat: -1,
        callback: () => {
          if (!enemy.active || enemy.isDead || !this.player.attackHitbox) return;
          if (this.physics.overlap(this.player.attackHitbox, enemy)) {
            enemy.takeDamage(1);
            this.player.attackHitbox.destroy();
            this.player.attackHitbox = null;
          }
        },
      });
    });

    if (this.currentBoss && !this.currentBoss.isDead) {
      this.time.addEvent({
        delay: 100,
        repeat: -1,
        callback: () => {
          if (!this.currentBoss || this.currentBoss.isDead || !this.player.attackHitbox) return;
          if (this.physics.overlap(this.player.attackHitbox, this.currentBoss)) {
            this.currentBoss.takeDamage(1);
            this.player.attackHitbox.destroy();
            this.player.attackHitbox = null;
          }
        },
      });

      this.physics.add.overlap(this.player, this.currentBoss, () => {
        if (!this.currentBoss.isDead && !this.player.invincible && !this.player.isHurt) {
          this.player.takeDamage(this.currentBoss.damage);
        }
      });
    }
  }

  checkTriggers() {
    if (!this.currentMapData.triggers) return;
    this.currentMapData.triggers.forEach(trigger => {
      if (trigger.once && GameState.visitedMaps.includes(`trigger_${trigger.id}`)) return;
      if (trigger.condition === 'first_visit') {
        GameState.visitedMaps.push(`trigger_${trigger.id}`);
        this.time.delayedCall(800, () => {
          this.showDialogue(Dialogues[trigger.dialogue] || [trigger.dialogue]);
        });
      }
    });
  }

  createAmbientEffects() {
    if (!this.currentMapData) return;
    const mapId = this.currentMapId;

    if (mapId.includes('toxicidad') || mapId.includes('boss_toxicidad')) {
      for (let i = 0; i < 8; i++) {
        const fog = this.add.circle(
          Math.random() * this.currentMapData.width * 16,
          Math.random() * this.currentMapData.height * 16,
          20 + Math.random() * 30,
          0x88aa88,
          0.1
        );
        fog.setDepth(20);
        this.tweens.add({
          targets: fog,
          x: fog.x + (Math.random() - 0.5) * 100,
          alpha: { from: 0.05, to: 0.15 },
          duration: 3000 + Math.random() * 3000,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    if (mapId.includes('celos') || mapId.includes('boss_celos')) {
      for (let i = 0; i < 20; i++) {
        const star = this.add.circle(
          Math.random() * this.currentMapData.width * 16,
          Math.random() * 100,
          1,
          0xffffff,
          Math.random() * 0.5 + 0.2
        );
        star.setDepth(1);
        this.tweens.add({
          targets: star,
          alpha: { from: star.alpha, to: star.alpha * 0.2 },
          duration: 1000 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
        });
      }

      const moon = this.add.circle(this.currentMapData.width * 16 - 40, 40, 15, 0xf5f5dc, 0.8);
      moon.setDepth(1);
      const moonGlow = this.add.circle(this.currentMapData.width * 16 - 40, 40, 25, 0xf5f5dc, 0.2);
      moonGlow.setDepth(0);
    }

    if (mapId.includes('recuerdos') || mapId.includes('boss_coleccionista')) {
      for (let i = 0; i < 15; i++) {
        const sp = this.add.sprite(
          Math.random() * this.currentMapData.width * 16,
          Math.random() * this.currentMapData.height * 16,
          'sparkle'
        );
        sp.setTint(Phaser.Math.RND.pick([0xf1c40f, 0xff6b9d, 0x74b9ff]));
        sp.setAlpha(0.4);
        sp.setDepth(1);
        this.tweens.add({
          targets: sp,
          alpha: { from: 0.2, to: 0.8 },
          scale: { from: 0.5, to: 1.5 },
          duration: 1500 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 2000,
        });
      }
    }

    if (mapId === 'montanas_inseguridad') {
      for (let i = 0; i < 3; i++) {
        const cloud = this.add.ellipse(
          Math.random() * this.currentMapData.width * 16,
          30 + Math.random() * 60,
          40 + Math.random() * 30,
          10 + Math.random() * 10,
          0xdfe6e9,
          0.3
        );
        cloud.setDepth(1);
        this.tweens.add({
          targets: cloud,
          x: cloud.x + 100,
          duration: 8000 + Math.random() * 4000,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  update(time, delta) {
    if (this.isDialogActive) return;

    const cursorKeys = {
      up: this.wKey.isDown || this.cursors.up.isDown,
      down: this.sKey.isDown || this.cursors.down.isDown,
      left: this.aKey.isDown || this.cursors.left.isDown,
      right: this.dKey.isDown || this.cursors.right.isDown,
    };

    this.player.update(cursorKeys, time, delta);

    this.enemySprites.forEach(enemy => {
      if (enemy.active && !enemy.isDead) {
        enemy.update(time, delta);
      }
    });

    if (this.currentBoss && !this.currentBoss.isDead) {
      this.currentBoss.update(time, delta);
    }

    this.hud.update();
  }

  showDialogue(dialogueId) {
    const lines = Dialogues[dialogueId] || [dialogueId];
    this.dialogueSystem.show(lines);
  }

  collectLetter(letterId) {
    if (GameState.collectedLetters.includes(letterId)) return;
    GameState.collectedLetters.push(letterId);

    const lines = Dialogues.letters[letterId] || ['Carta encontrada.'];
    this.dialogueSystem.show(lines);
  }

  collectFragment(fragmentData) {
    this.showDialogue(Dialogues[fragmentData] || ['Fragmento obtenido.']);
  }

  changeMap(targetMap, spawnX, spawnY) {
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.cleanupMap();
      this.scene.restart({ map: targetMap, spawnX, spawnY });
    });
  }

  cleanupMap() {
    this.mapTiles.forEach(t => t.destroy());
    this.interactables.forEach(i => {
      if (i.interactIndicator) i.interactIndicator.destroy();
      i.destroy();
    });
    this.npcSprites.forEach(n => n.destroy());
    this.enemySprites.forEach(e => {
      if (e.active) {
        e.hpBarBg?.destroy();
        e.hpBar?.destroy();
        e.destroy();
      }
    });
    if (this.currentBoss && this.currentBoss.active) {
      this.currentBoss.destroy();
    }
    this.mapGroup.clear(true, true);
    if (this.hud) this.hud.destroy();
  }

  handleDeath() {
    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      GameState.hp = GameState.maxHP;
      this.cleanupMap();
      this.scene.restart({ map: this.currentMapId });
    });
  }

  showFragmentScene(fragmentId, fragmentName) {
    const lines = Dialogues[fragmentId] || ['Fragmento obtenido.'];
    this.dialogueSystem.show(lines, () => {
      this.cameras.main.fade(800, 255, 246, 210);
      const returnX = Math.floor(this.player.x / 16);
      const returnY = Math.floor(this.player.y / 16);
      this.time.delayedCall(1000, () => {
        this.scene.start('MemoryScene', { fragmentId, fragmentName, returnMap: this.currentMapId, returnX, returnY });
      });
    });
  }

  spawnHealthDrop(x, y) {
    const heart = this.add.sprite(x, y, 'ui_heart');
    heart.setDepth(5);
    this.tweens.add({
      targets: heart,
      y: y - 4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const zone = this.add.zone(x, y, 16, 16);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => {
      this.player.heal(2);
      heart.destroy();
      zone.destroy();
    });
  }

  handleBossDefeated() {
    if (this.currentMapId === 'boss_coleccionista') {
      this.time.delayedCall(1000, () => {
        this.cameras.main.fade(1000, 0, 0, 0);
        this.time.delayedCall(1200, () => {
          this.scene.start('FinalScene');
        });
      });
    } else if (this.currentMapId === 'boss_distancia') {
      this.showReturnPortal('pantano_toxicidad', 1, 10);
    } else if (this.currentMapId === 'boss_toxicidad') {
      this.showReturnPortal('valle_desinteres', 1, 10);
    } else if (this.currentMapId === 'boss_desinteres') {
      this.showReturnPortal('montanas_inseguridad', 1, 10);
    } else if (this.currentMapId === 'boss_inseguridad') {
      this.showReturnPortal('lago_celos', 1, 10);
    } else if (this.currentMapId === 'boss_celos') {
      this.showReturnPortal('reino_recuerdos', 12, 18);
    }
  }

  showReturnPortal(targetMap, spawnX, spawnY) {
    const portalZone = this.add.zone(320, 200, 32, 32);
    this.physics.add.existing(portalZone, true);

    const portal = this.add.circle(320, 200, 16, 0xc4a35a, 0.6);
    this.tweens.add({
      targets: portal,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.4, to: 0.8 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const label = this.add.text(320, 230, 'Portal - Pulsa E', {
      fontSize: '10px',
      color: '#c4a35a',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const indicator = this.add.text(320, 170, '▼', {
      fontSize: '10px', color: '#f1c40f', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: indicator,
      y: 167,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.interactables.push(portalZone);
    portalZone.interactType = 'exit';
    portalZone.targetMap = targetMap;
    portalZone.spawnX = spawnX;
    portalZone.spawnY = spawnY;
    portalZone.interactIndicator = indicator;

    this.physics.add.overlap(this.player, portalZone, () => {
      indicator.setVisible(true);
    });
  }
}
