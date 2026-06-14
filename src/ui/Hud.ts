import Phaser from "phaser";
import { COLORS } from "../config.ts";
import type { BloodSystem } from "../systems/BloodSystem.ts";
import type { DawnSystem } from "../systems/DawnSystem.ts";

const PAD = 18;
const BAR_W = 320;
const BAR_H = 24;
const DAWN_H = 10;

/**
 * Heads-up display. Fixed to the camera. Currently shows the blood bar and the
 * night number; the dawn meter is added in a later step.
 */
export class Hud {
  private g: Phaser.GameObjects.Graphics;
  private nightLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, night: number) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(1000);

    scene.add
      .text(PAD, PAD - 2, "BLOOD", {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#e8e0d4",
      })
      .setScrollFactor(0)
      .setDepth(1001);

    this.nightLabel = scene.add
      .text(scene.scale.width - PAD, PAD, "", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#f2b34a",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.setNight(night);
  }

  setNight(night: number): void {
    this.nightLabel.setText(`Night ${night}`);
  }

  update(blood: BloodSystem, dawn: DawnSystem): void {
    const x = PAD;
    const y = PAD + 14;
    this.g.clear();

    // Blood bar: frame + track + fill.
    this.g.fillStyle(COLORS.ui, 0.85);
    this.g.fillRect(x - 2, y - 2, BAR_W + 4, BAR_H + 4);
    this.g.fillStyle(COLORS.bloodDark, 0.6);
    this.g.fillRect(x, y, BAR_W, BAR_H);
    this.g.fillStyle(COLORS.blood, 1);
    this.g.fillRect(x, y, BAR_W * blood.fraction, BAR_H);
    this.g.lineStyle(2, COLORS.bone, 0.5);
    this.g.strokeRect(x, y, BAR_W, BAR_H);

    // Dawn meter beneath the blood bar: night fills it toward sunrise.
    const dy = y + BAR_H + 6;
    this.g.fillStyle(COLORS.ui, 0.85);
    this.g.fillRect(x, dy, BAR_W, DAWN_H);
    this.g.fillStyle(COLORS.dawn, dawn.isImminent ? 1 : 0.8);
    this.g.fillRect(x, dy, BAR_W * dawn.progress, DAWN_H);
    this.g.lineStyle(1, COLORS.bone, 0.35);
    this.g.strokeRect(x, dy, BAR_W, DAWN_H);
  }
}
