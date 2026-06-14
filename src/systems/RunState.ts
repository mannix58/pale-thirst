import { BLOOD, PLAYER } from "../config.ts";

/**
 * Everything that persists across the nights of a single run. Upgrades drafted
 * between nights mutate this; GameScene reads it to configure each night. Stored
 * in the Phaser registry under `RUN_KEY` so it survives scene restarts.
 */
export interface RunState {
  night: number;
  maxBlood: number;
  biteRefill: number;
  clawCooldownMs: number;
  biteLockMs: number;
  hasDash: boolean;
  /** Ids of upgrades already taken (kept out of future draws). */
  taken: string[];
}

export const RUN_KEY = "run";

export function defaultRunState(): RunState {
  return {
    night: 1,
    maxBlood: BLOOD.max,
    biteRefill: BLOOD.biteRefill,
    clawCooldownMs: PLAYER.clawCooldownMs,
    biteLockMs: PLAYER.biteLockMs,
    hasDash: false,
    taken: [],
  };
}

export function loadRun(registry: Phaser.Data.DataManager): RunState {
  let run = registry.get(RUN_KEY) as RunState | undefined;
  if (!run) {
    run = defaultRunState();
    registry.set(RUN_KEY, run);
  }
  return run;
}

export function saveRun(registry: Phaser.Data.DataManager, run: RunState): void {
  registry.set(RUN_KEY, run);
}

export function resetRun(registry: Phaser.Data.DataManager): void {
  registry.set(RUN_KEY, defaultRunState());
}
