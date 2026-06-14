import type { RunState } from "./RunState.ts";

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  /** Only offered if this returns true (e.g. don't offer Bat Dash twice). */
  available: (run: RunState) => boolean;
  apply: (run: RunState) => void;
}

export const UPGRADES: Upgrade[] = [
  {
    id: "bat-dash",
    name: "Bat Dash",
    description: "Hold SHIFT to blink forward — escape after a bite.",
    available: (run) => !run.hasDash,
    apply: (run) => {
      run.hasDash = true;
    },
  },
  {
    id: "deeper-fangs",
    name: "Deeper Fangs",
    description: "Each bite drains far more blood (+14).",
    available: () => true,
    apply: (run) => {
      run.biteRefill += 14;
    },
  },
  {
    id: "bloodgorged",
    name: "Bloodgorged",
    description: "Raise your maximum blood pool (+40).",
    available: () => true,
    apply: (run) => {
      run.maxBlood += 40;
    },
  },
  {
    id: "quick-claws",
    name: "Quick Claws",
    description: "Claw faster and recover from bites sooner.",
    available: (run) => run.clawCooldownMs > 140,
    apply: (run) => {
      run.clawCooldownMs = Math.max(140, Math.round(run.clawCooldownMs * 0.78));
      run.biteLockMs = Math.max(180, Math.round(run.biteLockMs * 0.82));
    },
  },
];

/** Draw up to `count` distinct available upgrades for the draft. */
export function drawUpgrades(
  run: RunState,
  rng: Phaser.Math.RandomDataGenerator,
  count: number
): Upgrade[] {
  const pool = UPGRADES.filter((u) => u.available(run));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.between(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
