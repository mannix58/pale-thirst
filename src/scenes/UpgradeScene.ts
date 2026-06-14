import Phaser from "phaser";
import { COLORS, VIEW } from "../config.ts";
import { loadRun, saveRun } from "../systems/RunState.ts";
import { drawUpgrades, type Upgrade } from "../systems/UpgradePool.ts";
import { audio } from "../systems/AudioEngine.ts";

export interface UpgradeData {
  /** The night the player just survived. */
  night: number;
}

const CARD_W = 320;
const CARD_H = 280;
const GAP = 36;

/** Between-night draft: survive a night, choose one of up to three blood-powers. */
export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super("Upgrade");
  }

  create(data: UpgradeData): void {
    const cx = VIEW.width / 2;
    this.cameras.main.setBackgroundColor(COLORS.void);

    this.add
      .text(cx, 90, `YOU SURVIVED NIGHT ${data.night}`, {
        fontFamily: "Georgia, serif",
        fontSize: "44px",
        color: "#b1122a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 150, "Choose a power for the night to come", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#e8e0d4",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    const run = loadRun(this.registry);
    const rng = new Phaser.Math.RandomDataGenerator([`${Date.now()}`]);
    const choices = drawUpgrades(run, rng, 3);

    if (choices.length === 0) {
      // Nothing left to offer — straight on to the next night.
      this.advance();
      return;
    }

    const totalW = choices.length * CARD_W + (choices.length - 1) * GAP;
    const startX = cx - totalW / 2;
    const cardY = 200;

    choices.forEach((upgrade, i) => {
      const x = startX + i * (CARD_W + GAP);
      this.makeCard(x, cardY, i + 1, upgrade);
    });

    this.add
      .text(cx, cardY + CARD_H + 40, "Click a card, or press 1 – 3", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#f2b34a",
      })
      .setOrigin(0.5);

    choices.forEach((upgrade, i) => {
      this.input.keyboard!.once(`keydown-${["ONE", "TWO", "THREE"][i]}`, () =>
        this.choose(upgrade)
      );
    });
  }

  private makeCard(x: number, y: number, index: number, upgrade: Upgrade): void {
    const panel = this.add
      .rectangle(x, y, CARD_W, CARD_H, COLORS.ui, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COLORS.bloodDark)
      .setInteractive({ useHandCursor: true });

    const midX = x + CARD_W / 2;
    this.add
      .text(midX, y + 36, `${index}`, {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        color: "#5a0a16",
      })
      .setOrigin(0.5);
    this.add
      .text(midX, y + 110, upgrade.name, {
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        color: "#b1122a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(midX, y + 180, upgrade.description, {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#e8e0d4",
        align: "center",
        wordWrap: { width: CARD_W - 48 },
      })
      .setOrigin(0.5);

    panel.on("pointerover", () => panel.setStrokeStyle(3, COLORS.blood));
    panel.on("pointerout", () => panel.setStrokeStyle(2, COLORS.bloodDark));
    panel.on("pointerdown", () => this.choose(upgrade));
  }

  private choose(upgrade: Upgrade): void {
    audio.upgrade();
    const run = loadRun(this.registry);
    upgrade.apply(run);
    if (!run.taken.includes(upgrade.id)) run.taken.push(upgrade.id);
    saveRun(this.registry, run);
    this.advance();
  }

  private advance(): void {
    const run = loadRun(this.registry);
    run.night += 1;
    saveRun(this.registry, run);
    this.scene.start("Game");
  }
}
