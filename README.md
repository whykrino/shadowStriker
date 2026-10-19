# Shadow Striker

A 2D ninja slasher built with pure JS and Canvas. No engines, bundlers, or dependencies.

---

## What is this and why

A small browser game in the top-down slasher genre.

I'm building this as a personal project to level up my procedural graphics and sound skills using raw Canvas without any game engines. The goal is to create a complete, polished little slasher that runs anywhere without installation.

---

## What's inside

- Top-down combat: attack arc, backstab, charged attack, whirlwind
- Block with charges and a dashing mechanic with recovery
- Talents, level-based abilities, and progression
- 12 monster archetypes and bosses every 10 levels
- Procedural world with zones, ruins, trees, and rocks
- Minimap, codex, notifications, talent and audio menus
- Music and sounds are generated via Web Audio directly in the browser

---

## Tech stack

- Pure JavaScript, no TypeScript or modules
- Canvas 2D for graphics
- Web Audio API and OfflineAudioContext for sound
- Scripts are connected via standard `<script src>` in `index.html`
- Classes are global, living in `window`
- Runs via `file://` without a server

---

## Project structure

~~~text
shooter/
├── index.html
├── css/
│   ├── main.css - HUD, hints, notifications, vignette, gameover
│   └── menus.css - talents, sound, codex, monster details
├── docs/ROADMAP.md
└── src/
    ├── core/
    │   ├── utils.js - clamp, lerp, angleLerp, rand, randInt, hash, dist2
    │   ├── input.js - keyboard, mouse, click buffer, consumeDash, consumeRightClick
    │   ├── particles.js - particle pool (240), burst()
    │   ├── audio.js - Web Audio, samples via OfflineAudioContext, music, block sounds
    │   └── pools.js - ObjectPool, BulletPool, DamageNumberPool, LootPool
    ├── systems/
    │   ├── notifications.js - top-right popups
    │   ├── abilities.js - level-based abilities
    │   ├── player_stats.js - level (starts at 0), exp, str/agi/int/vit
    │   ├── talents.js - talent tree, 20 nodes, 4 branches
    │   ├── skeleton.js - Bone + Skeleton (unused, can be deleted)
    │   ├── codex.js - codex data
    │   └── dev_instruments.js - cheat menu (CheatMenu class)
    ├── world/
    │   ├── world.js - 84x36 tile map, texture, collisions, zones with segmented glow
    │   ├── zones.js - 3 zones: 1 safe, 1 mid, 1 hard
    │   └── minimap.js - minimap with dots, zones, and rotation
    ├── entities/
    │   ├── monster_archetypes.js - 12 monster archetypes
    │   ├── monster.js - monster logic
    │   └── player.js - player, animations, block, charge, whirlwind
    ├── ui/
    │   ├── hud.js - HP/EXP bars, dash indicator, talent menu, sound menu
    │   └── codex_ui.js - codex UI
    └── main.js - Game class, loop, camera, collisions, damage
~~~

---

## How to run

### GitHub Pages

The link is in the repository, in the `about` section.

### Locally

Download the source code, open `index.html`.

---

## Status

Playable prototype. Core gameplay, progression, monsters, world, sound, and UI are in place. Continuing with balance and content.