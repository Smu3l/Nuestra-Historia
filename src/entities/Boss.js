import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { Dialogues } from '../data/Dialogues.js';
import { RENDER_SCALE } from '../config/Render.js';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x * 16 + 8, y * 16 + 8, `${config.type}_0`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(24, 24);
    this.hp = config.hp;
    this.maxHP = config.hp;
    this.damage = config.damage;
    this.bossType = config.type;
    this.bossName = config.name;
    this.speed = 50;
    this.isHurt = false;
    this.isDead = false;
    this.phase = 1;
    this.maxPhases = config.phases || 2;
    this.phaseTriggered = false;

    this.config = config;
    this.animFrame = 0;
    this.animTimer = 0;
    this.attackTimer = 0;
    this.attackPattern = 0;
    this.isCharging = false;

    // PUNTO 5: Telegrafía — el boss muestra una señal visual antes de atacar
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.pendingAttack = null;

    // PUNTO 3: Tiempo entre ataques — base 2500ms
    this.attackInterval = 2500;

    this.hpBarBg = scene.add.rectangle(0, 0, 300, 16, 0x333333);
    this.hpBar = scene.add.rectangle(0, 0, 296, 12, 0xe74c3c);
    this.nameText = scene.add.text(0, 0, config.name, {
      fontSize: '10px', color: '#c4a35a', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.hpBarBg.setDepth(200);
    this.hpBar.setDepth(201);
    this.nameText.setDepth(201);
    this.hpBarBg.setScrollFactor(0);
    this.hpBar.setScrollFactor(0);
    this.nameText.setScrollFactor(0);

    this.hpBarOriginWidth = 296;

    this.anchorHud();
    scene.events.emit('boss-start', config.name);
  }

  anchorHud() {
    const cam = this.scene.cameras.main;
    if (!cam || !this.hpBarBg) return;
    const z = cam.zoom || 1;
    const s = RENDER_SCALE / z;
    const X = (c) => (RENDER_SCALE * (c + 320 * (z - 1))) / z;
    const Y = (c) => (RENDER_SCALE * (c + 180 * (z - 1))) / z;
    this.hpBarBg.setPosition(X(320), Y(20)).setScale(s);
    this.hpBar.setPosition(X(320), Y(20)).setScale(s);
    this.nameText.setPosition(X(320), Y(32)).setScale(s);
  }

  update(time, delta) {
    if (this.isDead || !this.active) return;

    this.anchorHud();

    this.animTimer += delta;
    if (this.animTimer > 200) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.setTexture(`${this.bossType}_${this.animFrame}`);
    }

    // PUNTO 5: Si está en fase de telegrafía, no atacar ni mover
    if (this.isTelegraphing) {
      this.telegraphTimer -= delta;
      this.body.setVelocity(0, 0);
      if (this.telegraphTimer <= 0) {
        this.isTelegraphing = false;
        if (this.pendingAttack) {
          this.pendingAttack();
          this.pendingAttack = null;
        }
      }
      return;
    }

    if (this.isHurt || this.isCharging) return;

    this.attackTimer += delta;
    if (this.attackTimer > this.attackInterval) {
      this.attackTimer = 0;
      this._telegraphAndAttack();
    }

    const player = this.scene.player;
    if (player && !player.isDead) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist > 60) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const spd = this.speed + (this.phase - 1) * 20;
        this.body.setVelocity(
          Math.cos(angle) * spd,
          Math.sin(angle) * spd
        );
      } else {
        this.body.setVelocity(0, 0);
      }
    }
  }

  // PUNTO 5: Telegrafía antes del ataque (500ms de aviso visual)
  _telegraphAndAttack() {
    this.isTelegraphing = true;
    this.telegraphTimer = 500;

    // Flash de advertencia en el boss
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.25 },
      duration: 250,
      yoyo: true,
    });
    this.setTint(0xffff00);
    this.scene.time.delayedCall(500, () => {
      if (this.active && !this.isDead) this.clearTint();
    });

    // Definir qué ataque hacer después de la telegrafía
    this.pendingAttack = () => this.doAttack();
  }

  doAttack() {
    // PUNTO 3: Ataques específicos por tipo de boss
    switch (this.bossType) {
      case 'boss_distancia':     this._distanciaAttack(); break;
      case 'boss_toxicidad':     this._toxicidadAttack(); break;
      case 'boss_desinteres':    this._desinteresAttack(); break;
      case 'boss_inseguridad':   this._inseguridadAttack(); break;
      case 'boss_celos':         this._celosAttack(); break;
      case 'boss_coleccionista': this._coleccionistaAttack(); break;
      default:                   this._genericAttack(); break;
    }

    // Verificar transición de fase
    if (this.hp < this.maxHP * 0.5 && this.phase < this.maxPhases && !this.phaseTriggered) {
      this.phase++;
      this.phaseTriggered = true;
      this.enterPhase2();
    }
  }

  // ── PUNTO 3: Ataques únicos por boss ─────────────────────────────────────

  // DISTANCIA: Teletransporta al jugador a una esquina lejana
  _distanciaAttack() {
    const attackTypes = ['teleport_player', 'charge', 'spread'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;

    if (type === 'teleport_player') {
      const player = this.scene.player;
      if (!player) return;
      // Flash en el jugador
      this.scene.cameras.main.flash(300, 100, 100, 200);
      const mapW = this.scene.currentMapData.width * 16;
      const mapH = this.scene.currentMapData.height * 16;
      const corners = [
        { x: 32, y: 32 }, { x: mapW - 32, y: 32 },
        { x: 32, y: mapH - 32 }, { x: mapW - 32, y: mapH - 32 },
      ];
      const target = Phaser.Math.RND.pick(corners);
      this.scene.tweens.add({
        targets: player,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          player.body.reset(target.x, target.y);
          this.scene.tweens.add({ targets: player, alpha: 1, duration: 200 });
        },
      });
    } else if (type === 'charge') {
      this.chargeAttack();
    } else {
      this.spreadAttack();
    }
  }

  // TOXICIDAD: Deja charcos de veneno en el suelo
  _toxicidadAttack() {
    const attackTypes = ['poison_pool', 'spread', 'charge'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;

    if (type === 'poison_pool') {
      // 3 charcos de veneno en posiciones aleatorias
      const scene = this.scene;
      for (let i = 0; i < 3; i++) {
        const px = this.x + (Math.random() - 0.5) * 120;
        const py = this.y + (Math.random() - 0.5) * 120;
        const pool = scene.add.circle(px, py, 16, 0x00b894, 0.5);
        pool.setDepth(3);
        const poolZone = scene.add.zone(px, py, 32, 32);
        scene.physics.add.existing(poolZone, true);

        // Daña al jugador si lo pisa
        const poolCollider = scene.physics.add.overlap(scene.player, poolZone, () => {
          if (!scene.player.invincible) {
            scene.player.takeDamage(1);
          }
        });

        // Dura 4 segundos (el collider se elimina con la zona)
        scene.tweens.add({
          targets: pool,
          alpha: 0,
          duration: 4000,
          onComplete: () => {
            scene.physics.world.removeCollider(poolCollider);
            if (pool.active) pool.destroy();
            if (poolZone.active) poolZone.destroy();
          },
        });
      }
    } else if (type === 'spread') {
      this.spreadAttack();
    } else {
      this.chargeAttack();
    }
  }

  // DESINTERÉS: Se vuelve invisible periódicamente
  _desinteresAttack() {
    const attackTypes = ['invisible', 'charge', 'summon'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;

    if (type === 'invisible') {
      // Se vuelve invisible por 2s
      this.scene.tweens.add({
        targets: this,
        alpha: 0.15,
        duration: 400,
        onComplete: () => {
          this.scene.time.delayedCall(2000, () => {
            if (!this.isDead) {
              this.scene.tweens.add({ targets: this, alpha: 1, duration: 400 });
              // Aparece cerca del jugador al volver
              const player = this.scene.player;
              if (player) {
                const angle = Math.random() * Math.PI * 2;
                const newX = player.x + Math.cos(angle) * 60;
                const newY = player.y + Math.sin(angle) * 60;
                this.body.reset(newX, newY);
              }
            }
          });
        },
      });
    } else if (type === 'charge') {
      this.chargeAttack();
    } else {
      this.summonAttack();
    }
  }

  // INSEGURIDAD: Crea 2 clones de sí mismo
  _inseguridadAttack() {
    const attackTypes = ['mirror_clones', 'spread', 'charge'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;

    if (type === 'mirror_clones') {
      // Los clones solo cada 15s: si aún está en espera se usa otro
      // ataque para no saturar la arena.
      const now = this.scene.time.now;
      if (now - (this._lastMirrorCast || 0) < 15000) {
        this.spreadAttack();
        return;
      }
      this._lastMirrorCast = now;
      // 2 clones con poca vida que se comportan como enemigos
      const scene = this.scene;
      for (let i = 0; i < 2; i++) {
        const cx = this.x + (i === 0 ? -40 : 40);
        const cy = this.y + 20;
        const clone = scene.add.sprite(cx, cy, `${this.bossType}_0`);
        clone.setDepth(14);
        clone.setAlpha(0.6);
        clone.setTint(0xa29bfe);
        clone.setScale(0.7);

        const cloneHp = { hp: 3 };
        scene.physics.add.existing(clone);
        clone.body.setSize(20, 20);

        // El clon persigue al jugador lentamente
        const chaseInterval = scene.time.addEvent({
          delay: 100,
          repeat: 60,
          callback: () => {
            if (!clone.active || !scene.player) return;
            const player = scene.player;
            const angle = Phaser.Math.Angle.Between(clone.x, clone.y, player.x, player.y);
            clone.body.setVelocity(Math.cos(angle) * 60, Math.sin(angle) * 60);
          },
        });

        // Daña al jugador al tocarlo
        scene.physics.add.overlap(scene.player, clone, () => {
          if (!scene.player.invincible) {
            scene.player.takeDamage(1);
          }
        });

        // Comprobar si el hitbox del jugador golpea al clon
        const hitCheck = scene.time.addEvent({
          delay: 100,
          repeat: 60,
          callback: () => {
            if (!clone.active || !scene.player.attackHitbox) return;
            if (scene.physics.overlap(scene.player.attackHitbox, clone)) {
              cloneHp.hp--;
              clone.setTint(0xff0000);
              scene.time.delayedCall(100, () => {
                if (clone.active) clone.setTint(0xa29bfe);
              });
              scene.player.attackHitbox.destroy();
              scene.player.attackHitbox = null;
              if (cloneHp.hp <= 0) {
                chaseInterval.remove();
                hitCheck.remove();
                scene.tweens.add({
                  targets: clone,
                  alpha: 0,
                  scale: 1.5,
                  duration: 300,
                  onComplete: () => {
                    if (clone.active) clone.destroy();
                  },
                });
              }
            }
          },
        });

        // Se destruyen solos a los 8s
        scene.time.delayedCall(8000, () => {
          if (clone.active) {
            chaseInterval.remove();
            hitCheck.remove();
            scene.tweens.add({
              targets: clone,
              alpha: 0,
              duration: 400,
              onComplete: () => {
                if (clone.active) clone.destroy();
              },
            });
          }
        });
      }
    } else if (type === 'spread') {
      this.spreadAttack();
    } else {
      this.chargeAttack();
    }
  }

  // CELOS: Crea un círculo que se reduce alrededor del jugador
  _celosAttack() {
    const attackTypes = ['shrinking_ring', 'spread', 'charge'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;

    if (type === 'shrinking_ring') {
      const player = this.scene.player;
      if (!player) return;

      const ring = this.scene.add.circle(player.x, player.y, 70, 0xe74c3c, 0);
      ring.setStrokeStyle(3, 0xe74c3c, 0.8);
      ring.setDepth(20);

      let radius = 70;
      const shrinkInterval = this.scene.time.addEvent({
        delay: 50,
        repeat: 40,
        callback: () => {
          if (!ring.active) return;
          radius -= 1.5;
          ring.setRadius(radius);
          ring.setPosition(player.x, player.y);

          // Si el jugador está dentro del radio reducido, daña
          if (radius < 20 && !player.invincible) {
            player.takeDamage(1);
          }
        },
      });

      this.scene.time.delayedCall(2200, () => {
        shrinkInterval.remove();
        if (ring.active) ring.destroy();
      });
    } else if (type === 'spread') {
      this.spreadAttack();
    } else {
      this.chargeAttack();
    }
  }

  // COLECCIONISTA: Usa ataques combinados de todos los bosses anteriores
  _coleccionistaAttack() {
    const allAttacks = [
      () => this.chargeAttack(),
      () => this.spreadAttack(),
      () => this.summonAttack(),
      // Ataque especial en fase 3: ráfaga de proyectiles
      () => {
        const count = 12;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          this._spawnProjectile(angle, 130, 0xe94560);
        }
      },
    ];

    // En fase 3 usa todos los ataques de forma más agresiva
    const pool = this.phase >= 3 ? allAttacks : allAttacks.slice(0, 3);
    const attack = pool[this.attackPattern % pool.length];
    this.attackPattern++;
    attack();

    if (this.hp < this.maxHP * 0.5 && this.phase < this.maxPhases && !this.phaseTriggered) {
      this.phase++;
      this.phaseTriggered = true;
      this.enterPhase2();
    }
  }

  // Ataque genérico para fallback
  _genericAttack() {
    const attackTypes = ['charge', 'spread', 'summon'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;
    if (type === 'charge') this.chargeAttack();
    else if (type === 'spread') this.spreadAttack();
    else this.summonAttack();
  }

  // ── Ataques comunes ─────────────────────────────────────────────────────

  chargeAttack() {
    const player = this.scene.player;
    if (!player) return;

    this.isCharging = true;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.body.setVelocity(
      Math.cos(angle) * 160,
      Math.sin(angle) * 160
    );

    this.scene.time.delayedCall(600, () => {
      if (!this.active || this.isDead || !this.body) return;
      this.body.setVelocity(0, 0);
      this.isCharging = false;
    });

    this.scene.tweens.add({
      targets: this,
      scale: 1.3,
      duration: 200,
      yoyo: true,
    });
  }

  spreadAttack() {
    const count = this.phase >= 2 ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const color = this.bossType.includes('toxicidad') ? 0x00b894 : 0xe74c3c;
      this._spawnProjectile(angle, 100, color);
    }
  }

  _spawnProjectile(angle, speed, color) {
    const scene = this.scene;
    const bullet = scene.add.zone(this.x, this.y, 8, 8);
    scene.physics.add.existing(bullet);
    bullet.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    const gfx = scene.add.graphics();
    gfx.fillStyle(color, 0.85);
    gfx.fillCircle(4, 4, 4);
    gfx.x = bullet.x - 4;
    gfx.y = bullet.y - 4;

    scene.time.addEvent({
      delay: 15,
      repeat: 133,
      callback: () => {
        if (bullet.active && gfx.active) {
          gfx.x = bullet.x - 4;
          gfx.y = bullet.y - 4;
        } else if (gfx.active) {
          gfx.destroy();
        }
      },
    });

    scene.time.delayedCall(2000, () => {
      scene.physics.world.removeCollider(bulletCollider);
      if (bullet.active) bullet.destroy();
      if (gfx.active) gfx.destroy();
    });

    const bulletCollider = scene.physics.add.overlap(scene.player, bullet, () => {
      if (!scene.player.invincible) {
        scene.player.takeDamage(this.damage);
        scene.physics.world.removeCollider(bulletCollider);
        if (bullet.active) bullet.destroy();
        if (gfx.active) gfx.destroy();
      }
    });
  }

  summonAttack() {
    if (this.scene.enemySprites) {
      for (let i = 0; i < 2; i++) {
        const ex = this.x + (Math.random() - 0.5) * 80;
        const ey = this.y + (Math.random() - 0.5) * 80;
        const enemyConfig = {
          type: 'enemy_shadow',
          hp: 2,
          damage: 1,
          patrol: [
            { x: Math.floor(ex / 16), y: Math.floor(ey / 16) },
            { x: Math.floor(ex / 16) + 2, y: Math.floor(ey / 16) },
          ],
        };
        const enemy = new (this.scene.EnemyClass)(this.scene, ex / 16, ey / 16, enemyConfig);
        this.scene.enemySprites.push(enemy);
      }
    }
  }

  enterPhase2() {
    this.scene.cameras.main.flash(500, 255, 0, 0);

    const dialogKey = `${this.bossType.replace('boss_', '')}_phase2`;
    const lines = Dialogues[dialogKey] || [`${this.bossName}: ¡No te detendré!`];
    this.scene.showDialogue(dialogKey);

    this.setTint(0xff4444);
    this.speed += 25;
    // Ataques más frecuentes en fase 2
    this.attackInterval = Math.max(1500, this.attackInterval - 600);

    // Fase 3 del Coleccionista
    if (this.phase === 3) {
      this.setTint(0xe94560);
      this.speed += 15;
      this.attackInterval = 1200;
    }
  }

  takeDamage(amount) {
    if (this.isDead || this.isHurt) return;

    this.hp -= amount;
    this.isHurt = true;

    this.setTint(0xffffff);

    const hpPercent = Math.max(0, this.hp / this.maxHP);
    this.hpBar.setSize(this.hpBarOriginWidth * hpPercent, 12);

    this.scene.cameras.main.shake(50, 0.005);

    this.scene.time.delayedCall(200, () => {
      this.clearTint();
      // Recuperar tinte de fase si aplica
      if (this.phase >= 2 && !this.isDead) this.setTint(0xff4444);
      if (this.phase >= 3 && !this.isDead) this.setTint(0xe94560);
      this.isHurt = false;
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    const scene = this.scene;
    this.body.setVelocity(0, 0);
    this.attackTimer = Infinity;

    // El jugador no puede morir durante la cinemática de derrota
    // (proyectiles/veneno residuales): evita reiniciar a una arena
    // vacía sin salida. El siguiente Player nace sin invencibilidad.
    if (scene.player && !scene.player.isDead) {
      scene.player.invincible = true;
    }

    this.scene.cameras.main.flash(1000, 255, 255, 255);

    const fragment = this.config.fragment;
    const fragmentName = this.config.fragmentName;
    const defeatDialogue = this.config.dialogue_defeat;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 2,
      duration: 1000,
      onComplete: () => {
        this.hpBarBg.destroy();
        this.hpBar.destroy();
        this.nameText.destroy();
        this.destroy();

        if (!GameState.defeatedBosses.includes(this.bossType)) {
          GameState.defeatedBosses.push(this.bossType);
        }

        if (fragment) {
          if (!GameState.fragments.includes(fragment)) {
            GameState.fragments.push(fragment);
          }
          scene.time.delayedCall(500, () => {
            scene.showFragmentScene(fragment, fragmentName);
          });
        } else {
          scene.time.delayedCall(500, () => {
            scene.showDialogue(defeatDialogue || 'coleccionista_defeat');
            scene.time.delayedCall(6000, () => {
              scene.events.emit('boss-defeated');
            });
          });
        }
      },
    });

    for (let i = 0; i < 16; i++) {
      const sp = this.scene.add.sprite(this.x, this.y, 'sparkle');
      sp.setTint(Phaser.Math.RND.pick([0xf1c40f, 0xff6b9d, 0x74b9ff, 0x55efc4]));
      const angle = (i / 16) * Math.PI * 2;
      this.scene.tweens.add({
        targets: sp,
        x: this.x + Math.cos(angle) * 80,
        y: this.y + Math.sin(angle) * 80,
        alpha: 0,
        scale: 2,
        duration: 1000,
        onComplete: () => sp.destroy(),
      });
    }
  }

  destroy() {
    super.destroy();
  }
}
