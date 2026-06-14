import Phaser from "phaser";
import { ASSETS, COLORS, STEALTH, VIEW, type EnemyKind } from "../config.ts";

const ENRAGED_TINT = 0xff4d4d;

const enum State {
  Wander,
  Alert, // fleeing (prey) or chasing (hunter)
  Staggered,
}

/**
 * A creature on the night map. Prey wander and flee; hunters chase. A claw
 * knocks an enemy into the Staggered state, where it is helpless and biteable.
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  private aiState = State.Wander;
  private health: number;
  private staggerUntil = 0;
  private nextWanderAt = 0;
  private lastContactAt = 0;
  /** A villager that witnessed a feed and turned hostile. */
  private enraged = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    super(scene, x, y, ASSETS.tilesheet, kind.frame);
    this.kind = kind;
    this.health = kind.maxHealth;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(VIEW.spriteScale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(3, 1, 1);
    body.setCollideWorldBounds(true);
  }

  get isBiteable(): boolean {
    return this.aiState === State.Staggered && this.active;
  }

  /** Hunts the player either by nature (guards) or by rage (witness villagers). */
  get isHunterNow(): boolean {
    return this.kind.isHunter || this.enraged;
  }

  get contactDamage(): number {
    return this.enraged ? STEALTH.enragedDamage : this.kind.contactDamage;
  }

  private get contactCooldownMs(): number {
    return this.enraged ? STEALTH.enragedCooldownMs : this.kind.contactCooldownMs;
  }

  /** A conscious, peaceable villager who could witness a nearby feed. */
  canWitness(): boolean {
    return !this.kind.isHunter && !this.enraged && this.active && !this.isBiteable;
  }

  /** Turn hostile after seeing the vampire feed: now chases and bites. */
  enrage(): void {
    if (this.enraged) return;
    this.enraged = true;
    this.aiState = State.Alert;
    this.setTint(ENRAGED_TINT);
    this.scene.tweens.add({
      targets: this,
      scale: { from: VIEW.spriteScale * 1.35, to: VIEW.spriteScale },
      duration: 220,
      ease: "Back.out",
    });
  }

  /** True if a contact hit is allowed right now (hunters/enraged damaging the player). */
  canContact(now: number): boolean {
    return (
      this.isHunterNow &&
      this.aiState !== State.Staggered &&
      now - this.lastContactAt >= this.contactCooldownMs
    );
  }

  markContact(now: number): void {
    this.lastContactAt = now;
  }

  /** Take a claw hit. Returns true if this hit staggered the enemy. */
  takeClaw(damage: number, now: number): boolean {
    if (this.aiState === State.Staggered) return false;
    this.health -= damage;
    this.flashHit();
    if (this.health <= 0) {
      this.enterStagger(now);
      return true;
    }
    return false;
  }

  private enterStagger(now: number): void {
    this.aiState = State.Staggered;
    this.staggerUntil = now + this.kind.staggerMs;
    this.setVelocity(0, 0);
    this.setTint(COLORS.bone);
    this.setAngle(90); // toppled over: reads as "downed / bleeding out"
  }

  private flashHit(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active && this.aiState !== State.Staggered) this.restoreTint();
    });
  }

  private restoreTint(): void {
    if (this.enraged) this.setTint(ENRAGED_TINT);
    else this.clearTint();
  }

  private recover(): void {
    this.aiState = State.Wander;
    this.health = this.kind.maxHealth;
    this.restoreTint();
    this.setAngle(0);
  }

  /** Driven by the scene each frame with the player's position. */
  think(now: number, player: Phaser.Math.Vector2): void {
    if (!this.active) return;

    if (this.aiState === State.Staggered) {
      this.setVelocity(0, 0);
      if (now >= this.staggerUntil) this.recover();
      return;
    }

    const here = new Phaser.Math.Vector2(this.x, this.y);
    const toPlayer = player.clone().subtract(here);
    const dist = toPlayer.length();

    // Enraged villagers hunt relentlessly; others react within their senses.
    const range = this.enraged ? Number.POSITIVE_INFINITY : this.kind.detectRange;
    if (dist <= range) {
      this.aiState = State.Alert;
      const speed = this.enraged ? STEALTH.enragedSpeed : this.kind.alertSpeed;
      const dir = toPlayer.normalize();
      if (!this.isHunterNow) dir.negate(); // peaceable prey flee
      this.setVelocity(dir.x * speed, dir.y * speed);
      this.setFlipX(dir.x < 0);
      return;
    }

    // Out of range: idle wandering.
    this.aiState = State.Wander;
    if (now >= this.nextWanderAt) {
      this.nextWanderAt = now + Phaser.Math.Between(700, 1800);
      if (Phaser.Math.Between(0, 2) === 0) {
        this.setVelocity(0, 0);
      } else {
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.setVelocity(Math.cos(a) * this.kind.speed, Math.sin(a) * this.kind.speed);
        this.setFlipX(Math.cos(a) < 0);
      }
    }
  }
}
