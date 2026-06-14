/**
 * Tunable game-feel constants for Pale Thirst.
 * Keep all balance/feel numbers here so the core loop can be iterated quickly.
 */

export const VIEW = {
  width: 1280,
  height: 720,
  /** World pixels per map grid cell. */
  tile: 32,
  /** Scale applied to the 8px Kenney frames so they fill a 32px world cell. */
  spriteScale: 4,
} as const;

export const MAP = {
  /** Map size in grid cells. */
  cols: 44,
  rows: 30,
  /** Fraction of interior cells turned into obstacle clusters (0..1). */
  obstacleDensity: 0.06,
} as const;

export const COLORS = {
  void: 0x07060a,
  blood: 0xb1122a,
  bloodDark: 0x5a0a16,
  bone: 0xe8e0d4,
  dawn: 0xf2b34a,
  ui: 0x1a1620,
  floor: 0x14121a,
  floorAlt: 0x100e16,
  wallTint: 0x6a6478,
} as const;

/** Asset keys + the Kenney Micro Roguelike spritesheet (8x8 tiles, 16 cols). */
export const ASSETS = {
  tilesheet: "tiles",
  tilesheetPath: "assets/tiles/colored_tilemap_packed.png",
  frame: 8,
} as const;

/**
 * Frame indices into the Kenney Micro Roguelike packed sheet (index = row*16 + col).
 * Tweak freely while play-testing — every visual is one number here.
 */
export const SPRITES = {
  vampire: 15,
  coffin: 62,
} as const;

export const BLOOD = {
  /** Starting & default max blood pool. */
  max: 100,
  /** Blood the player begins each run with. */
  start: 70,
  /** Constant thirst drain on night 1, in blood per second. */
  drainPerSecond: 2.5,
  /** Added to the drain rate each night — escalating thirst pressure. */
  drainPerNight: 0.2,
  /** Blood restored by a successful bite/feed. */
  biteRefill: 28,
} as const;

export const PLAYER = {
  /** Movement speed in pixels/second. */
  speed: 170,
  /** Claw attack damage dealt to prey. */
  clawDamage: 1,
  /** Claw reach in pixels from player center. */
  clawRange: 34,
  /** Cooldown between claw swings, ms. */
  clawCooldownMs: 320,
  /** How long the player is locked in place while biting, ms. */
  biteLockMs: 400,
  /** Max distance to a staggered enemy to land a bite, pixels. */
  biteRange: 30,
} as const;

export interface EnemyKind {
  frame: number;
  /** Wander speed, px/s. */
  speed: number;
  /** Speed when fleeing or chasing, px/s. */
  alertSpeed: number;
  /** Distance at which the enemy reacts to the player, px. */
  detectRange: number;
  maxHealth: number;
  /** How long an enemy lies staggered (biteable) before recovering, ms. */
  staggerMs: number;
  /** Hunters chase the player and deal contact damage; prey flee. */
  isHunter: boolean;
  /** Blood lost by the player per contact hit (hunters only). */
  contactDamage: number;
  /** Minimum ms between contact hits. */
  contactCooldownMs: number;
}

export const STEALTH = {
  /** A conscious villager within this distance of a feed witnesses it. */
  witnessRange: 155,
  /**
   * How long a hunter keeps pursuing the player's last-known spot after losing
   * sight before giving up. Break line of sight this long to escape.
   */
  loseSightMs: 2600,
  /** Chase speed of an enraged villager, px/s. */
  enragedSpeed: 132,
  /** Contact damage from an enraged villager. */
  enragedDamage: 8,
  /** Min ms between an enraged villager's contact hits. */
  enragedCooldownMs: 800,
} as const;

export const ENEMIES: Record<"villager" | "guard", EnemyKind> = {
  villager: {
    frame: 7,
    speed: 45,
    alertSpeed: 120,
    detectRange: 140,
    maxHealth: 1,
    staggerMs: 4500,
    isHunter: false,
    contactDamage: 0,
    contactCooldownMs: 0,
  },
  guard: {
    frame: 6,
    speed: 60,
    alertSpeed: 105,
    detectRange: 240,
    maxHealth: 2,
    staggerMs: 3000,
    isHunter: true,
    contactDamage: 12,
    contactCooldownMs: 700,
  },
};

export const DAWN = {
  /** Progress (0..1) at which the "dawn approaches" warning begins. */
  imminentThreshold: 0.82,
  /** How close (px) the player must be to the coffin to survive sunrise. */
  coffinRange: 52,
  /** Peak alpha of the brightening sky overlay as dawn breaks. */
  skyMaxAlpha: 0.22,
  /**
   * Blood fraction at/above which the vampire is "sated" and may retire to the
   * coffin early. Kept reachable despite the constant drain.
   */
  satedFraction: 0.85,
} as const;

export const ATMO = {
  /** Base darkness alpha outside the vampire's light. */
  darkness: 0.82,
  /** Radius (px) of full visibility around the vampire. */
  lightInner: 92,
  /** Radius (px) where the light has fully faded to darkness. */
  lightOuter: 290,
  /** Blood fraction below which the danger vignette appears. */
  lowBloodThreshold: 0.35,
  /** Peak alpha of the low-blood red vignette. */
  lowBloodMaxAlpha: 0.6,
  /** Max number of blood pools kept on the floor at once. */
  maxBloodPools: 60,
} as const;

export const DASH = {
  /** Velocity multiplier applied to the vampire's speed during a dash. */
  speedMult: 3.2,
  durationMs: 140,
  cooldownMs: 1100,
} as const;

/** Fraction of max blood the vampire begins each night with. */
export const START_BLOOD_FRACTION = 0.7;

export const NIGHT = {
  /** Real-time length of night 1, ms. Scales up each night. */
  baseDurationMs: 180_000,
  /** Extra duration added per night, ms. */
  durationPerNightMs: 30_000,
  /** Prey spawned on night 1. */
  basePrey: 8,
  /** Extra prey per night. */
  preyPerNight: 2,
  /** Guards spawned on night 1. */
  baseGuards: 1,
  /** Extra guards per night. */
  guardsPerNight: 1,
} as const;
