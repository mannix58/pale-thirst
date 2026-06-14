# Pale Thirst — Design

> The vision and scope for the playable prototype. Implementation status:
> the full night loop, combat, dawn/coffin objective, and between-night upgrade
> draft are all in place.

## Vision

A web-based, real-time action **roguelike where the player is the vampire**.
The signature verb is **feeding**; the signature pressure is **thirst**.

- **Subgenre:** real-time action roguelike
- **Fantasy:** you are the predator — hunt and feed to survive
- **Visuals:** tile sprites (Kenney "Micro Roguelike", CC0)
- **Run structure:** night-by-night — survive each night, reach your coffin
  before dawn
- **Scope:** a fun vertical slice, not a full game

## Core systems

### Blood — one unified resource
Health, thirst clock, and life force in a single bar. Drains constantly; damage
subtracts; a successful bite restores a large chunk; zero means death. Max blood
can grow via upgrades. (`systems/BloodSystem.ts`)

### Combat — bite-to-feed
Top-down, active. **Claw** (click / `Space`) wounds and *staggers* prey.
**Bite** (`E` / right-click) on a staggered enemy kills it and drains a deep
draught of blood, but locks the vampire in place briefly — feeding is a risk.
(`entities/Player.ts`, `entities/Enemy.ts`, attack orchestration in `GameScene`)

### The night & dawn
A dawn meter fills across the night (length scales each night). When the sun
breaks, the player must be at the **coffin** (far corner) or die to sunlight.
The sky brightens and a warning shows as dawn nears. (`systems/DawnSystem.ts`)

### Enemies
- **Villager (prey):** weak, flees, the staple food source.
- **Guard (hunter):** chases the player and deals contact damage.

Counts scale with the night number. (`config.ts: ENEMIES`, `NIGHT`)

### Between-night draft
Survive a night → choose one of three blood-powers (Bat Dash, Deeper Fangs,
Bloodgorged, Quick Claws). Choices persist for the rest of the run.
(`scenes/UpgradeScene.ts`, `systems/UpgradePool.ts`, `systems/RunState.ts`)

## Out of scope (for now)

Meta-progression between runs, full sound design, many enemy types / bosses,
items & inventory, mobile/touch controls, accounts/backend.

## Tech

Phaser 3 + Vite + TypeScript. All balance/feel constants live in `src/config.ts`.
