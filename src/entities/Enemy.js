import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { Dialogues } from '../data/Dialogues.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x * 16 + 8, y * 16 + 8, `${config.type}_0`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(10, 10);
    this.hp = config.hp;
    this.maxHP = config.hp;
    this.damage = config.damage;
    this.enemyType = config.type;
    this.speed = 40;
    this.patrol = config.patrol || [];
    this.patrolIndex = 0;
    this.patrolWait = 0;
    this.isHurt = false;
    this.isDead = false;

    this.animFrame = 0;
    this.animTimer = 0;

    this.interactType = null;
    this.interactIndicator = null;
    this.interactDialogue = null;

    // PUNTO 2: Radio de detección del jugador
    this.alertRadius = 80;
    this.isChasing = false;
    this.chaseTimer = 0;

    this.hpBarBg = scene.add.rectangle(x, y - 12, 14, 3, 0x333333);
    this.hpBar = scene.add.rectangle(x, y - 12, 14, 3, 0xe74c3c);
    this.hpBarBg.setVisible(false);
    this.hpBar.setVisible(false);
    this.hpBarBg.setDepth(50);
    this.hpBar.setDepth(51);

    this.hpBarOriginWidth = 14;
  }

  update(time, delta) {
    if (this.isDead || !this.active) return;

    this.animTimer += delta;
    if (this.animTimer > 200) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 3;
      this.setTexture(`${this.enemyType}_${this.animFrame}`);
    }

    if (this.isHurt) return;

    const player = this.scene.player;

    // PUNTO 2: Lógica de detección y persecución
    if (player && !player.isDead) {
      const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

      if (distToPlayer < this.alertRadius) {
        // Jugador detectado: perseguir
        this.isChasing = true;
        this.chaseTimer = 2000; // Continúa persiguiendo 2s después de perder de vista
      } else if (this.isChasing) {
        this.chaseTimer -= delta;
        if (this.chaseTimer <= 0) {
          this.isChasing = false;
        }
      }

      if (this.isChasing) {
        // Perseguir al jugador
        if (distToPlayer > 12) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
          this.body.setVelocity(
            Math.cos(angle) * (this.speed * 1.4),
            Math.sin(angle) * (this.speed * 1.4)
          );
        } else {
          this.body.setVelocity(0, 0);
        }
        // Actualizar HP bar position mientras persigue
        this.hpBarBg.setPosition(this.x, this.y - 12);
        this.hpBar.setPosition(this.x - (this.hpBarOriginWidth * (1 - this.hp / this.maxHP)) / 2, this.y - 12);
        return;
      }
    }

    // Patrulla normal si no está persiguiendo
    if (this.patrol.length > 1) {
      const target = this.patrol[this.patrolIndex];
      const tx = target.x * 16 + 8;
      const ty = target.y * 16 + 8;

      if (this.patrolWait > 0) {
        this.patrolWait -= delta;
        this.body.setVelocity(0, 0);
        return;
      }

      const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
      if (dist < 4) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
        this.patrolWait = 1000 + Math.random() * 1000;
        this.body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
        this.body.setVelocity(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        );
      }
    }
  }

  takeDamage(amount) {
    if (this.isDead || this.isHurt) return;

    this.hp -= amount;
    this.isHurt = true;

    // PUNTO 2: Al recibir daño, entrar en modo persecución
    this.isChasing = true;
    this.chaseTimer = 3000;

    this.setTint(0xff0000);
    this.hpBarBg.setVisible(true);
    this.hpBar.setVisible(true);

    const hpPercent = Math.max(0, this.hp / this.maxHP);
    this.hpBar.setSize(this.hpBarOriginWidth * hpPercent, 3);
    this.hpBar.setPosition(this.x - (this.hpBarOriginWidth * (1 - hpPercent)) / 2, this.y - 12);
    this.hpBarBg.setPosition(this.x, this.y - 12);

    this.body.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this,
      x: this.x + (Math.random() - 0.5) * 10,
      y: this.y + (Math.random() - 0.5) * 10,
      duration: 100,
      onComplete: () => {
        this.scene.time.delayedCall(300, () => {
          this.clearTint();
          this.isHurt = false;
        });
      },
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.body.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => {
        if (this.hpBarBg && this.hpBarBg.active) this.hpBarBg.destroy();
        if (this.hpBar && this.hpBar.active) this.hpBar.destroy();
        this.destroy();
      },
    });

    const sparkle = this.scene.add.sprite(this.x, this.y, 'sparkle');
    sparkle.setTint(0xf1c40f);
    this.scene.tweens.add({
      targets: sparkle,
      alpha: 0,
      scale: 3,
      duration: 600,
      onComplete: () => sparkle.destroy(),
    });

    // Drop de salud con mayor probabilidad si el jugador está bajo
    const healChance = GameState.hp < GameState.maxHP * 0.5 ? 0.5 : 0.3;
    if (Math.random() < healChance) {
      this.scene.spawnHealthDrop(this.x, this.y);
    }
  }
}
