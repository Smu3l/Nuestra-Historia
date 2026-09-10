import Phaser from 'phaser';
import { GameState } from '../data/GameState.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x * 16 + 8, y * 16 + 12, 'player_down_idle_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(10, 10);
    this.body.setOffset(3, 14);

    this.speed = 120;
    this.hp = GameState.hp;
    this.maxHP = GameState.maxHP;
    this.direction = 'down';
    this.isAttacking = false;
    this.isHurt = false;
    this.invincible = false;
    this.attackCooldown = 0;
    this.hurtCooldown = 0;
    this.interactTarget = null;
    this.attackHitbox = null;

    this.createAnimations();
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
    if (this.hurtCooldown > 0) {
      this.hurtCooldown -= delta;
      if (this.hurtCooldown <= 0) this.isHurt = false;
    }

    this.checkInteractables();
  }

  attack() {
    if (this.isAttacking || this.attackCooldown > 0) return;

    this.isAttacking = true;
    this.attackCooldown = 400;
    this.body.setVelocity(0, 0);
    this.play(`player_${this.direction}_attack`, true);

    const offsets = {
      down: { x: 0, y: 16 },
      up: { x: 0, y: -16 },
      left: { x: -16, y: 0 },
      right: { x: 16, y: 0 },
    };

    const off = offsets[this.direction];
    this.attackHitbox = this.scene.add.zone(this.x + off.x, this.y + off.y, 20, 20);
    this.scene.physics.add.existing(this.attackHitbox, true);

    const effect = this.scene.add.sprite(this.x + off.x, this.y + off.y, 'slash_effect');
    effect.setAlpha(0.8);
    effect.setDepth(100);
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.5,
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

    this.scene.time.delayedCall(400, () => {
      this.isAttacking = false;
      if (this.attackHitbox) {
        this.attackHitbox.destroy();
        this.attackHitbox = null;
      }
    });
  }

  takeDamage(amount) {
    if (this.invincible || this.isHurt) return;

    this.hp = Math.max(0, this.hp - amount);
    GameState.hp = this.hp;
    this.isHurt = true;
    this.hurtCooldown = 800;
    this.invincible = true;

    this.play(`player_${this.direction}_hurt`, true);
    this.scene.cameras.main.shake(100, 0.01);

    let flashCount = 0;
    const flashEvent = this.scene.time.addEvent({
      delay: 100,
      repeat: 7,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) this.clearTint();
        else this.setTint(0xff0000);
      },
    });

    this.scene.time.delayedCall(800, () => {
      this.clearTint();
      this.invincible = false;
      this.isHurt = false;
    });

    this.scene.events.emit('player-hurt', this.hp);

    if (this.hp <= 0) {
      this.scene.events.emit('player-death');
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
    GameState.hp = this.hp;
    this.scene.events.emit('player-hurt', this.hp);
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
    if (!this.interactTarget) return;
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
