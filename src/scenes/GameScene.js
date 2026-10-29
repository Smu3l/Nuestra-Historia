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
import { RENDER_SCALE, CAM_OFFSET_X, CAM_OFFSET_Y } from '../config/Render.js';
import { NPC_BY_NAME } from '../data/NpcSprites.js';
import { MAP_CASA_ART } from '../data/CasaSprites.js';

// Aviso al desbloquear cada habilidad (nombre + tecla/uso).
const ABILITY_UNLOCK = {
  fragment_distancia: {
    name: 'Dash - Evasión rápida',
    hint: 'Pulsa SHIFT o haz doble-tap en WASD/flechas',
  },
  fragment_toxicidad: {
    name: 'Ataque amplio',
    hint: 'Pasiva: tus ataques con ESPACIO llegan más lejos',
  },
  fragment_inseguridad: {
    name: 'Corazón extra',
    hint: 'Pasiva: +1 corazón permanente',
  },
  fragment_celos: {
    name: 'Aura expansiva',
    hint: 'Pasiva: cada ataque daña a enemigos cercanos',
  },
};

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
    this._deathInProgress = false;
    this._finalStarted = false;
    this.interactables = [];
    this.npcSprites = [];
    this.enemySprites = [];
    this.ySortables = [];
    this.EnemyClass = Enemy;

    this.dialogueSystem = new DialogueSystem(this);
    this.dialogueSystem.create();
    this.saveSystem = new SaveSystem();

    this.mapGroup = this.physics.add.staticGroup();
    this.loadMap(this.targetMap);

    const spawnHere = this.findSafeSpawn(this.currentMapData, this.spawnX ?? this.currentMapData.playerStart.x, this.spawnY ?? this.currentMapData.playerStart.y);
    this.player = new Player(this, spawnHere.x, spawnHere.y);
    this.ySortables.push(this.player);

    this.setupCamera();
    if (this.currentBoss) {
      this.currentBoss.anchorHud();
    }

    this.setupCollisions();
    this.hud = new HUD(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    // PUNTO 9: Shift para dash
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // PUNTO 1: Doble-tap para dash. Se usa el teclado global (los
    // listeners keyboard.on se limpian al reiniciar la escena; los
    // objetos Key sueltos acumularían handlers entre restarts).
    this._lastDirTap = { key: null, time: 0 };
    const dashDirMap = {
      W: [0, -1], UP: [0, -1], S: [0, 1], DOWN: [0, 1],
      A: [-1, 0], LEFT: [-1, 0], D: [1, 0], RIGHT: [1, 0],
    };
    Object.keys(dashDirMap).forEach(k => {
      this.input.keyboard.on(`keydown-${k}`, () => {
        if (this.isDialogActive) return;
        const now = this.time.now;
        if (this._lastDirTap.key === k && now - this._lastDirTap.time < 250) {
          // Doble tap — disparar dash en esa dirección
          const [dx, dy] = dashDirMap[k];
          this.player.dash(dx, dy);
          this._lastDirTap = { key: null, time: 0 };
        } else {
          this._lastDirTap = { key: k, time: now };
        }
      });
    });

    // Ataque (SPACE) — sencillo o cargado
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (event.repeat) return;
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      } else {
        // Registrar inicio de carga
        this._spaceDownTime = this.time.now;
      }
    });

    this.input.keyboard.on('keyup-SPACE', (event) => {
      if (this.isDialogActive) return;
      const held = this.time.now - (this._spaceDownTime || 0);
      this._spaceDownTime = 0;
      if (held >= 500) {
        // Ataque cargado
        this.player.chargeTime = held;
        this.player.attack(true);
      } else {
        this.player.attack(false);
      }
    });

    // Shift = dash instantáneo en dirección actual
    this.input.keyboard.on('keydown-SHIFT', (event) => {
      if (event.repeat || this.isDialogActive) return;
      this.player.dash(0, 0);
    });

    this.input.keyboard.on('keydown-E', (event) => {
      if (event.repeat) return;
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      } else {
        this.player.interact();
      }
    });

    this.input.keyboard.on('keydown-ENTER', (event) => {
      if (event.repeat) return;
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      }
    });

    this.input.on('pointerdown', () => {
      if (this.isDialogActive) {
        this.dialogueSystem.advance();
      }
    });

    this.input.keyboard.on('keydown-ESC', (event) => {
      if (event.repeat) return;
      if (this.isDialogActive) {
        this.dialogueSystem.hide();
      } else {
        this.scene.launch('PauseScene');
        this.scene.pause();
      }
    });

    // scene.events survive scene.restart in Phaser, so bind these once per
    // scene instance; otherwise every restart duplicates listeners and a
    // single death would trigger N handleDeath calls (restart storm).
    if (!this._listenersBound) {
      this._listenersBound = true;

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
    }

    if (!GameState.visitedMaps.includes(this.targetMap)) {
      GameState.visitedMaps.push(this.targetMap);
      // PUNTO 7: Mostrar nombre del mapa como "pantalla de llegada" al entrar por primera vez
      this._showWorldMapHint(this.targetMap);
    }

    GameState.currentMap = this.targetMap;

    this.hud.showMapName(this.currentMapData.name);

    this.checkTriggers();
    this.maybeSpawnArenaReturnPortal();
    this.maybeGoFinalScene();
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

    // Arte definitivo de la casa: solo cambia lo que se dibuja (los
    // placeholders se ocultan y las piezas se dibujan en sus mismos
    // anclas); cuerpos, zonas y colisiones no se tocan.
    const casaArt = mapId === 'casa' ? MAP_CASA_ART : null;

    this.mapTiles = [];
    this.interactables = [];
    this.npcSprites = [];
    this.currentBoss = null;
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
            const body = mapData.wallBodies && mapData.wallBodies[tileId];
            if (body) {
              tile.body.setSize(body.width, body.height);
              tile.body.offset.set(body.offsetX ?? 0, body.offsetY ?? 0);
            } else {
              tile.body.setSize(16, 16);
            }
          }

          this.mapTiles.push(tile);

          if (casaArt && casaArt.colliders && casaArt.colliders[tileId]) {
            // Hitbox solo en la base del mueble: cuerpo duro infranqueable,
            // pero el sprite del jugador puede superponerse por arriba al
            // caminar detrás (perspectiva top-down).
            const b = casaArt.colliders[tileId];
            tile.body.setSize(b.width, b.height);
            tile.body.setOffset(b.offsetX, b.offsetY);
          }

          if (casaArt && casaArt.ocultarTiles.includes(`${x},${y}`)) {
            // Placeholder reemplazado por una pieza del arte: solo se
            // oculta el dibujo; el cuerpo estático sigue intacto.
            tile.setVisible(false);
          }
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

          if (!(casaArt && casaArt.ocultarSalida)) {
            const doorSprite = this.add.image(worldX, worldY, 'tile_door');
            doorSprite.setDepth(1);
          }
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

          if (obj.sprite && this.textures.exists(obj.sprite)
            && !(casaArt && casaArt.ocultarObjetos.includes(obj.id))) {
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

    if (casaArt && casaArt.piezas) {
      // Piezas del arte definitivo: mismo ancla que el placeholder que
      // reemplazan (centro de casilla) y altura en mundo con la proporción
      // original del PNG. Dibujo puro: sin cuerpos ni zonas nuevas.
      casaArt.piezas.forEach((piece) => {
        if (!this.textures.exists(piece.key)) return;
        const img = this.add.image(piece.tileX * 16 + 8, piece.tileY * 16 + 8, piece.key);
        img.setScale(piece.height / img.height);
        this.ySortables.push(img);
      });
    }

    if (mapData.npcs) {
      mapData.npcs.forEach(npcData => {
        const nx = npcData.tileX * 16 + 8;
        const feetY = npcData.tileY * 16 + 16;
        const override = NPC_BY_NAME[npcData.name];

        let npcSprite;
        let topY; // borde superior visible, para colocar el nombre/indicador

        if (override && this.textures.exists(override.key)) {
          // Sprite estatico de alta resolucion: se conserva el PNG original
          // (sin recomprimir ni reducir) y se filtra LINEAR para que el
          // reescalado sea nitido (el pixelArt global usa NEAREST y lo
          // aserraria). El origen va en los pies para que el vaiven pivotee
          // sobre el suelo.
          this.textures.get(override.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
          npcSprite = this.add.image(nx, feetY, override.key);
          npcSprite.setScale(override.height / override.contentH);
          npcSprite.setOrigin(override.originX, override.originY);
          topY = feetY - override.height;
        } else {
          npcSprite = this.add.sprite(nx, feetY - 4, npcData.sprite);
          topY = feetY - 16;
        }
        this.ySortables.push(npcSprite);

        npcSprite.interactType = 'npc';
        npcSprite.interactDialogue = npcData.dialogue;
        npcSprite.npcName = npcData.name;

        const nameTag = this.add.text(nx, topY - 4, npcData.name, {
          fontSize: '7px', color: '#c4a35a', fontFamily: 'monospace',
          stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(11);

        const indicator = this.add.text(nx, topY - 12, '▼', {
          fontSize: '8px', color: '#f1c40f', fontFamily: 'monospace',
        }).setOrigin(0.5).setVisible(false).setDepth(60);
        npcSprite.interactIndicator = indicator;

        this.tweens.add({
          targets: indicator,
          y: topY - 15,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });

        // Idle "tambaleo": vaiven suave de izquierda a derecha rotando sobre
        // los pies. El retardo y la duracion varian por NPC para que no se
        // muevan todos sincronizados.
        this.tweens.add({
          targets: npcSprite,
          angle: { from: -2.5, to: 2.5 },
          duration: 1200 + ((npcData.tileX + npcData.tileY) % 5) * 140,
          delay: (npcData.tileX * 37 + npcData.tileY * 71) % 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.npcSprites.push(npcSprite);
        this.interactables.push(npcSprite);
      });
    }

    if (mapData.enemies && !GameState.defeatedBosses.includes(`boss_${mapId}`)) {
      mapData.enemies.forEach(enemyData => {
        const enemy = new Enemy(this, enemyData.x, enemyData.y, enemyData);
        this.ySortables.push(enemy);
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
        // MEJORA MENOR: Partículas giratorias para hacer las cartas más visibles
        for (let i = 0; i < 3; i++) {
          const angle0 = (i / 3) * Math.PI * 2;
          const orbit = this.add.sprite(
            lx + Math.cos(angle0) * 10,
            ly + Math.sin(angle0) * 10,
            'sparkle'
          );
          orbit.setTint(0xf1c40f);
          orbit.setScale(0.5);
          orbit.setDepth(6);
          orbit.setAlpha(0.7);
          let angle = angle0;
          this.time.addEvent({
            delay: 50,
            repeat: -1,
            callback: () => {
              angle += 0.08;
              orbit.x = lx + Math.cos(angle) * 12;
              orbit.y = (ly - 3) + Math.sin(angle) * 8;
            },
          });
        }
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

  findSafeSpawn(mapData, tileX, tileY) {
    const walls = mapData.walls || [];
    const w = mapData.width;
    const h = mapData.height;
    const isWalkable = (x, y) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return false;
      const id = mapData.tiles[y]?.[x];
      return id !== undefined && !walls.includes(id);
    };
    const boxClear = (x, y) => {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!isWalkable(x + dx, y + dy)) return false;
        }
      }
      return true;
    };
    if (boxClear(tileX, tileY)) return { x: tileX, y: tileY };
    for (let y = tileY - 1; y >= Math.max(0, tileY - 8); y--) {
      if (boxClear(tileX, y)) return { x: tileX, y };
    }
    return { x: tileX, y: tileY };
  }

  setupCamera() {
    const cam = this.cameras.main;
    const mapW = this.currentMapData.width * 16;
    const mapH = this.currentMapData.height * 16;

    cam.setBackgroundColor(this.currentMapData.bgColor);
    // El zoom "de juego" (1 o 2) se multiplica por RENDER_SCALE porque el
    // canvas real es más grande; el layout lógico sigue midiendo 640x360.
    const baseZoom = this.computeCameraZoom(mapW, mapH);
    cam.setZoom(baseZoom * RENDER_SCALE);

    this._camMapW = mapW;
    this._camMapH = mapH;

    const viewW = 640 / baseZoom;
    const viewH = 360 / baseZoom;

    if (mapW <= viewW || mapH <= viewH) {
      // Mapa chico: cámara fija centrada, sin follow ni lerp.
      // El zoom pivota en el centro del canvas (origen 0.5 de Phaser),
      // así que el scroll se calcula contra el tamaño base 640x360
      // (equivale a centerOn(mapW/2, mapH/2)). Para casa: (-160, -60).
      this._camFixed = true;
      this._camSX = (mapW - 640) / 2;
      this._camSY = (mapH - 360) / 2;
    } else {
      // Mapa grande: seguimiento manual con deadzone.
      this._camFixed = false;
      this._camSX = this.player
        ? Phaser.Math.Clamp(this.player.x - viewW / 2, 0, mapW - viewW)
        : 0;
      this._camSY = this.player
        ? Phaser.Math.Clamp(this.player.y - viewH / 2, 0, mapH - viewH)
        : 0;
    }

    this.updateCamera();
  }

  computeCameraZoom(mapW, mapH) {
    if (mapW <= 640 && mapH <= 360) {
      return Phaser.Math.Clamp(Math.min(640 / mapW, 360 / mapH), 1, 2);
    }
    return 1;
  }

  updateCamera() {
    if (!this.player) return;

    const cam = this.cameras.main;
    // cam.zoom incluye RENDER_SCALE; el layout lógico sigue siendo 640x360.
    const baseZoom = cam.zoom / RENDER_SCALE;
    const viewW = 640 / baseZoom;
    const viewH = 360 / baseZoom;
    const mapW = this._camMapW;
    const mapH = this._camMapH;

    // Jugador siempre dentro del mundo: nunca medio cortado en paredes/puerta.
    if (this.player.body) {
      const cx = Phaser.Math.Clamp(this.player.x, 8, mapW - 8);
      const cy = Phaser.Math.Clamp(this.player.y, 8, mapH - 8);
      if (cx !== this.player.x || cy !== this.player.y) {
        this.player.body.reset(cx, cy);
      }
    }

    if (this._camFixed) {
      // Mapa chico: scroll fijo centrado, una sola vez y siempre igual.
      // Cero follow, cero deadzone, cero lerp.
      this._camSX = (mapW - 640) / 2;
      this._camSY = (mapH - 360) / 2;
      cam.setScroll(this._camSX - CAM_OFFSET_X, this._camSY - CAM_OFFSET_Y);
      return;
    }

    const fixedX = mapW <= viewW;
    const fixedY = mapH <= viewH;

    if (fixedX && fixedY) {
      // Respaldo por ejes: mapa chico aunque _camFixed se haya perdido.
      this._camSX = (mapW - 640) / 2;
      this._camSY = (mapH - 360) / 2;
      cam.setScroll(this._camSX - CAM_OFFSET_X, this._camSY - CAM_OFFSET_Y);
      return;
    }

    // Deadzone: jugador puede moverse libremente en esta zona central sin que la cámara mueva.
    // El tamaño de la deadzone es el 10% del viewport en cada eje para mayor fluidez.
    const deadzoneX = viewW * 0.10;
    const deadzoneY = viewH * 0.10;

    // scrollX está desplazado por RENDER_SCALE: se devuelve al espacio lógico.
    const screenCenterX = cam.scrollX + CAM_OFFSET_X + viewW / 2;
    const screenCenterY = cam.scrollY + CAM_OFFSET_Y + viewH / 2;

    let tx = Phaser.Math.Clamp(this.player.x - viewW / 2, 0, Math.max(0, mapW - viewW));
    let ty = Phaser.Math.Clamp(this.player.y - viewH / 2, 0, Math.max(0, mapH - viewH));

    // Si el jugador está dentro de la deadzone, cámara quieta (no mover scroll).
    // Si sale de la deadzone, mover cámara hacia jugador (clamped al mundo).
    if (Math.abs(this.player.x - screenCenterX) > deadzoneX || Math.abs(this.player.y - screenCenterY) > deadzoneY) {
      // Mover cámara hacia jugador
      if (!fixedX) {
        tx = Phaser.Math.Clamp(this.player.x - viewW / 2, 0, mapW - viewW);
        // Añadir suavizado lerp
        this._camSX += (tx - this._camSX) * 0.14;
        if (Math.abs(tx - this._camSX) < 0.1) this._camSX = tx;
        this._camSX = Phaser.Math.Clamp(this._camSX, 0, mapW - viewW);
      }
      if (!fixedY) {
        ty = Phaser.Math.Clamp(this.player.y - viewH / 2, 0, mapH - viewH);
        this._camSY += (ty - this._camSY) * 0.14;
        if (Math.abs(ty - this._camSY) < 0.1) this._camSY = ty;
        this._camSY = Phaser.Math.Clamp(this._camSY, 0, mapH - viewH);
      }
    } else {
      // Jugador dentro de deadzone: cámara quieta (mantener _camSX/_camSY actuales).
      // Asegurar que no se salga del mundo si ya estaba moviéndose.
      if (!fixedX) this._camSX = Phaser.Math.Clamp(this._camSX, 0, mapW - viewW);
      else this._camSX = (mapW - 640) / 2;
      if (!fixedY) this._camSY = Phaser.Math.Clamp(this._camSY, 0, mapH - viewH);
      else this._camSY = (mapH - 360) / 2;
    }

    cam.setScroll(this._camSX - CAM_OFFSET_X, this._camSY - CAM_OFFSET_Y);
  }

  setupCollisions() {
    // Arte definitivo de la casa (solo aplica al mapa 'casa').
    const casaArt = this.currentMapId === 'casa' ? MAP_CASA_ART : null;

    const wallTiles = this.mapTiles.filter(tile => {
      if (!this.currentMapData.walls) return false;
      const tx = Math.floor((tile.x - 8) / 16);
      const ty = Math.floor((tile.y - 8) / 16);
      const tileId = this.currentMapData.tiles[ty]?.[tx] ?? -1;
      return this.currentMapData.walls.includes(tileId);
    });

    if (wallTiles.length > 0) {
      this.physics.add.collider(this.player, wallTiles);
    }

    // Colisiones con el mobiliario de la casa (mesa, cama, escritorios,
    // espejo, ventana, puerta, carta). Sus zonas de interacción (20x20)
    // siguen siendo solo de solapamiento para la tecla E.
    if (casaArt && casaArt.colliders) {
      const furnitureTiles = this.mapTiles.filter(tile => {
        const tx = Math.floor((tile.x - 8) / 16);
        const ty = Math.floor((tile.y - 8) / 16);
        const tileId = this.currentMapData.tiles[ty]?.[tx] ?? -1;
        return Object.prototype.hasOwnProperty.call(casaArt.colliders, tileId);
      });
      if (furnitureTiles.length > 0) {
        this.physics.add.collider(this.player, furnitureTiles);
      }
    }

    this.physics.add.overlap(this.player, this.enemySprites, (player, enemy) => {
      if (!enemy.active || enemy.isDead) return;
      if (!player.invincible && !player.isHurt) {
        player.takeDamage(enemy.damage);
      }
    });

    // Un solo temporizador recorre los enemigos VIVOS cada 100ms (cubre
    // también a los invocados a mitad de combate, que antes eran
    // inmatables al no existir cuando se creó la escena).
    this.time.addEvent({
      delay: 100,
      repeat: -1,
      callback: () => {
        if (!this.player || !this.player.attackHitbox) return;
        for (const enemy of this.enemySprites) {
          if (!enemy.active || enemy.isDead || !this.player.attackHitbox) continue;
          if (this.physics.overlap(this.player.attackHitbox, enemy)) {
            const dmg = this.player.attackHitbox.attackDamage || 1;
            enemy.takeDamage(dmg);
            if (this.player.attackHitbox) {
              this.player.attackHitbox.destroy();
              this.player.attackHitbox = null;
            }
            break;
          }
        }
        if (this.currentBoss && !this.currentBoss.isDead && this.player.attackHitbox) {
          if (this.physics.overlap(this.player.attackHitbox, this.currentBoss)) {
            const dmg = this.player.attackHitbox.attackDamage || 1;
            this.currentBoss.takeDamage(dmg);
            if (this.player.attackHitbox) {
              this.player.attackHitbox.destroy();
              this.player.attackHitbox = null;
            }
          }
        }
      },
    });

    if (this.currentBoss && !this.currentBoss.isDead) {

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
          // Pasar el ID (no el array ya resuelto): showDialogue vuelve a
          // buscar en Dialogues, y pasarle un array anidaba [[...]] el
          // dialogo (rompia el nombre y concatenaba todas las frases).
          this.showDialogue(trigger.dialogue);
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
    this.updateCamera();
    this.dialogueSystem.reposition();

    if (this.isDialogActive) return;

    const cursorKeys = {
      up: this.wKey.isDown || this.cursors.up.isDown,
      down: this.sKey.isDown || this.cursors.down.isDown,
      left: this.aKey.isDown || this.cursors.left.isDown,
      right: this.dKey.isDown || this.cursors.right.isDown,
      chargeHeld: this.spaceKey.isDown,
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

    // Y-Sorting: orden de renderizado basado en el eje Y. Los objetos con
    // Y menor (más arriba en pantalla) se renderizan detrás; los de Y mayor
    // (más abajo) se renderizan delante. Así el jugador queda visualmente
    // tras un mueble alto al caminar por su lado norte, y delante al caminar
    // por su lado sur, sin solaparse ilógicamente por debajo.
    for (const obj of this.ySortables) {
      if (obj && obj.y !== undefined) {
        obj.setDepth(obj.y);
      }
    }
  }

  showDialogue(dialogueId) {
    // Acepta tanto un ID de Dialogues como el array de lineas ya resuelto.
    // Antes solo resolvia: si le llegaba un array (p. ej.
    // showDialogue(Dialogues[trigger.dialogue])), lo usaba como clave
    // (undefined) y devolvia [array] => [[linea1, linea2, ...]]. El box de
    // dialogo veia UNA sola "linea" que era en realidad el array entero, y
    // la escribia a caracter por caracter concatenando todas las frases sin
    // espacio ni salto ("¿Que paso?Maria Jose: Samuel...").
    const lines = Array.isArray(dialogueId)
      ? dialogueId
      : Dialogues[dialogueId] || [dialogueId];
    this.dialogueSystem.show(lines);
  }

  collectLetter(letterId) {
    if (GameState.collectedLetters.includes(letterId)) return;
    GameState.collectedLetters.push(letterId);
    if (this.saveSystem) this.saveSystem.save();

    const lines = Dialogues.letters[letterId] || ['Carta encontrada.'];
    this.dialogueSystem.show(lines);
  }

  collectFragment(fragmentData) {
    if (this.saveSystem) this.saveSystem.save();
    // Resolver fuera y pasar el resultado (ID o array): showDialogue acepta
    // ambos, y asi el fallback por defecto se mantiene si la clave no existe.
    this.showDialogue(Dialogues[fragmentData] || 'Fragmento obtenido.');
  }

  changeMap(targetMap, spawnX, spawnY) {
    if (this.saveSystem) this.saveSystem.save();
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.restart({ map: targetMap, spawnX, spawnY });
    });
  }

  handleDeath() {
    if (this._deathInProgress) return;
    this._deathInProgress = true;

    this.cameras.main.fade(400, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this._deathInProgress = false;
      GameState.hp = GameState.maxHP;
      this.scene.restart({ map: this.currentMapId });
    });
  }

  showFragmentScene(fragmentId, fragmentName) {
    if (this.saveSystem) this.saveSystem.save();
    const lines = Dialogues[fragmentId] || ['Fragmento obtenido.'];
    const unlock = ABILITY_UNLOCK[fragmentId];
    const goMemory = () => {
      this.cameras.main.fade(800, 255, 246, 210);
      const returnX = Math.floor(this.player.x / 16);
      const returnY = Math.floor(this.player.y / 16);
      this.time.delayedCall(1000, () => {
        this.scene.start('MemoryScene', { fragmentId, fragmentName, returnMap: this.currentMapId, returnX, returnY });
      });
    };
    // Al cerrar el diálogo del fragmento se muestra el aviso de
    // habilidad (usa la cola de diálogos: nunca se pierde).
    this.dialogueSystem.show(lines, () => {
      if (unlock) {
        this.dialogueSystem.show(
          [`¡Habilidad desbloqueada!: ${unlock.name}. ${unlock.hint}.`],
          goMemory
        );
      } else {
        goMemory();
      }
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
      this.player.heal(3);
      heart.destroy();
      zone.destroy();
    });
  }

  handleBossDefeated(X, Y) {
    if (this.saveSystem) this.saveSystem.save();
    const posX = X ?? 320;
    const posY = Y ?? 200;

    if (this.currentMapId === 'boss_coleccionista') {
      this.time.delayedCall(1000, () => {
        this.cameras.main.fade(1000, 0, 0, 0);
        this.time.delayedCall(1200, () => {
          this.scene.start('FinalScene');
        });
      });
    } else if (this.currentMapId === 'boss_distancia') {
      this.showReturnPortal('pantano_toxicidad', 16, 42, posX, posY);
    } else if (this.currentMapId === 'boss_toxicidad') {
      this.showReturnPortal('valle_desinteres', 6, 41, posX, posY);
    } else if (this.currentMapId === 'boss_desinteres') {
      this.showReturnPortal('montanas_inseguridad', 8, 42, posX, posY);
    } else if (this.currentMapId === 'boss_inseguridad') {
      this.showReturnPortal('lago_celos', 38, 41, posX, posY);
    } else if (this.currentMapId === 'boss_celos') {
      this.showReturnPortal('reino_recuerdos', 40, 42, posX, posY);
    }
  }

  maybeSpawnArenaReturnPortal() {
    const boss = this.currentMapData?.boss;
    if (!boss || !boss.fragment) return;
    if (this.currentBoss) return;
    if (!GameState.defeatedBosses.includes(boss.type)) return;
    this.handleBossDefeated(this.player.x, this.player.y - 16);
  }

  // Red de seguridad: si el Coleccionista ya cayó pero seguimos en su
  // arena (p. ej. muerte durante la cinemática), ir al Final igual.
  maybeGoFinalScene() {
    if (this.currentMapId !== 'boss_coleccionista') return;
    if (this.currentBoss || this._finalStarted) return;
    if (!GameState.defeatedBosses.includes('boss_coleccionista')) return;
    this._finalStarted = true;
    this.time.delayedCall(1000, () => {
      this.cameras.main.fade(1000, 0, 0, 0);
      this.time.delayedCall(1200, () => {
        this.scene.start('FinalScene');
      });
    });
  }

  showReturnPortal(targetMap, spawnX, spawnY, x = 320, y = 200) {
    const portalZone = this.add.zone(x, y, 32, 32);
    this.physics.add.existing(portalZone, true);

    const portal = this.add.circle(x, y, 16, 0xc4a35a, 0.6);
    this.tweens.add({
      targets: portal,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.4, to: 0.8 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const label = this.add.text(x, y + 30, 'Portal - Pulsa E', {
      fontSize: '10px',
      color: '#c4a35a',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const indicator = this.add.text(x, y - 30, '▼', {
      fontSize: '10px', color: '#f1c40f', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: indicator,
      y: y - 33,
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

  _showWorldMapHint(mapId) {
    if (mapId === 'casa' || mapId.startsWith('boss_')) return;

    const realms = [
      { id: 'sendero_distancia', name: 'Sendero de la Distancia' },
      { id: 'pantano_toxicidad', name: 'Pantano de la Toxicidad' },
      { id: 'valle_desinteres', name: 'Valle del Desinterés' },
      { id: 'montanas_inseguridad', name: 'Montañas de la Inseguridad' },
      { id: 'lago_celos', name: 'Lago de los Celos' },
      { id: 'reino_recuerdos', name: 'Reino de los Recuerdos' },
    ];

    const cam = this.cameras.main;
    const z = cam.zoom || 1;
    const s = RENDER_SCALE / z;
    const X = (c) => (RENDER_SCALE * (c + 320 * (z - 1))) / z;
    const Y = (c) => (RENDER_SCALE * (c + 180 * (z - 1))) / z;

    const container = this.add.container(X(320), Y(180)).setScale(s).setDepth(290).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, 500, 130, 0x0a0a1e, 0.92);
    bg.setStrokeStyle(2, 0xc4a35a, 0.9);
    container.add(bg);

    const title = this.add.text(0, -42, '✦ NUEVO REINO DESCUBIERTO ✦', {
      fontSize: '9px', color: '#c4a35a', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(title);

    const curRealm = realms.find(r => r.id === mapId);
    const realmName = this.add.text(0, -22, curRealm ? curRealm.name : (this.currentMapData?.name || ''), {
      fontSize: '13px', color: '#f1c40f', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(realmName);

    const startX = -180;
    const spacing = realms.length > 1 ? 360 / (realms.length - 1) : 0;
    realms.forEach((r, idx) => {
      const rx = startX + idx * spacing;
      const isVisited = GameState.visitedMaps.includes(r.id);
      const isCurrent = r.id === mapId;

      if (idx > 0) {
        const line = this.add.line(0, 0, rx - spacing, 10, rx, 10, isVisited ? 0xf1c40f : 0x555555);
        line.setLineWidth(2);
        container.add(line);
      }

      const nodeColor = isCurrent ? 0xff6b9d : (isVisited ? 0xf1c40f : 0x444444);
      const node = this.add.circle(rx, 10, isCurrent ? 7 : 5, nodeColor);
      container.add(node);

      if (isCurrent) {
        this.tweens.add({
          targets: node,
          scale: { from: 1, to: 1.35 },
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
      }

      const numText = this.add.text(rx, 26, `${idx + 1}`, {
        fontSize: '7px', color: isCurrent ? '#ff6b9d' : (isVisited ? '#fff' : '#888'), fontFamily: 'monospace'
      }).setOrigin(0.5);
      container.add(numText);
    });

    const fragText = this.add.text(0, 46, `Fragmentos de memoria recuperados: ${GameState.fragments.length}/5`, {
      fontSize: '9px', color: '#55efc4', fontFamily: 'monospace'
    }).setOrigin(0.5);
    container.add(fragText);

    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 500,
      hold: 2400,
      yoyo: true,
      onComplete: () => {
        container.destroy();
      },
    });
  }
}
