import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { SPRITE_BAKE, SPRITE_SCALE } from '../config/Render.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x * 16 + 8, y * 16 + 12, 'player_down_idle_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    // El arte se hornea a SPRITE_BAKE veces su tamaño lógico (16x24); se dibuja
    // reducido para conservar la misma huella en el mundo, pero con más píxeles.
    // Por eso la hitbox se declara en píxeles de textura: Arcade la reescala.
    this.setScale(SPRITE_SCALE);
    this.body.setSize(10 * SPRITE_BAKE, 10 * SPRITE_BAKE);
    this.body.setOffset(3 * SPRITE_BAKE, 14 * SPRITE_BAKE);

    // MEJORA: velocidad aumentada de 120 a 145
    this.speed = 145;
    this.hp = GameState.hp;
    this.maxHP = GameState.maxHP;
    this.direction = 'down';
    this.isDead = false;
    this.isAttacking = false;
    this.isHurt = false;
    this.invincible = false;
    this.attackCooldown = 0;
    // MEJORA #4: hurtCooldown aumentado a 1200ms (más iframes, más justo)
    this.hurtCooldown = 0;
    this.interactTarget = null;
    this.attackHitbox = null;

    // PUNTO 9 & MEJORA: Habilidades desbloqueadas por fragmentos
    this.canDash = false;           // Fragmento Distancia
    this.extendedAttack = false;    // Fragmento Comprensión
    this.extraHeart = false;        // Fragmento Confianza
    this.auraAttack = false;        // Fragmento Unión

    // Estado del dash
    this.isDashing = false;
    this.dashCooldown = 0;
    this.dashDuration = 0;
    this.dashDir = { x: 0, y: 0 };

    // Combo de ataque
    this.comboCount = 0;
    this.comboTimer = 0;

    // Ataque cargado
    this.chargeTime = 0;
    this.isCharging = false;

    this.createAnimations();
    this.applyFragmentAbilities();
  }

  // PUNTO 9: Aplicar habilidades según fragmentos recolectados
  applyFragmentAbilities() {
    if (GameState.fragments.includes('fragment_distancia')) {
      this.canDash = true;
    }
    if (GameState.fragments.includes('fragment_toxicidad')) {
      this.extendedAttack = true;
    }
    if (GameState.fragments.includes('fragment_inseguridad')) {
      if (!this.extraHeart && GameState.maxHP < 8) {
        GameState.maxHP += 2;
        GameState.hp = Math.min(GameState.hp + 2, GameState.maxHP);
        this.maxHP = GameState.maxHP;
        this.hp = GameState.hp;
        this.extraHeart = true;
      }
    }
    if (GameState.fragments.includes('fragment_celos')) {
      this.auraAttack = true;
    }
  }

  createAnimations() {
    const dirs = ['down', 'up', 'left', 'right'];

    dirs.forEach(dir => {
      if (!this.scene.anims.exists(`player_${dir}_idle`)) {
        this.scene.anims.create({
          key: `player_${dir}_idle`,
          frames: [
            { key: `player_${dir}_idle_0` },
            { key: `player_${dir}_idle_1` },
          ],
          frameRate: 2,
          repeat: -1,
        });
      }

      if (!this.scene.anims.exists(`player_${dir}_walk`)) {
        this.scene.anims.create({
          key: `player_${dir}_walk`,
          frames: [
            { key: `player_${dir}_walk_0` },
            { key: `player_${dir}_walk_1` },
            { key: `player_${dir}_walk_2` },
            { key: `player_${dir}_walk_3` },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }

      if (!this.scene.anims.exists(`player_${dir}_attack`)) {
        this.scene.anims.create({
          key: `player_${dir}_attack`,
          frames: [
            { key: `player_${dir}_attack_0` },
            { key: `player_${dir}_attack_1` },
            { key: `player_${dir}_attack_2` },
          ],
          frameRate: 12,
          repeat: 0,
        });
      }

      if (!this.scene.anims.exists(`player_${dir}_hurt`)) {
        this.scene.anims.create({
          key: `player_${dir}_hurt`,
          frames: [
            { key: `player_${dir}_hurt_0` },
            { key: `player_${dir}_hurt_1` },
          ],
          frameRate: 6,
          repeat: 1,
        });
      }
    });
  }

  update(cursors, time, delta) {
    if (this.isDead) {
      this.body.setVelocity(0, 0);
      return;
    }

    // Si estamos dashing, no procesamos movimiento normal
    if (this.isDashing) {
      this.dashDuration -= delta;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.invincible = false;
        this.body.setVelocity(0, 0);
        this.setAlpha(1);
      }
      return;
    }

    if (this.isAttacking || this.isHurt || this.scene.isDialogActive) {
      this.body.setVelocity(0, 0);
      return;
    }

    let vx = 0, vy = 0;
    const up = cursors.up;
    const down = cursors.down;
    const left = cursors.left;
    const right = cursors.right;

    if (up) vy = -1;
    if (down) vy = 1;
    if (left) vx = -1;
    if (right) vx = 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    if (vx !== 0 || vy !== 0) {
      this.body.setVelocity(vx * this.speed, vy * this.speed);
      if (Math.abs(vx) > Math.abs(vy)) {
        this.direction = vx > 0 ? 'right' : 'left';
      } else {
        this.direction = vy > 0 ? 'down' : 'up';
      }
      this.play(`player_${this.direction}_walk`, true);
    } else {
      this.body.setVelocity(0, 0);
      this.play(`player_${this.direction}_idle`, true);
    }

    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.dashCooldown > 0) this.dashCooldown -= delta;

    if (this.hurtCooldown > 0) {
      this.hurtCooldown -= delta;
      if (this.hurtCooldown <= 0) this.isHurt = false;
    }

    // PUNTO 1: Detectar mantener SPACE para ataque cargado
    if (cursors.chargeHeld && !this.isAttacking && this.attackCooldown <= 0) {
      this.chargeTime += delta;
      // Efecto visual de carga
      if (this.chargeTime > 300 && !this._chargePulse) {
        this._chargePulse = true;
        this.scene.tweens.add({
          targets: this,
          scale: { from: SPRITE_SCALE, to: SPRITE_SCALE * 1.15 },
          duration: 200,
          yoyo: true,
          repeat: -1,
          id: 'charge_pulse',
        });
      }
    } else if (this._chargePulse && !cursors.chargeHeld) {
      this._chargePulse = false;
      this.scene.tweens.killTweensOf(this);
      this.setScale(SPRITE_SCALE);
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.checkInteractables();
  }

  attack(charged = false) {
    if (this.isDead || this.isAttacking || this.attackCooldown > 0) return;

    this.isAttacking = true;

    // PUNTO 1: Sistema de combo — cada golpe consecutivo rápido es más fuerte
    this.comboCount++;
    this.comboTimer = 800;
    const comboDamage = Math.min(this.comboCount, 3); // max 3 de daño en combo x3

    // Ataque cargado: 3 de daño, cooldown más largo
    const isCharged = charged || this.chargeTime >= 400;
    const attackDamage = isCharged ? 3 : comboDamage;
    this.chargeTime = 0;
    this._chargePulse = false;
    this.scene.tweens.killTweensOf(this);
    this.setScale(SPRITE_SCALE);

    this.attackCooldown = isCharged ? 600 : 350;
    this.body.setVelocity(0, 0);
    this.play(`player_${this.direction}_attack`, true);

    const offsets = {
      down: { x: 0, y: 16 },
      up: { x: 0, y: -16 },
      left: { x: -16, y: 0 },
      right: { x: 16, y: 0 },
    };

    const off = offsets[this.direction];
    // MEJORA: Ataque extendido (fragmento comprensión)
    const hitboxSize = this.extendedAttack ? 26 : 20;
    const hitboxOffset = this.extendedAttack ? { x: off.x * 1.2, y: off.y * 1.2 } : off;

    this.attackHitbox = this.scene.add.zone(
      this.x + hitboxOffset.x,
      this.y + hitboxOffset.y,
      hitboxSize, hitboxSize
    );
    this.scene.physics.add.existing(this.attackHitbox, true);
    this.attackHitbox.attackDamage = attackDamage;

    // PUNTO 1 & MEJORA: Aura de ataque (fragmento Unión)
    if (this.auraAttack) {
      this._doAuraAttack(attackDamage);
    }

    const effect = this.scene.add.sprite(this.x + off.x, this.y + off.y, 'slash_effect');
    effect.setAlpha(0.8);
    effect.setDepth(100);
    if (isCharged) {
      effect.setScale(1.8);
      effect.setTint(0xf1c40f);
    }
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: isCharged ? 2.5 : 1.5,
      duration: 300,
      onComplete: () => effect.destroy(),
    });

    this.once('animationcomplete', () => {
      this.isAttacking = false;
      if (this.attackHitbox) {
        this.attackHitbox.destroy();
        this.attackHitbox = null;
      }
    });

    this.scene.time.delayedCall(this.attackCooldown, () => {
      this.isAttacking = false;
      if (this.attackHitbox) {
        this.attackHitbox.destroy();
        this.attackHitbox = null;
      }
    });
  }

  // PUNTO 9: Aura de ataque — daña a todos los enemigos en rango
  _doAuraAttack(damage) {
    const auraRadius = 40;
    const aura = this.scene.add.circle(this.x, this.y, auraRadius, 0xff6b9d, 0.3);
    aura.setDepth(99);
    this.scene.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => aura.destroy(),
    });

    if (this.scene.enemySprites) {
      this.scene.enemySprites.forEach(enemy => {
        if (!enemy.active || enemy.isDead) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist <= auraRadius) {
          enemy.takeDamage(damage);
        }
      });
    }
    if (this.scene.currentBoss && !this.scene.currentBoss.isDead) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.currentBoss.x, this.scene.currentBoss.y);
      if (dist <= auraRadius * 1.5) {
        this.scene.currentBoss.takeDamage(damage);
      }
    }
  }

  // PUNTO 9: Dash (fragmento Distancia)
  dash(vx, vy) {
    if (!this.canDash || this.isDashing || this.dashCooldown > 0 || this.isDead) return;
    if (vx === 0 && vy === 0) {
      // Dash en dirección del personaje
      const dirMap = { down: [0,1], up: [0,-1], left: [-1,0], right: [1,0] };
      [vx, vy] = dirMap[this.direction];
    }

    this.isDashing = true;
    this.invincible = true;
    this.dashCooldown = 800;
    this.dashDuration = 180;

    const dashSpeed = 400;
    this.body.setVelocity(vx * dashSpeed, vy * dashSpeed);

    // Efecto visual de dash
    this.setAlpha(0.5);
    for (let i = 0; i < 4; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        if (!this.active) return;
        const ghost = this.scene.add.image(this.x, this.y, this.texture.key);
        ghost.setAlpha(0.3 - i * 0.06);
        ghost.setDepth(8);
        ghost.setScale(this.scaleX, this.scaleY);
        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 200,
          onComplete: () => ghost.destroy(),
        });
      });
    }
  }

  takeDamage(amount) {
    if (this.isDead || this.invincible || this.isHurt || this.scene.isDialogActive) return;

    this.hp = Math.max(0, this.hp - amount);
    GameState.hp = this.hp;
    this.isHurt = true;
    // MEJORA #4: iframes de 1200ms — más justo
    this.hurtCooldown = 1200;
    this.invincible = true;

    this.play(`player_${this.direction}_hurt`, true);
    this.scene.cameras.main.shake(100, 0.012);

    let flashCount = 0;
    this.scene.time.addEvent({
      delay: 100,
      repeat: 11,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) this.clearTint();
        else this.setTint(0xff0000);
      },
    });

    this.scene.time.delayedCall(1200, () => {
      this.clearTint();
      this.invincible = false;
      this.isHurt = false;
    });

    this.scene.events.emit('player-hurt', this.hp);

    if (this.hp <= 0) {
      this.isDead = true;
      this.body.setVelocity(0, 0);
      this.scene.events.emit('player-death');
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
    GameState.hp = this.hp;
    this.scene.events.emit('player-hurt', this.hp);
    // Efecto de curación
    const healEffect = this.scene.add.text(this.x, this.y - 10, '+' + amount + '♥', {
      fontSize: '8px', color: '#55efc4', fontFamily: 'monospace',
    }).setDepth(200).setOrigin(0.5);
    this.scene.tweens.add({
      targets: healEffect,
      y: healEffect.y - 20,
      alpha: 0,
      duration: 800,
      onComplete: () => healEffect.destroy(),
    });
  }

  checkInteractables() {
    const range = 24;
    let closest = null;
    let closestDist = Infinity;

    if (this.scene.interactables) {
      this.scene.interactables.forEach(obj => {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, obj.x, obj.y);
        if (dist < range && dist < closestDist) {
          closest = obj;
          closestDist = dist;
        }
      });
    }

    if (this.scene.npcSprites) {
      this.scene.npcSprites.forEach(npc => {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, npc.x, npc.y);
        if (dist < range && dist < closestDist) {
          closest = npc;
          closestDist = dist;
        }
      });
    }

    // Hide all indicators first
    if (this.scene.interactables) {
      this.scene.interactables.forEach(obj => {
        if (obj.interactIndicator) obj.interactIndicator.setVisible(false);
      });
    }
    if (this.scene.npcSprites) {
      this.scene.npcSprites.forEach(npc => {
        if (npc.interactIndicator) npc.interactIndicator.setVisible(false);
      });
    }

    this.interactTarget = closest;

    if (closest && closest.interactIndicator) {
      closest.interactIndicator.setVisible(true);
    }

    if (this.scene.interactPrompt) {
      this.scene.interactPrompt.setVisible(!!closest);
    }
  }

  interact() {
    if (this.isDead || !this.interactTarget) return;
    const target = this.interactTarget;

    if (target.interactType === 'exit') {
      this.scene.changeMap(target.targetMap, target.spawnX, target.spawnY);
    } else if (target.interactType === 'boss_arena') {
      this.scene.changeMap(target.targetMap, target.spawnX || 7, target.spawnY || 13);
    } else if (target.interactDialogue || target.interactType === 'npc' || target.interactType === 'object') {
      const dialogueId = target.interactDialogue || target.interactType;
      this.scene.showDialogue(dialogueId);
    } else if (target.interactType === 'letter') {
      this.scene.collectLetter(target.letterId);
    } else if (target.interactType === 'fragment') {
      this.scene.collectFragment(target.fragmentData);
    }
  }
}
