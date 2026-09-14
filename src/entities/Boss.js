import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';
import { Dialogues } from '../data/Dialogues.js';

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
    this.maxPhases = config.phases || 1;
    this.phaseTriggered = false;

    this.config = config;
    this.animFrame = 0;
    this.animTimer = 0;
    this.attackTimer = 0;
    this.attackPattern = 0;
    this.isCharging = false;

    this.hpBarBg = scene.add.rectangle(0, 0, 300, 16, 0x333333);
    this.hpBar = scene.add.rectangle(0, 0, 296, 12, 0xe74c3c);
    this.nameText = scene.add.text(0, 0, config.name, {
      fontSize: '10px', color: '#c4a35a', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.hpBarBg.setDepth(200);
    this.hpBar.setDepth(201);
    this.nameText.setDepth(201);

    this.hpBarOriginWidth = 296;

    this.anchorHud();
    scene.events.emit('boss-start', config.name);
  }

  anchorHud() {
    const cam = this.scene.cameras.main;
    if (!cam || !this.hpBarBg) return;
    const zoom = cam.zoom || 1;
    const uiScale = 1 / zoom;
    this.hpBarBg.setPosition(cam.scrollX + 320 / zoom, cam.scrollY + 20 / zoom).setScale(uiScale);
    this.hpBar.setPosition(cam.scrollX + 320 / zoom, cam.scrollY + 20 / zoom).setScale(uiScale);
    this.nameText.setPosition(cam.scrollX + 320 / zoom, cam.scrollY + 32 / zoom).setScale(uiScale);
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

    if (this.isHurt || this.isCharging) return;

    this.attackTimer += delta;
    if (this.attackTimer > 2000) {
      this.attackTimer = 0;
      this.doAttack();
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

  doAttack() {
    const attackTypes = ['charge', 'spread', 'summon'];
    const type = attackTypes[this.attackPattern % attackTypes.length];
    this.attackPattern++;

    switch (type) {
      case 'charge':
        this.chargeAttack();
        break;
      case 'spread':
        this.spreadAttack();
        break;
      case 'summon':
        this.summonAttack();
        break;
    }

    if (this.hp < this.maxHP * 0.5 && this.phase < this.maxPhases && !this.phaseTriggered) {
      this.phase++;
      this.phaseTriggered = true;
      this.enterPhase2();
    }
  }

  chargeAttack() {
    const player = this.scene.player;
    if (!player) return;

    this.isCharging = true;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.body.setVelocity(
      Math.cos(angle) * 150,
      Math.sin(angle) * 150
    );

    this.scene.time.delayedCall(600, () => {
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
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const bullet = this.scene.add.zone(this.x, this.y, 8, 8);
      this.scene.physics.add.existing(bullet);
      bullet.body.setVelocity(
        Math.cos(angle) * 100,
        Math.sin(angle) * 100
      );

      const gfx = this.scene.add.graphics();
      gfx.fillStyle(this.config.type.includes('toxicidad') ? 0x00b894 : 0xe74c3c, 0.8);
      gfx.fillCircle(4, 4, 4);
      gfx.x = bullet.x - 4;
      gfx.y = bullet.y - 4;

      this.scene.time.addEvent({
        delay: 15,
        repeat: 100,
        callback: () => {
          if (bullet.active) {
            gfx.x = bullet.x - 4;
            gfx.y = bullet.y - 4;
          }
        },
      });

      this.scene.time.delayedCall(1500, () => {
        bullet.destroy();
        gfx.destroy();
      });

      this.scene.physics.add.overlap(this.scene.player, bullet, () => {
        if (!this.scene.player.invincible) {
          this.scene.player.takeDamage(this.damage);
        }
      });
    }
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

    this.scene.showDialogue(Dialogues[`${this.bossType.replace('boss_', '')}_phase2`] || [
      `${this.bossName}: ¡No te detendré!`
    ]);

    this.setTint(0xff4444);
    this.speed += 20;
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
            scene.showDialogue(Dialogues[defeatDialogue] || ['El enemigo ha sido derrotado.']);
            scene.time.delayedCall(2000, () => {
              scene.events.emit('boss-defeated');
            });
          });
        }
      },
    });

    for (let i = 0; i < 12; i++) {
      const sp = this.scene.add.sprite(this.x, this.y, 'sparkle');
      sp.setTint(Phaser.Math.RND.pick([0xf1c40f, 0xff6b9d, 0x74b9ff, 0x55efc4]));
      const angle = (i / 12) * Math.PI * 2;
      this.scene.tweens.add({
        targets: sp,
        x: this.x + Math.cos(angle) * 60,
        y: this.y + Math.sin(angle) * 60,
        alpha: 0,
        scale: 2,
        duration: 800,
        onComplete: () => sp.destroy(),
      });
    }
  }

  destroy() {
    super.destroy();
  }
}
