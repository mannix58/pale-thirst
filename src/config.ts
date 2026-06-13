/**
 * Tunable game-feel constants for Pale Thirst.
 * Keep all balance/feel numbers here so the core loop can be iterated quickly.
 */

export const VIEW = {
  width: 1280,
  height: 720,
  /** Logical pixel size of one map tile (Kenney tiles are 16px, scaled up). */
  tileSize: 16,
  /** Render scale applied to tiles/sprites for a chunky pixel look. */
  scale: 3,
} as const;

export const COLORS = {
  void: 0x07060a,
  blood: 0xb1122a,
  bloodDark: 0x5a0a16,
  bone: 0xe8e0d4,
  dawn: 0xf2b34a,
  ui: 0x1a1620,
} as const;

export const BLOOD = {
  /** Starting & default max blood pool. */
  max: 100,
  /** Blood the player begins each run with. */
  start: 70,
  /** Constant thirst drain, in blood per second. */
  drainPerSecond: 2.5,
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
