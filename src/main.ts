import Phaser from "phaser";
import { COLORS, VIEW } from "./config.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { GameScene } from "./scenes/GameScene.ts";
import { UpgradeScene } from "./scenes/UpgradeScene.ts";
import { GameOverScene } from "./scenes/GameOverScene.ts";
import { audio } from "./systems/AudioEngine.ts";

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
  scene: [BootScene, GameScene, UpgradeScene, GameOverScene],
};

const game = new Phaser.Game(config);

// Resume the audio context on the first pointer/key input (browser autoplay).
audio.attachUnlock();

// Dev-only handles for automated checks; stripped from production builds.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game; __audio: typeof audio }).__game =
    game;
  (window as unknown as { __audio: typeof audio }).__audio = audio;
}
