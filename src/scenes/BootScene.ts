import Phaser from "phaser";
import { ASSETS } from "../config.ts";

/**
 * BootScene loads all assets, then hands off to the game.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.spritesheet(ASSETS.tilesheet, ASSETS.tilesheetPath, {
      frameWidth: ASSETS.frame,
      frameHeight: ASSETS.frame,
    });
  }

  create(): void {
    this.scene.start("Game");
  }
}
