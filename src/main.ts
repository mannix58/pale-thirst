import Phaser from "phaser";
import { COLORS, VIEW } from "./config.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { GameScene } from "./scenes/GameScene.ts";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: COLORS.void,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
};

new Phaser.Game(config);
