import Phaser from "phaser";
import { COLORS, VIEW } from "../config.ts";
import { resetRun } from "../systems/RunState.ts";

export interface GameOverData {
  night: number;
  cause: "desiccation" | "sunlight";
}

/** Death screen: shows how the run ended and the nights survived, then restarts. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(data: GameOverData): void {
    const cx = VIEW.width / 2;
    const cy = VIEW.height / 2;
    const survived = Math.max(0, data.night - 1);

    this.cameras.main.setBackgroundColor(COLORS.void);

    const headline =
      data.cause === "sunlight" ? "CAUGHT IN THE DAWN" : "THE THIRST TOOK YOU";

    this.add
      .text(cx, cy - 70, headline, {
        fontFamily: "Georgia, serif",
        fontSize: "52px",
        color: "#b1122a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        cy + 6,
        survived === 0
          ? "You did not survive a single night."
          : `You survived ${survived} night${survived === 1 ? "" : "s"}.`,
        {
          fontFamily: "Georgia, serif",
          fontSize: "24px",
          color: "#e8e0d4",
        }
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, cy + 80, "Press R to rise again", {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        color: "#f2b34a",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const restart = () => {
      resetRun(this.registry);
      this.scene.start("Game");
    };
    this.input.keyboard!.once("keydown-R", restart);
    this.input.once("pointerdown", restart);
  }
}
