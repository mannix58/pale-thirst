import Phaser from "phaser";
import { BLOOD } from "../config.ts";

/**
 * The vampire's single unified resource: health, thirst clock, and life force.
 * Drains constantly over time; damage subtracts; feeding restores. At zero the
 * vampire desiccates. UI-agnostic — the HUD reads `current`/`max`/`fraction`.
 */
export class BloodSystem {
  current: number;
  max: number;
  private drainPerSecond: number;
  private dead = false;
  private onDeath?: () => void;

  constructor(opts?: { max?: number; start?: number; drainPerSecond?: number }) {
    this.max = opts?.max ?? BLOOD.max;
    this.current = opts?.start ?? BLOOD.start;
    this.drainPerSecond = opts?.drainPerSecond ?? BLOOD.drainPerSecond;
  }

  get fraction(): number {
    return Phaser.Math.Clamp(this.current / this.max, 0, 1);
  }

  setOnDeath(cb: () => void): void {
    this.onDeath = cb;
  }

  /** Advance the constant thirst drain. `deltaMs` is the frame delta. */
  update(deltaMs: number): void {
    if (this.dead) return;
    this.drain((this.drainPerSecond * deltaMs) / 1000);
  }

  /** Sharp loss from taking a hit. */
  damage(amount: number): void {
    this.drain(amount);
  }

  /** Restore blood from a successful feed, never above max. */
  feed(amount: number): void {
    if (this.dead) return;
    this.current = Math.min(this.max, this.current + amount);
  }

  /** Permanently raise the pool (and top up by the same amount). */
  increaseMax(amount: number): void {
    this.max += amount;
    this.feed(amount);
  }

  private drain(amount: number): void {
    if (this.dead) return;
    this.current -= amount;
    if (this.current <= 0) {
      this.current = 0;
      this.dead = true;
      this.onDeath?.();
    }
  }
}
