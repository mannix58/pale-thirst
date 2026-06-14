import Phaser from "phaser";
import { ATMO, COLORS, VIEW } from "../config.ts";

/**
 * Night mood overlays:
 *  - a darkness layer with a soft light hole that follows the vampire, so the
 *    world fades to black beyond the predator's vision, and
 *  - a red edge vignette that pulses (faster as blood runs low) to make the
 *    thirst pressure visceral.
 *
 * Both are screen-fixed; the darkness uses a RenderTexture erased each frame.
 */
export class Atmosphere {
  private rt: Phaser.GameObjects.RenderTexture;
  private vignette: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.makeLightBrush(scene);
    this.makeVignette(scene);

    this.rt = scene.add
      .renderTexture(0, 0, VIEW.width, VIEW.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(800);

    this.vignette = scene.add
      .image(0, 0, "lowBloodVig")
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(850)
      .setAlpha(0);
  }

  /** Soft radial brush used to erase the darkness around the vampire. */
  private makeLightBrush(scene: Phaser.Scene): void {
    if (scene.textures.exists("lightBrush")) return;
    const size = ATMO.lightOuter * 2;
    const tex = scene.textures.createCanvas("lightBrush", size, size)!;
    const ctx = tex.getContext();
    const c = size / 2;
    const g = ctx.createRadialGradient(c, c, ATMO.lightInner, c, c, ATMO.lightOuter);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.65, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  /** Screen-sized red radial gradient, transparent in the middle. */
  private makeVignette(scene: Phaser.Scene): void {
    if (scene.textures.exists("lowBloodVig")) return;
    const w = VIEW.width;
    const h = VIEW.height;
    const tex = scene.textures.createCanvas("lowBloodVig", w, h)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.78);
    g.addColorStop(0, "rgba(150,0,0,0)");
    g.addColorStop(1, "rgba(150,0,0,0.9)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  update(
    scene: Phaser.Scene,
    px: number,
    py: number,
    bloodFraction: number,
    dawnRamp: number
  ): void {
    const cam = scene.cameras.main;
    const sx = px - cam.scrollX;
    const sy = py - cam.scrollY;

    // Darkness lifts as dawn approaches.
    const dark = ATMO.darkness * (1 - 0.75 * dawnRamp);
    this.rt.clear();
    this.rt.fill(COLORS.void, dark);
    this.rt.erase("lightBrush", sx - ATMO.lightOuter, sy - ATMO.lightOuter);

    // Low-blood danger vignette: stronger and faster as blood drops.
    const intensity = Phaser.Math.Clamp(
      (ATMO.lowBloodThreshold - bloodFraction) / ATMO.lowBloodThreshold,
      0,
      1
    );
    if (intensity <= 0) {
      this.vignette.setAlpha(0);
      return;
    }
    const hz = 1.6 + intensity * 4;
    const pulse = 0.5 + 0.5 * Math.sin((scene.time.now / 1000) * hz * Math.PI);
    this.vignette.setAlpha(intensity * ATMO.lowBloodMaxAlpha * (0.4 + 0.6 * pulse));
  }
}
