import Phaser from "phaser";
import {
  ASSETS,
  ATMO,
  COLORS,
  DAWN,
  ENEMIES,
  NIGHT,
  PLAYER,
  SPRITES,
  START_BLOOD_FRACTION,
  STEALTH,
  VIEW,
} from "../config.ts";
import { loadRun, type RunState } from "../systems/RunState.ts";
import { Player } from "../entities/Player.ts";
import { Enemy } from "../entities/Enemy.ts";
import {
  generateMap,
  randomFloorAway,
  Tile,
  type GameMap,
} from "../systems/MapGenerator.ts";
import { BloodSystem } from "../systems/BloodSystem.ts";
import { DawnSystem } from "../systems/DawnSystem.ts";
import { Hud } from "../ui/Hud.ts";
import { Atmosphere } from "../ui/Atmosphere.ts";
import { audio } from "../systems/AudioEngine.ts";

/**
 * GameScene is the night itself: map, entities, the update loop, win/lose.
 * Current build adds the core predator loop: prey to hunt, a claw that staggers,
 * and a bite that drains blood (with a vulnerable animation lock).
 */
export class GameScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private blood!: BloodSystem;
  private dawn!: DawnSystem;
  private hud!: Hud;
  private atmosphere!: Atmosphere;
  private bloodPools: Phaser.GameObjects.Ellipse[] = [];
  private run!: RunState;
  private night = 1;
  private ended = false;
  private rng!: Phaser.Math.RandomDataGenerator;

  private coffin!: Phaser.GameObjects.Sprite;
  private coffinGlow!: Phaser.GameObjects.Ellipse;
  private coffinPrompt!: Phaser.GameObjects.Text;
  private coffinArrow!: Phaser.GameObjects.Triangle;
  private sky!: Phaser.GameObjects.Rectangle;
  private warning!: Phaser.GameObjects.Text;

  private clawReadyAt = 0;
  private clawKey!: Phaser.Input.Keyboard.Key;
  private biteKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("Game");
  }

  create(): void {
    this.ended = false;
    this.bloodPools = [];
    this.run = loadRun(this.registry);
    this.night = this.run.night;

    this.rng = new Phaser.Math.RandomDataGenerator([`${Date.now()}`]);
    this.map = generateMap(this.rng);

    const worldW = this.map.cols * VIEW.tile;
    const worldH = this.map.rows * VIEW.tile;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor(COLORS.void);

    this.makeWallTexture();
    this.drawFloor();
    this.buildWalls();
    this.placeCoffin();

    this.player = new Player(this, this.map.playerSpawn.x!, this.map.playerSpawn.y!);
    this.player.setDashEnabled(this.run.hasDash);
    this.physics.add.collider(this.player, this.walls);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.blood = new BloodSystem({
      max: this.run.maxBlood,
      start: Math.round(this.run.maxBlood * START_BLOOD_FRACTION),
    });
    this.blood.setOnDeath(() => this.die("desiccation"));
    this.hud = new Hud(this, this.night);

    this.setupDawn();
    this.spawnEnemies();
    this.setupInput();
    this.atmosphere = new Atmosphere(this);
    audio.startAmbient();

    if (this.night === 1) this.showControlsHint();
  }

  /** A one-time, fading reminder of the controls on the first night. */
  private showControlsHint(): void {
    const hint = this.add
      .text(
        VIEW.width / 2,
        VIEW.height - 48,
        "WASD move   ·   Click / SPACE claw   ·   E / Right-click bite   ·   M mute\nKeep your blood up — reach your coffin before dawn",
        {
          fontFamily: "Georgia, serif",
          fontSize: "17px",
          color: "#e8e0d4",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002)
      .setAlpha(0.9);
    this.tweens.add({
      targets: hint,
      alpha: 0,
      delay: 5000,
      duration: 1200,
      onComplete: () => hint.destroy(),
    });
  }

  private spawnEnemies(): void {
    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);

    const preyCount = NIGHT.basePrey + (this.night - 1) * NIGHT.preyPerNight;
    const guardCount = NIGHT.baseGuards + (this.night - 1) * NIGHT.guardsPerNight;
    const spawn = (kind: typeof ENEMIES.villager, count: number) => {
      for (let i = 0; i < count; i++) {
        const pos = randomFloorAway(this.rng, this.map, this.player, 6);
        this.enemies.add(new Enemy(this, pos.x!, pos.y!, kind));
      }
    };
    spawn(ENEMIES.villager, preyCount);
    spawn(ENEMIES.guard, guardCount);

    // Hunters that touch the player draw blood.
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const enemy = e as Enemy;
      const now = this.time.now;
      if (enemy.canContact(now)) {
        enemy.markContact(now);
        this.blood.damage(enemy.contactDamage);
        this.cameras.main.shake(120, 0.006);
        audio.hurt();
      }
    });
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.clawKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.biteKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    kb.on("keydown-M", () => audio.toggleMute());
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.ended) return;
      if (p.rightButtonDown()) this.doBite();
      else this.doClaw();
    });
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;

    this.blood.update(delta);
    this.dawn.update(delta);
    this.hud.update(this.blood, this.dawn);

    // Sky brightens and the retreat warning shows as sunrise nears.
    this.sky.setAlpha(this.dawn.imminentRamp * DAWN.skyMaxAlpha);
    this.warning.setVisible(this.dawn.isImminent);
    this.updateCoffinBeacon();
    if (this.ended) return;

    if (Phaser.Input.Keyboard.JustDown(this.clawKey)) this.doClaw();
    if (Phaser.Input.Keyboard.JustDown(this.biteKey)) this.doBite();

    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
    for (const obj of this.enemies.getChildren()) {
      (obj as Enemy).think(this.time.now, playerPos);
    }

    this.atmosphere.update(
      this,
      this.player.x,
      this.player.y,
      this.blood.fraction,
      this.dawn.imminentRamp
    );
  }

  /** Swipe in the facing direction: stagger any prey caught in the arc. */
  private doClaw(): void {
    if (this.player.isLocked || this.time.now < this.clawReadyAt) return;
    this.clawReadyAt = this.time.now + this.run.clawCooldownMs;

    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const facing = this.player.facing;
    this.showClawSwipe(origin, facing);
    audio.claw();

    let connected = false;
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      const to = new Phaser.Math.Vector2(enemy.x - origin.x, enemy.y - origin.y);
      const dist = to.length();
      if (dist > PLAYER.clawRange + VIEW.tile / 2) continue;
      // Within a forward-facing half-arc.
      if (dist > 1 && facing.dot(to.clone().normalize()) < 0.2) continue;
      enemy.takeClaw(PLAYER.clawDamage, this.time.now);
      connected = true;
    }
    if (connected) audio.hitEnemy();
  }

  /** Bite the nearest staggered enemy: drain blood, kill it, lock briefly. */
  private doBite(): void {
    if (this.player.isLocked) return;

    let target: Enemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.isBiteable) continue;
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y
      );
      if (d <= PLAYER.biteRange + VIEW.tile / 2 && d < best) {
        best = d;
        target = enemy;
      }
    }
    if (!target) return;

    this.player.lockFor(this.run.biteLockMs);
    this.spillBlood(target.x, target.y);
    this.bloodBurst(target.x, target.y);
    this.blood.feed(this.run.biteRefill);
    const fx = target.x;
    const fy = target.y;
    target.destroy();
    this.cameras.main.flash(120, 80, 0, 0);
    audio.bite();
    this.witnessFeed(fx, fy);
  }

  /** Conscious villagers who are near a feed AND can see it turn hostile. */
  private witnessFeed(x: number, y: number): void {
    let anyWitness = false;
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.canWitness()) continue;
      const inRange =
        Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= STEALTH.witnessRange;
      if (inRange && this.hasLineOfSight(x, y, enemy.x, enemy.y)) {
        enemy.enrage();
        this.showAlert(enemy.x, enemy.y);
        anyWitness = true;
      }
    }
    if (anyWitness) audio.alarm();
  }

  /** True if no wall tile blocks the straight line between two world points. */
  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(1, Math.ceil(dist / (VIEW.tile * 0.5)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const col = Math.floor((x1 + (x2 - x1) * t) / VIEW.tile);
      const row = Math.floor((y1 + (y2 - y1) * t) / VIEW.tile);
      if (this.map.tiles[row]?.[col] === Tile.Wall) return false;
    }
    return true;
  }

  /** A red "!" that rises off a villager who just witnessed a feed. */
  private showAlert(x: number, y: number): void {
    const mark = this.add
      .text(x, y - VIEW.tile, "!", {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        color: "#ff4d4d",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(70);
    this.tweens.add({
      targets: mark,
      y: y - VIEW.tile * 2,
      alpha: 0,
      duration: 700,
      onComplete: () => mark.destroy(),
    });
  }

  private showClawSwipe(origin: Phaser.Math.Vector2, facing: Phaser.Math.Vector2): void {
    const angle = Math.atan2(facing.y, facing.x);
    const reach = PLAYER.clawRange + VIEW.tile / 2;
    const arc = this.add.graphics().setDepth(50);
    arc.lineStyle(3, COLORS.bone, 0.9);
    arc.beginPath();
    arc.arc(origin.x, origin.y, reach, angle - 0.7, angle + 0.7, false);
    arc.strokePath();
    this.tweens.add({
      targets: arc,
      alpha: 0,
      duration: 160,
      onComplete: () => arc.destroy(),
    });
  }

  /** A dark stain left where prey are drained — carnage that lingers. */
  private spillBlood(x: number, y: number): void {
    const pool = this.add
      .ellipse(
        x + Phaser.Math.Between(-4, 4),
        y + Phaser.Math.Between(0, 6),
        Phaser.Math.Between(20, 34),
        Phaser.Math.Between(12, 20),
        COLORS.bloodDark,
        0.55
      )
      .setDepth(-3)
      .setRotation(Phaser.Math.FloatBetween(0, Math.PI));
    this.bloodPools.push(pool);
    if (this.bloodPools.length > ATMO.maxBloodPools) {
      this.bloodPools.shift()?.destroy();
    }
  }

  private bloodBurst(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), COLORS.blood);
      dot.setDepth(60);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spd = Phaser.Math.Between(30, 90);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * spd,
        y: y + Math.sin(a) * spd,
        alpha: 0,
        duration: Phaser.Math.Between(250, 450),
        onComplete: () => dot.destroy(),
      });
    }
  }

  private die(cause: "desiccation" | "sunlight"): void {
    if (this.ended) return;
    this.ended = true;
    this.player.setVelocity(0, 0);
    audio.death();
    this.scene.start("GameOver", { night: this.night, cause });
  }

  /** One-time checkerboard floor fill — cheap and reads as stone in the dark. */
  private drawFloor(): void {
    const g = this.add.graphics();
    g.setDepth(-10);
    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        if (this.map.tiles[r][c] !== Tile.Floor) continue;
        g.fillStyle((c + r) % 2 === 0 ? COLORS.floor : COLORS.floorAlt, 1);
        g.fillRect(c * VIEW.tile, r * VIEW.tile, VIEW.tile, VIEW.tile);
      }
    }
  }

  /** Build a 32px solid dark-stone block texture: clean, reads as an obstacle. */
  private makeWallTexture(): void {
    const t = VIEW.tile;
    const g = this.add.graphics();
    g.fillStyle(0x2a2533, 1);
    g.fillRect(0, 0, t, t);
    g.fillStyle(0x3a3446, 1);
    g.fillRect(1, 1, t - 2, t - 3);
    g.fillStyle(0x4a4458, 1);
    g.fillRect(2, 2, t - 4, 3);
    g.fillStyle(0x201b29, 1);
    g.fillRect(2, t - 4, t - 4, 2);
    g.generateTexture("wallBlock", t, t);
    g.destroy();
  }

  private buildWalls(): void {
    this.walls = this.physics.add.staticGroup();
    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        if (this.map.tiles[r][c] !== Tile.Wall) continue;
        const wall = this.walls.create(
          c * VIEW.tile + VIEW.tile / 2,
          r * VIEW.tile + VIEW.tile / 2,
          "wallBlock"
        ) as Phaser.Physics.Arcade.Sprite;
        wall.refreshBody();
      }
    }
  }

  private placeCoffin(): void {
    const x = this.map.coffinSpawn.x!;
    const y = this.map.coffinSpawn.y!;

    // A gentle pulsing glow so the coffin is a visible beacon across the map.
    // Depth above the darkness layer (800) so it reads as a beacon across the map.
    this.coffinGlow = this.add
      .ellipse(x, y, VIEW.tile * 3, VIEW.tile * 3, COLORS.dawn, 0.18)
      .setDepth(805)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.tweens.add({
      targets: this.coffinGlow,
      scale: { from: 0.7, to: 1.05 },
      alpha: { from: 0.12, to: 0.32 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.coffin = this.add.sprite(x, y, ASSETS.tilesheet, SPRITES.coffin);
    this.coffin.setScale(VIEW.spriteScale);
    this.coffin.setTint(COLORS.bloodDark);
    this.coffin.setDepth(-1);

    // Contextual prompt, screen-fixed at bottom-center so it never clips at the
    // map edge where the coffin sits.
    this.coffinPrompt = this.add
      .text(VIEW.width / 2, VIEW.height - 96, "", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#f2b34a",
        align: "center",
        backgroundColor: "#07060acc",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002)
      .setVisible(false);

    // Screen-edge arrow that points to the coffin once dawn is imminent.
    this.coffinArrow = this.add
      .triangle(0, 0, 0, -12, -10, 8, 10, 8, COLORS.dawn)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);
  }

  /** Dawn clock, the brightening-sky overlay, and the retreat warning text. */
  private setupDawn(): void {
    const duration =
      NIGHT.baseDurationMs + (this.night - 1) * NIGHT.durationPerNightMs;
    this.dawn = new DawnSystem(duration);
    this.dawn.setOnDawn(() => this.onDawnBreak());

    this.sky = this.add
      .rectangle(0, 0, VIEW.width, VIEW.height, 0xffe2a8, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900)
      .setBlendMode(Phaser.BlendModes.SCREEN);

    this.warning = this.add
      .text(VIEW.width / 2, 70, "DAWN APPROACHES — REACH YOUR COFFIN", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#f2b34a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002)
      .setVisible(false);
  }

  /**
   * Guides the player to the coffin and lets them rest early. Once dawn is
   * imminent, touching the coffin banks the night immediately (hiding before
   * sunrise) rather than forcing the player to wait out the full meter.
   */
  private updateCoffinBeacon(): void {
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.coffin.x,
      this.coffin.y
    );
    const imminent = this.dawn.isImminent;
    const sated = this.blood.fraction >= DAWN.satedFraction;
    // You may retire to the coffin once dawn is near OR once fully sated.
    const canRest = imminent || sated;

    if (canRest && dist <= DAWN.coffinRange) {
      this.surviveNight();
      return;
    }

    // Contextual prompt when the player is near the coffin.
    if (dist <= DAWN.coffinRange * 2) {
      this.coffinPrompt
        .setText(
          canRest
            ? "Slip inside — rest until nightfall"
            : "Your coffin — rest here once sated, or when dawn nears"
        )
        .setVisible(true);
    } else {
      this.coffinPrompt.setVisible(false);
    }

    // Screen-edge arrow pointing to an off-screen coffin once resting is allowed.
    const onScreen = this.cameras.main.worldView.contains(
      this.coffin.x,
      this.coffin.y
    );
    if (canRest && !onScreen) {
      const ang = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        this.coffin.x,
        this.coffin.y
      );
      const rx = VIEW.width / 2 - 56;
      const ry = VIEW.height / 2 - 56;
      this.coffinArrow
        .setPosition(VIEW.width / 2 + Math.cos(ang) * rx, VIEW.height / 2 + Math.sin(ang) * ry)
        .setRotation(ang + Math.PI / 2)
        .setVisible(true);
    } else {
      this.coffinArrow.setVisible(false);
    }
  }

  private onDawnBreak(): void {
    if (this.ended) return;
    const reached =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.coffin.x,
        this.coffin.y
      ) <= DAWN.coffinRange;
    if (reached) this.surviveNight();
    else this.die("sunlight");
  }

  private surviveNight(): void {
    if (this.ended) return;
    this.ended = true;
    this.player.setVelocity(0, 0);
    audio.survive();
    // UpgradeScene draws the draft, applies it, and advances run.night.
    this.scene.start("Upgrade", { night: this.night });
  }
}
