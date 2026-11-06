import Phaser from 'phaser';
import { PLAYER_SPRITES } from '../data/PlayerSprites.js';
import { SPRITE_BAKE } from '../config/Render.js';

export class ProceduralAssets {
  constructor(scene) {
    this.scene = scene;
  }

  generateAll() {
    this.generatePlayer();
    this.generateNPCs();
    this.generateEnemies();
    this.generateBosses();
    this.generateTiles();
    this.generateItems();
    this.generateUI();
    this.generateEffects();
    this.generateSamuel();
  }

  createTexture(name, w, h, drawFn) {
    const canvas = this.scene.textures.createCanvas(name, w, h);
    if (!canvas) return;
    const ctx = canvas.context;
    drawFn(ctx, w, h);
    canvas.refresh();
  }

  generatePlayer() {
    if (this.buildPlayerFromSheet()) return;
    this.generatePlayerProcedural();
  }

  buildPlayerFromSheet() {
    const tex = this.scene.textures;
    if (!tex.exists('mariajose_sheet')) return false;
    const entries = Object.entries(PLAYER_SPRITES.frames || {});
    if (entries.length < 44) return false;
    if (entries.some(([key, f]) => !f || typeof f.sx !== 'number' || tex.exists(key))) {
      return false;
    }
    const src = tex.get('mariajose_sheet').source[0].image;
    if (!src) return false;
    for (const [key, f] of entries) {
      const canvas = tex.createCanvas(key, f.sw, f.sh);
      const ctx = canvas.context;
      ctx.clearRect(0, 0, f.sw, f.sh);
      if (f.flip) {
        ctx.save();
        ctx.translate(f.sw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(src, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
      if (f.flip) ctx.restore();
      canvas.refresh();
      // El arte se hornea con más detalle y se dibuja reducido: filtro LINEAR
      // para que el reescalado no muestre dientes de sierra.
      canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    return true;
  }

  generatePlayerProcedural() {
    // María José 16x24. Frente = referencia (pelo negro largo, gafas
    // cuadradas, t-shirt blanca, pantalón negro, sneakers blancos).
    const dirs = ['down', 'up', 'left', 'right'];
    const C = {
      hair: '#1a1a1a', hairLight: '#2a2a2a',
      skin: '#f1c27d', skinShade: '#e0ac69',
      glasses: '#1a1a1a', glint: '#ffffff',
      shirt: '#ffffff', shirtShade: '#f0f0f0',
      pants: '#1a1a1a', pantsLine: '#000000',
      shoe: '#ffffff', sole: '#cccccc',
      bow: '#ff4d6d'
    };
    const R = (ctx, x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };
    const flashWhite = (ctx, doFlash) => {
      if (!doFlash) return;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 16, 24);
      ctx.restore();
    };

    const legs = (ctx, oL, oR, pants, seam, side) => {
      // Piernas/Falda
      R(ctx, 5, 17 + oL, 3, 4, pants);
      R(ctx, 8, 17 + oR, 3, 4, pants);
      // Calcetines/Zapatos
      R(ctx, 5, 21 + oL, 3, 2, C.shoe);
      R(ctx, 8, 21 + oR, 3, 2, C.shoe);
      R(ctx, 5, 23, 3, 1, C.pantsLine);
      R(ctx, 8, 23, 3, 1, C.pantsLine);
    };

    const armsFront = (ctx, dy, aL, aR) => {
      // Mangas blancas
      R(ctx, 2, 12 + dy, 2, 3, C.shirt);
      R(ctx, 12, 12 + dy, 2, 3, C.shirt);
      // Manos piel
      R(ctx, 2, 15 + dy + aL, 2, 2, C.skin);
      R(ctx, 12, 15 + dy + aR, 2, 2, C.skin);
    };

    const headFront = (ctx, dy) => {
      // Pelo fondo (caída larga)
      R(ctx, 3, 5 + dy, 10, 11, C.hair);
      // Cara
      R(ctx, 4, 3 + dy, 8, 9, C.skin);
      // Flequillo/Pelo arriba
      R(ctx, 3, 2 + dy, 10, 3, C.hair);
      R(ctx, 4, 1 + dy, 8, 1, C.hair);
      // Gafas (Bloque limpio)
      R(ctx, 4, 6 + dy, 3, 2, C.glasses);
      R(ctx, 9, 6 + dy, 3, 2, C.glasses);
      R(ctx, 7, 7 + dy, 2, 1, C.glasses);
      R(ctx, 4, 6 + dy, 1, 1, C.glint);
      R(ctx, 9, 6 + dy, 1, 1, C.glint);
      // Lazo (Bow)
      R(ctx, 9, 1 + dy, 3, 3, C.bow);
    };

    const torsoFront = (ctx, dy, aL, aR, swL, swR) => {
      // Camisa blanca
      R(ctx, 4, 12 + dy, 8, 6, C.shirt);
      // Cuello
      R(ctx, 7, 12 + dy, 2, 1, C.skin);
      armsFront(ctx, dy, aL, aR);
    };

    const headBack = (ctx, dy) => {
      // Todo pelo por detrás
      R(ctx, 3, 1 + dy, 10, 15, C.hair);
      R(ctx, 4, 0 + dy, 8, 1, C.hair);
      // Lazo asomando
      R(ctx, 4, 1 + dy, 3, 3, C.bow);
      // Cuerpo
      R(ctx, 4, 12 + dy, 8, 6, C.shirt);
      armsFront(ctx, dy, 0, 0);
    };

    const headProfile = (ctx, dy, dir) => {
      const X = (x, w) => (dir === 'left' ? x : 16 - x - w);
      // Pelo (bloque trasero)
      R(ctx, X(4, 5), 2 + dy, 5, 16, C.hair);
      // Cara
      R(ctx, X(9, 4), 3 + dy, 4, 9, C.skin);
      // Pelo superior
      R(ctx, X(6, 6), 2 + dy, 6, 3, C.hair);
      // Gafa lateral
      R(ctx, X(11, 2), 6 + dy, 2, 2, C.glasses);
      R(ctx, X(12, 1), 6 + dy, 1, 1, C.glint);
      // Lazo lateral
      if (dir === 'right') R(ctx, X(7, 3), 1 + dy, 3, 3, C.bow);
      else R(ctx, X(6, 3), 1 + dy, 3, 3, C.bow);
    };

    const torsoProfile = (ctx, dy, aF, aB, sw) => {
      R(ctx, 4, 12 + dy, 7, 4, C.shirt);
      R(ctx, 9, 12 + dy, 2, 4, C.shirtShade);
      R(ctx, 2, 12 + dy + aF, 2, 2, C.shirt);
      R(ctx, 2, 14 + dy + aF, 2, 3, C.skin);
      R(ctx, 11, 12 + dy + aB, 2, 4, C.skinShade);
      R(ctx, 8, 10 + dy + sw, 2, 6, C.hair);
    };

    const attackFx = (ctx, dir, dy, frame) => {
      const ext = 2 + frame;
      if (dir === 'down') {
        R(ctx, 12, 14 + dy, 2, 3 + ext, C.skin);
        R(ctx, 12, 15 + dy + ext, 2, 2, C.glint);
      } else if (dir === 'up') {
        R(ctx, 12, 11 + dy - ext, 2, 3 + ext, C.skin);
        R(ctx, 12, 8 + dy - ext, 2, 2, C.glint);
      } else if (dir === 'left') {
        R(ctx, 2 - ext, 14 + dy, 2 + ext, 2, C.skin);
        R(ctx, 0 - ext, 14 + dy, 2, 2, C.glint);
      } else {
        R(ctx, 12, 14 + dy, 2 + ext, 2, C.skin);
        R(ctx, 14 + ext, 14 + dy, 2, 2, C.glint);
      }
    };

    const drawFrame = (ctx, dir, anim, frame) => {
      let dy = 0, oL = 0, oR = 0, aL = 0, aR = 0, sw = 0;
      if (anim === 'idle') {
        dy = frame;
      } else if (anim === 'walk') {
        const ph = frame % 2 === 0 ? 1 : -1;
        oL = ph; oR = -ph; aL = -ph; aR = ph;
        dy = [0, 1, 0, 1][frame];
        sw = [0, 1, 0, -1][frame];
      }
      const isProfile = dir === 'left' || dir === 'right';

      if (!isProfile) {
        if (dir === 'down') headFront(ctx, dy);
        else headBack(ctx, dy);
        if (anim === 'attack') {
          torsoFront(ctx, dy, 0, 0, 0, 0);
          attackFx(ctx, dir, dy, frame);
        } else {
          torsoFront(ctx, dy, aL, aR, sw, -sw);
        }
        legs(ctx, oL, oR, C.pants, C.pantsLine, null);
      } else {
        headProfile(ctx, dy, dir);
        if (anim === 'attack') {
          torsoProfile(ctx, dy, 0, 0, 0);
          attackFx(ctx, dir, dy, frame);
        } else {
          const aF = dir === 'left' ? aL : aR;
          torsoProfile(ctx, dy, aF, -aF, sw);
        }
        legs(ctx, oL, oR, C.pants, C.pantsLine, null);
      }
      if (anim === 'hurt') flashWhite(ctx, frame === 1);
    };

    dirs.forEach(dir => {
      // idle: 2 frames
      for (let f = 0; f < 2; f++) {
        this.createTexture(`player_${dir}_idle_${f}`, 16 * SPRITE_BAKE, 24 * SPRITE_BAKE, (ctx) => {
          ctx.scale(SPRITE_BAKE, SPRITE_BAKE);
          drawFrame(ctx, dir, 'idle', f);
        });
      }
      // walk: 4 frames
      for (let f = 0; f < 4; f++) {
        this.createTexture(`player_${dir}_walk_${f}`, 16 * SPRITE_BAKE, 24 * SPRITE_BAKE, (ctx) => {
          ctx.scale(SPRITE_BAKE, SPRITE_BAKE);
          drawFrame(ctx, dir, 'walk', f);
        });
      }
      // attack: 3 frames
      for (let f = 0; f < 3; f++) {
        this.createTexture(`player_${dir}_attack_${f}`, 16 * SPRITE_BAKE, 24 * SPRITE_BAKE, (ctx) => {
          ctx.scale(SPRITE_BAKE, SPRITE_BAKE);
          drawFrame(ctx, dir, 'attack', f);
        });
      }
      // hurt: 2 frames
      for (let f = 0; f < 2; f++) {
        this.createTexture(`player_${dir}_hurt_${f}`, 16 * SPRITE_BAKE, 24 * SPRITE_BAKE, (ctx) => {
          ctx.scale(SPRITE_BAKE, SPRITE_BAKE);
          drawFrame(ctx, dir, 'hurt', f);
        });
      }
    });
  }

  generateNPCs() {
    const npcDefs = [
      { id: 'npc_elder', hair: '#8B4513', shirt: '#4a6fa5', skin: '#deb887' },
      { id: 'npc_merchant', hair: '#2c2c2c', shirt: '#2ecc71', skin: '#f5deb3' },
      { id: 'npc_child', hair: '#daa520', shirt: '#ff6b6b', skin: '#ffeaa7' },
      { id: 'npc_sage', hair: '#c0c0c0', shirt: '#6c5ce7', skin: '#fad390' },
      { id: 'npc_wanderer', hair: '#555', shirt: '#636e72', skin: '#deb887' },
    ];

    npcDefs.forEach(npc => {
      this.createTexture(npc.id, 16, 24, (ctx) => {
        ctx.fillStyle = npc.skin;
        ctx.fillRect(4, 2, 8, 8);
        ctx.fillStyle = npc.hair;
        ctx.fillRect(4, 0, 8, 4);
        ctx.fillStyle = npc.shirt;
        ctx.fillRect(3, 10, 10, 8);
        ctx.fillStyle = npc.skin;
        ctx.fillRect(4, 11, 3, 4);
        ctx.fillRect(9, 11, 3, 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(6, 5, 1, 1);
        ctx.fillRect(9, 5, 1, 1);
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(5, 18, 3, 6);
        ctx.fillRect(8, 18, 3, 6);
      });
    });
  }

  generateEnemies() {
    const enemyDefs = [
      { id: 'enemy_shadow', color: '#2d3436', eyeColor: '#e74c3c', size: 14 },
      { id: 'enemy_echo', color: '#6c5ce7', eyeColor: '#a29bfe', size: 12 },
      { id: 'enemy_crawler', color: '#00b894', eyeColor: '#55efc4', size: 16 },
      { id: 'enemy_void', color: '#2d1b69', eyeColor: '#e84393', size: 14 },
      { id: 'enemy_puppet', color: '#636e72', eyeColor: '#fdcb6e', size: 14 },
      { id: 'enemy_fog', color: '#b2bec3', eyeColor: '#74b9ff', size: 16 },
    ];

    enemyDefs.forEach(e => {
      for (let frame = 0; frame < 3; frame++) {
        this.createTexture(`${e.id}_${frame}`, e.size, e.size, (ctx, w, h) => {
          const hover = Math.sin(frame * Math.PI / 3) * 2;
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2 + hover, w / 2 - 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = e.eyeColor;
          ctx.fillRect(w / 2 - 3, h / 2 - 2 + hover, 2, 2);
          ctx.fillRect(w / 2 + 1, h / 2 - 2 + hover, 2, 2);
        });
      }
    });
  }

  generateBosses() {
    const bossDefs = [
      { id: 'boss_distancia', color: '#636e72', accent: '#b2bec3', size: 32 },
      { id: 'boss_toxicidad', color: '#00b894', accent: '#e17055', size: 32 },
      { id: 'boss_desinteres', color: '#636e72', accent: '#dfe6e9', size: 32 },
      { id: 'boss_inseguridad', color: '#2d1b69', accent: '#a29bfe', size: 32 },
      { id: 'boss_celos', color: '#c0392b', accent: '#e74c3c', size: 32 },
      { id: 'boss_coleccionista', color: '#1a1a2e', accent: '#e94560', size: 48 },
    ];

    bossDefs.forEach(b => {
      for (let frame = 0; frame < 4; frame++) {
        this.createTexture(`${b.id}_${frame}`, b.size, b.size, (ctx, w, h) => {
          const pulse = Math.sin(frame * Math.PI / 2) * 2;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, w / 2 - 2 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = b.accent;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(w / 2 - 5, h / 2 - 4, 3, 3);
          ctx.fillRect(w / 2 + 2, h / 2 - 4, 3, 3);
          ctx.fillStyle = '#000';
          ctx.fillRect(w / 2 - 4, h / 2 - 3, 2, 2);
          ctx.fillRect(w / 2 + 3, h / 2 - 3, 2, 2);
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + frame * 0.3;
            const dx = Math.cos(angle) * (w / 2 + 4);
            const dy = Math.sin(angle) * (h / 2 + 4);
            ctx.fillStyle = b.accent;
            ctx.fillRect(w / 2 + dx - 1, h / 2 + dy - 1, 3, 3);
          }
        });
      }
    });
  }

  generateTiles() {
    const tileTypes = {
      'tile_grass': { base: '#4a7c59', detail: '#3d6b4a', accent: '#5f946d' },
      'tile_dirt': { base: '#8B6914', detail: '#7a5c12', accent: '#9a7720' },
      'tile_stone': { base: '#808080', detail: '#696969', accent: '#949494' },
      'tile_water': { base: '#2980b9', detail: '#3498db', accent: '#5dade2' },
      'tile_sand': { base: '#f0d9a0', detail: '#e6cc8a', accent: '#f5e2b8' },
      'tile_brick': { base: '#a0522d', detail: '#8B4513', accent: '#b8683a' },
      'tile_wood': { base: '#c4a35a', detail: '#b8963e', accent: '#d4b86a' },
      'tile_marsh': { base: '#2d5016', detail: '#1e3a0f', accent: '#3a6520' },
      'tile_marsh_water': { base: '#1a3a2a', detail: '#0d2818', accent: '#265040' },
      'tile_snow': { base: '#ecf0f1', detail: '#dfe6e9', accent: '#ffffff' },
      'tile_dark': { base: '#1a1a2e', detail: '#16213e', accent: '#24244a' },
      'tile_memorial': { base: '#ffecd2', detail: '#fcbf49', accent: '#fff4de' },
      'tile_wall': { base: '#5a5a5a', detail: '#4a4a4a', accent: '#6a6a6a' },
      'tile_door': { base: '#8B4513', detail: '#654321', accent: '#a05828' },
      'tile_carpet': { base: '#c0392b', detail: '#a93226', accent: '#d64a3c' },
      'tile_floor': { base: '#deb887', detail: '#d2a86e', accent: '#e8cfa0' },
      'tile_light': { base: '#f5f5dc', detail: '#fafad2', accent: '#fffff0' },
    };

    Object.entries(tileTypes).forEach(([id, colors]) => {
      this.createTexture(id, 16, 16, (ctx) => {
        ctx.fillStyle = colors.base;
        ctx.fillRect(0, 0, 16, 16);
        // textura más rica
        for (let i = 0; i < 12; i++) {
          const x = (i * 7 + 3) % 16;
          const y = (i * 5 + 2) % 16;
          ctx.fillStyle = i % 3 === 0 ? colors.accent : colors.detail;
          ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
        }
        if (id === 'tile_water' || id === 'tile_marsh_water') {
          ctx.strokeStyle = colors.accent;
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.moveTo(1, 5); ctx.quadraticCurveTo(5, 3, 9, 5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(6, 11); ctx.quadraticCurveTo(10, 9, 14, 11); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (id === 'tile_grass') {
          ctx.strokeStyle = colors.accent;
          ctx.globalAlpha = 0.6;
          for (let g = 0; g < 4; g++) {
            const gx = 2 + g * 4;
            const gy = 3 + (g % 2) * 6;
            ctx.beginPath(); ctx.moveTo(gx, gy + 2); ctx.lineTo(gx + 1, gy); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        if (id === 'tile_brick' || id === 'tile_wall') {
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.strokeRect(0.5, 0.5, 15, 7);
          ctx.strokeRect(0.5, 8.5, 7, 7);
          ctx.strokeRect(8.5, 8.5, 7, 7);
        }
      });
    });

    this.generateSpecialTiles();
  }

  generateSpecialTiles() {
    const specials = [
      ['tile_tree', (ctx) => {
        // tronco
        ctx.fillStyle = '#6b4423'; ctx.fillRect(6, 9, 4, 7);
        ctx.fillStyle = '#5a3818'; ctx.fillRect(7, 10, 2, 6);
        // copa (capas para volumen)
        ctx.fillStyle = '#1f4d1a'; ctx.fillRect(2, 2, 12, 9); ctx.fillRect(1, 4, 14, 6);
        ctx.fillStyle = '#2f6b28'; ctx.fillRect(3, 1, 10, 8); ctx.fillRect(2, 3, 12, 6);
        ctx.fillStyle = '#4a8f3a'; ctx.fillRect(4, 2, 8, 5); ctx.fillRect(3, 4, 10, 3);
        // luces/hojas
        ctx.fillStyle = '#6fbd57';
        ctx.fillRect(4, 3, 2, 1); ctx.fillRect(9, 4, 2, 1); ctx.fillRect(6, 6, 2, 1); ctx.fillRect(11, 5, 1, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(2, 8, 12, 2);
      }],
      ['tile_rock', (ctx) => {
        ctx.fillStyle = '#6f6f6f'; ctx.fillRect(2, 5, 12, 9);
        ctx.fillStyle = '#8a8a8a'; ctx.fillRect(3, 4, 10, 6);
        ctx.fillStyle = '#a3a3a3'; ctx.fillRect(4, 4, 5, 3);
        ctx.fillStyle = '#5a5a5a'; ctx.fillRect(2, 12, 12, 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeRect(2.5, 4.5, 11, 9);
      }],
      ['tile_flowers', (ctx) => {
        ctx.fillStyle = '#4a7c59'; ctx.fillRect(0, 0, 16, 16);
        const drawFlower = (x,y,c) => { ctx.fillStyle = c; ctx.fillRect(x,y,2,2); ctx.fillRect(x-1,y+1,4,1); ctx.fillRect(x,y+2,2,1); ctx.fillStyle='#f7d774'; ctx.fillRect(x,y+1,2,1); };
        drawFlower(4,3,'#ff6b9d'); drawFlower(11,5,'#feca57'); drawFlower(6,10,'#a29bfe'); drawFlower(12,11,'#ff9ff3');
        ctx.fillStyle = '#3d6b4a'; ctx.fillRect(1,2,1,1); ctx.fillRect(8,8,1,1); ctx.fillRect(14,3,1,1);
      }],
      ['tile_bridge', (ctx) => {
        ctx.fillStyle = '#3b6ea5'; ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#8B6914'; ctx.fillRect(0, 4, 16, 8);
        ctx.fillStyle = '#b8863b'; ctx.fillRect(0, 5, 16, 1); ctx.fillRect(0, 10, 16, 1);
        ctx.fillStyle = '#6b4f1d'; for (let x=1;x<16;x+=3) ctx.fillRect(x,4,1,8);
        ctx.fillStyle = '#d4a657'; ctx.fillRect(0,6,16,4);
      }],
      ['tile_chest', (ctx) => { ctx.fillStyle = '#8B4513'; ctx.fillRect(2, 4, 12, 10); ctx.fillStyle = '#a05828'; ctx.fillRect(3,5,10,8); ctx.fillStyle = '#FFD700'; ctx.fillRect(7, 8, 2, 2); ctx.fillStyle='#5a2d0c'; ctx.fillRect(2,7,12,1); }],
      ['tile_sign', (ctx) => { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(7, 8, 2, 8); ctx.fillStyle = '#c4a35a'; ctx.fillRect(2, 2, 12, 8); ctx.fillStyle='#8b6a2e'; ctx.fillRect(3,3,10,1); ctx.fillRect(4,5,8,1); ctx.fillRect(4,7,6,1); }],
      ['tile_waterfall', (ctx) => { ctx.fillStyle = '#2980b9'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#74b9ff'; ctx.fillRect(4, 0, 3, 16); ctx.fillRect(9, 0, 3, 16); ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(5,2,1,12); ctx.fillRect(10,4,1,10); }],
      ['tile_cabin_wall', (ctx) => { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#8B6914'; for (let i = 0; i < 16; i += 4) ctx.fillRect(0, i, 16, 1); ctx.fillStyle='rgba(0,0,0,0.15)'; for(let i=1;i<16;i+=4) ctx.fillRect(0,i,16,1); }],
      ['tile_cabin_floor', (ctx) => { ctx.fillStyle = '#c4a35a'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle='#b08d48'; for(let i=0;i<16;i+=4) ctx.fillRect(0,i,16,1); }],
      ['tile_island', (ctx) => { ctx.fillStyle = '#2d5016'; ctx.fillRect(2, 2, 12, 12); ctx.fillStyle='#3f7030'; ctx.fillRect(3,3,10,10); ctx.fillStyle='#558a3f'; ctx.fillRect(5,4,6,4); }],
      ['tile_campfire', (ctx) => { ctx.fillStyle = '#4a7c59'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#8B4513'; ctx.fillRect(4, 8, 8, 4); ctx.fillStyle='#5a3a1a'; ctx.fillRect(5,9,6,2); ctx.fillStyle = '#e74c3c'; ctx.fillRect(5, 3, 6, 6); ctx.fillStyle = '#f39c12'; ctx.fillRect(6,4,4,4); ctx.fillStyle = '#f1c40f'; ctx.fillRect(7, 3, 2, 3); }],
      ['tile_bed', (ctx) => { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#c0392b'; ctx.fillRect(2, 2, 12, 10); ctx.fillStyle='#a5281b'; ctx.fillRect(2,8,12,4); ctx.fillStyle = '#fff'; ctx.fillRect(3, 2, 10, 3); }],
      ['tile_desk', (ctx) => { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(1, 4, 14, 10); ctx.fillStyle='#6b4423'; ctx.fillRect(2,5,12,8); ctx.fillStyle = '#74b9ff'; ctx.fillRect(4, 1, 8, 4); ctx.fillStyle='#dfe6e9'; ctx.fillRect(5,2,6,2); }],
      ['tile_mirror', (ctx) => { ctx.fillStyle = '#c4a35a'; ctx.fillRect(3, 0, 10, 14); ctx.fillStyle = '#a29bfe'; ctx.fillRect(4, 1, 8, 12); ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(5,2,2,8); }],
      ['tile_photo', (ctx) => { ctx.fillStyle = '#8B4513'; ctx.fillRect(2, 2, 12, 12); ctx.fillStyle = '#deb887'; ctx.fillRect(3, 3, 10, 10); ctx.fillStyle = '#e84393'; ctx.fillRect(5, 4, 2, 3); ctx.fillStyle = '#0984e3'; ctx.fillRect(9, 4, 2, 3); ctx.fillStyle='#6ab04c'; ctx.fillRect(4,9,8,3); }],
      ['tile_fragment', (ctx) => { ctx.fillStyle = '#f1c40f'; ctx.fillRect(4, 2, 8, 12); ctx.fillStyle = '#fff'; ctx.fillRect(6, 5, 4, 6); }],
      ['tile_heart', (ctx) => { ctx.fillStyle = '#e74c3c'; ctx.fillRect(2, 4, 5, 5); ctx.fillRect(9, 4, 5, 5); ctx.fillRect(3, 8, 10, 3); ctx.fillRect(5, 11, 6, 2); ctx.fillRect(7, 13, 2, 1); ctx.fillStyle='#ff7675'; ctx.fillRect(3,5,2,2); }],
      ['tile_letter', (ctx) => { ctx.fillStyle = '#f5f5dc'; ctx.fillRect(2, 3, 12, 10); ctx.fillStyle = '#deb887'; ctx.fillRect(2, 3, 12, 3); ctx.fillStyle = '#e74c3c'; ctx.fillRect(8, 1, 4, 4); ctx.fillStyle='#999'; ctx.fillRect(4,7,8,1); ctx.fillRect(4,9,6,1); }],
      ['tile_lantern', (ctx) => { ctx.fillStyle = '#333'; ctx.fillRect(6, 0, 4, 3); ctx.fillStyle = '#c4a35a'; ctx.fillRect(4, 3, 8, 8); ctx.fillStyle = '#f1c40f'; ctx.fillRect(5, 4, 6, 6); ctx.fillStyle = '#333'; ctx.fillRect(6, 11, 4, 5); }],
      ['tile_window', (ctx) => { ctx.fillStyle = '#8B6914'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#74b9ff'; ctx.fillRect(2, 2, 12, 12); ctx.fillStyle = '#c4a35a'; ctx.fillRect(3, 3, 2, 10); ctx.fillRect(11, 3, 2, 10); ctx.fillRect(3, 3, 10, 2); ctx.fillRect(3, 11, 10, 2); ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(4,4,3,4); }],
    ];

    specials.forEach(([id, drawFn]) => {
      this.createTexture(id, 16, 16, drawFn);
    });

    // Casa exterior para el overworld (más detallada, 32x32)
    this.createTexture('tile_house_exterior', 32, 32, (ctx) => {
      // Techo
      ctx.fillStyle = '#7a3b1e';
      ctx.beginPath();
      ctx.moveTo(2, 14); ctx.lineTo(16, 2); ctx.lineTo(30, 14); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8f4524';
      ctx.fillRect(4, 12, 24, 3);
      // Paredes
      ctx.fillStyle = '#d8b07a';
      ctx.fillRect(5, 14, 22, 15);
      ctx.fillStyle = '#c89a60';
      ctx.fillRect(5, 22, 22, 2);
      // Puerta
      ctx.fillStyle = '#6b3f1f';
      ctx.fillRect(13, 20, 6, 9);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(17, 24, 1, 1);
      // Ventanas
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(7, 17, 4, 4);
      ctx.fillRect(21, 17, 4, 4);
      ctx.fillStyle = '#d8b07a';
      ctx.fillRect(9, 17, 1, 4);
      ctx.fillRect(7, 19, 4, 1);
      ctx.fillRect(23, 17, 1, 4);
      ctx.fillRect(21, 19, 4, 1);
      // Base/sombra
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(5, 28, 22, 2);
    });
  }

  generateItems() {
    this.createTexture('item_potion', 16, 16, (ctx) => {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(5, 4, 6, 8);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(6, 5, 4, 6);
      ctx.fillStyle = '#c4a35a';
      ctx.fillRect(6, 2, 4, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(6, 6, 2, 2);
    });
  }

  generateUI() {
    this.createTexture('ui_heart', 10, 10, (ctx) => {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(1, 2, 3, 3);
      ctx.fillRect(6, 2, 3, 3);
      ctx.fillRect(0, 3, 10, 4);
      ctx.fillRect(1, 7, 8, 2);
      ctx.fillRect(2, 9, 6, 1);
      ctx.fillRect(3, 10, 4, 1);
      ctx.fillRect(4, 11, 2, 1);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(2, 3, 2, 2);
    });

    this.createTexture('ui_heart_empty', 10, 10, (ctx) => {
      ctx.fillStyle = '#555';
      ctx.fillRect(1, 2, 3, 3);
      ctx.fillRect(6, 2, 3, 3);
      ctx.fillRect(0, 3, 10, 4);
      ctx.fillRect(1, 7, 8, 2);
      ctx.fillRect(2, 9, 6, 1);
      ctx.fillRect(3, 10, 4, 1);
      ctx.fillRect(4, 11, 2, 1);
    });

    this.createTexture('dialog_bg', 640, 100, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, 640, 100);
      ctx.strokeStyle = '#c4a35a';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 636, 96);
    });

    this.createTexture('menu_bg', 640, 360, (ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 360);
      grad.addColorStop(0, '#0a0a2e');
      grad.addColorStop(0.5, '#1a1a4e');
      grad.addColorStop(1, '#2d1b69');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.1})`;
        ctx.fillRect(Math.random() * 640, Math.random() * 360, 1, 1);
      }
    });

    this.createTexture('btn', 200, 36, (ctx) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, 0, 200, 36);
      ctx.strokeStyle = 'rgba(196, 163, 90, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 200, 36);
    });
  }

  generateEffects() {
    for (let i = 0; i < 4; i++) {
      const s = 4 + i * 2;
      this.createTexture(`particle_${i}`, s, s, (ctx) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    this.createTexture('sparkle', 8, 8, (ctx) => {
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(3, 0, 2, 8);
      ctx.fillRect(0, 3, 8, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(3, 3, 2, 2);
    });

    this.createTexture('slash_effect', 24, 24, (ctx) => {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(12, 12, 10, -Math.PI * 0.7, Math.PI * 0.3);
      ctx.stroke();
    });
  }

  generateSamuel() {
    if (!this.scene.textures.exists('samuel')) {
      this.generateSamuelProcedural();
    }
    // Samuel también se hornea con más detalle y se dibuja reducido.
    this.scene.textures.get('samuel').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.createTexture('samuel_glow', 32, 32, (ctx) => {
      const grad = ctx.createRadialGradient(16, 16, 4, 16, 16, 16);
      grad.addColorStop(0, 'rgba(241, 196, 15, 0.8)');
      grad.addColorStop(0.5, 'rgba(241, 196, 15, 0.3)');
      grad.addColorStop(1, 'rgba(241, 196, 15, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    });
  }

  generateSamuelProcedural() {
    const C = {
      hair: '#6d4c41', hairLight: '#8d6e63',
      skin: '#f1c27d', skinShade: '#e0ac69',
      shirt: '#3498db', shirtShade: '#2980b9',
      jeans: '#34495e', jeansShade: '#2c3e50',
      shoe: '#ffffff', sole: '#cccccc',
      outline: '#1a1a1a'
    };
    const R = (ctx, x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    this.createTexture('samuel', 16 * SPRITE_BAKE, 24 * SPRITE_BAKE, (ctx) => {
      ctx.scale(SPRITE_BAKE, SPRITE_BAKE);
      // Pelo (forma definida)
      R(ctx, 4, 1, 8, 4, C.hair);
      R(ctx, 3, 2, 10, 2, C.hair);
      R(ctx, 5, 0, 6, 1, C.hair);
      // Cara
      R(ctx, 4, 4, 8, 8, C.skin);
      // Ojos
      R(ctx, 5, 7, 1, 1, '#1a1a1a');
      R(ctx, 10, 7, 1, 1, '#1a1a1a');
      // Camiseta Azul
      R(ctx, 4, 12, 8, 6, C.shirt);
      R(ctx, 10, 12, 2, 6, C.shirtShade);
      // Brazos
      R(ctx, 2, 12, 2, 3, C.shirt);
      R(ctx, 12, 12, 2, 3, C.shirt);
      R(ctx, 2, 15, 2, 2, C.skin);
      R(ctx, 12, 15, 2, 2, C.skin);
      // Pantalones
      R(ctx, 5, 18, 3, 4, C.jeans);
      R(ctx, 8, 18, 3, 4, C.jeans);
      // Zapatos
      R(ctx, 5, 22, 3, 2, C.shoe);
      R(ctx, 8, 22, 3, 2, C.shoe);
    });
  }
}
