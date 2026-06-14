import Phaser from "phaser";
import { ASSETS, DASH, PLAYER, SPRITES, VIEW } from "../config.ts";

interface MoveKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

/**
 * The vampire: 8-directional movement with wall collision, a bite movement-lock,
 * and an optional Bat Dash (granted by an upgrade) bound to SHIFT.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private keys: MoveKeys;
  private wasd: MoveKeys;
  private shiftKey: Phaser.Input.Keyboard.Key;
  /** Last non-zero facing direction, used to aim the claw and dash. */
  public facing = new Phaser.Math.Vector2(1, 0);
  /** While `scene.time.now < lockedUntil` the player cannot move (bite lock). */
  private lockedUntil = 0;

  private dashEnabled = false;
  private dashUntil = 0;
  private dashReadyAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSETS.tilesheet, SPRITES.vampire);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(VIEW.spriteScale);
    this.setOrigin(0.5);
    // Tighter circular body than the full 8px frame for fair collisions.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(3, 1, 1);
    body.setCollideWorldBounds(true);

    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shiftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  setDashEnabled(enabled: boolean): void {
    this.dashEnabled = enabled;
  }

  /** Freeze movement for `ms` (the bite animation lock). */
  lockFor(ms: number): void {
    this.lockedUntil = this.scene.time.now + ms;
  }

  get isLocked(): boolean {
    return this.scene.time.now < this.lockedUntil;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const now = this.scene.time.now;

    if (this.isLocked) {
      this.setVelocity(0, 0);
      return;
    }

    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.keys.left.isDown || this.wasd.left.isDown) dir.x -= 1;
    if (this.keys.right.isDown || this.wasd.right.isDown) dir.x += 1;
    if (this.keys.up.isDown || this.wasd.up.isDown) dir.y -= 1;
    if (this.keys.down.isDown || this.wasd.down.isDown) dir.y += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize();
      this.facing.copy(dir);
      this.setFlipX(dir.x < 0);
    }

    // Trigger a dash in the current facing direction.
    if (
      this.dashEnabled &&
      Phaser.Input.Keyboard.JustDown(this.shiftKey) &&
      now >= this.dashReadyAt
    ) {
      this.dashUntil = now + DASH.durationMs;
      this.dashReadyAt = now + DASH.cooldownMs;
    }

    if (now < this.dashUntil) {
      this.setVelocity(
        this.facing.x * PLAYER.speed * DASH.speedMult,
        this.facing.y * PLAYER.speed * DASH.speedMult
      );
      return;
    }

    this.setVelocity(dir.x * PLAYER.speed, dir.y * PLAYER.speed);
  }
}
