import Phaser from "phaser";
import { DAWN } from "../config.ts";

/**
 * The night clock. Fills from 0 to 1 over the night's duration. When it reaches
 * 1, dawn breaks — the scene then checks whether the player made it to the
 * coffin. Becomes "imminent" near the end to warn the player to retreat.
 */
export class DawnSystem {
  private elapsed = 0;
  private durationMs: number;
  private broken = false;
  private onDawn?: () => void;

  constructor(durationMs: number) {
    this.durationMs = durationMs;
  }

  get progress(): number {
    return Phaser.Math.Clamp(this.elapsed / this.durationMs, 0, 1);
  }

  get isImminent(): boolean {
    return this.progress >= DAWN.imminentThreshold;
  }

  /** 0 until imminent, then ramps 0..1 across the final stretch (for the sky). */
  get imminentRamp(): number {
    const t = DAWN.imminentThreshold;
    return Phaser.Math.Clamp((this.progress - t) / (1 - t), 0, 1);
  }

  setOnDawn(cb: () => void): void {
    this.onDawn = cb;
  }

  update(deltaMs: number): void {
    if (this.broken) return;
    this.elapsed += deltaMs;
    if (this.progress >= 1) {
      this.broken = true;
      this.onDawn?.();
    }
  }
}
