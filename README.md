# Pale Thirst

A web-based, real-time action **roguelike where you are the vampire**. Hunt the
living, feed to survive, and reach your coffin before the sun rises. Each night
you live through, you grow more powerful — but the nights only get deadlier.

Built with [Phaser 3](https://phaser.io/), [Vite](https://vitejs.dev/), and
TypeScript.

## The loop

- **Blood** is everything — it is your health, your thirst, and your life clock.
  It drains constantly. Let it hit zero and you desiccate.
- **Hunt prey.** Villagers flee from you. **Claw** to wound and stagger them,
  then **bite** a staggered victim to drain a deep draught of blood. The bite
  locks you in place for a moment — feeding leaves you exposed.
- **Beware guards.** They hunt *you* and draw blood on contact.
- **Survive until dawn.** A dawn meter fills across the night. When the sun
  breaks you must be at your **coffin** (far corner of the map) — caught in the
  open, sunlight destroys you.
- **Grow.** Survive a night and draft one of three blood-powers, then face a
  longer, deadlier night.

## Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or Arrow keys |
| Claw (wound / stagger) | Left-click or `Space` |
| Bite (feed on staggered prey) | Right-click or `E` |
| Bat Dash (after the upgrade) | `Shift` |
| Mute / unmute | `M` |
| Rise again (on death) | `R` |

## Run it

```bash
npm install
npm run dev      # dev server at http://localhost:5180
npm run build    # type-check + production bundle into dist/
npm run preview  # serve the production build
```

## Project layout

```
src/
  main.ts            Phaser game config + scene registration
  config.ts          All tunable balance/feel constants
  scenes/            Boot, Game (the night), Upgrade (draft), GameOver
  entities/          Player (the vampire), Enemy (prey + guards)
  systems/           Blood, Dawn, MapGenerator, RunState, UpgradePool
  ui/                Hud (blood bar, dawn meter, night counter)
```

Game-feel is concentrated in `src/config.ts` — drain rate, bite refill, speeds,
night length, enemy stats, and tile/sprite indices all live there.

## Credits

Art: [Kenney](https://kenney.nl/) "Micro Roguelike" tiles, released under
[CC0](http://creativecommons.org/publicdomain/zero/1.0/) (public domain).
