import Phaser from "phaser";

/**
 * BootScene loads all assets, then hands off to the game.
 * For the scaffold step it loads nothing and immediately starts GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Asset loading (Kenney tileset, sprites) is added in a later step.
  }

  create(): void {
    this.scene.start("Game");
  }
}
