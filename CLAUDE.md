# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rune-story** is a self-contained, single-file browser RPG called **AstralBound** — a pixel-art 2D platformer set in the world of Aethoria. The entire game lives in `index.html` (~1,200 lines). There is no build system, no package manager, no external dependencies, and no configuration files.

## Running the Game

Open `index.html` directly in any modern browser. No server required.

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Or serve locally if needed
python3 -m http.server 8080
```

There are no automated tests, no linting tools, and no CI pipeline. Verification is manual — open the game in a browser and play through the relevant systems.

## Architecture

The file is one HTML document with all CSS, JavaScript, game data, rendering, and audio inline. Code is organized into logical sections by line range:

| Section | Lines | Responsibility |
|---|---|---|
| Audio Engine | ~216–318 | Procedural music and SFX via Web Audio API (no audio files) |
| Cutscene System | ~320–853 | Narrative scenes rendered to Canvas 2D |
| Sprite System | ~855–881 | Pixel sprites generated at runtime (no image assets) |
| Game Engine | ~883–1220 | State, physics, combat, quests, skills, main loop |

### Global State

All mutable game state lives in a single `G` object defined in the Game Engine section. Player stats, inventory, active quest progress, zone index, and runtime flags are all properties of `G`.

### Persistence

Progress is saved to `localStorage` under the key `astralbound_save_v1` (`saveGame()` / `loadSave()` / `applySave()` in the Game Engine section). Saves happen automatically every 10 seconds during play, on major events (kills, quest accept/turn-in, purchases, skill unlocks, item use, zone travel), and when the tab is hidden or closed. The save snapshots `G` (minus transient combat flags like the active shield), the `USK` skill set, `bossTimers`, and volume slider values. The payload carries a `v` field: v1 saves (pre-city-hub) are migrated on load — zone indices and boss timers shift by 1 and legacy gear id strings convert to gear objects. On boot, an existing save skips the intro cutscene and shows a "Continue" button on the character screen; starting a new game over an existing save requires a second confirming click (no native `confirm()`, which can be blocked in sandboxed embeds). New persistent fields must be added to all three of `saveGame()`, `applySave()`, and the `G` initializer.

### Input

Keyboard input drives the `keys` (held) and `jp` (just-pressed, cleared every frame) maps. Touch controls reuse the same maps: on-screen left/right/jump buttons (plus a contextual Talk button near NPCs) are overlaid on the canvas and enabled automatically on coarse-pointer devices or on first `touchstart`. Tapping the canvas casts at the nearest monster / talks to NPCs via the existing click handler.

### Zone Data

Static zone definitions live in `ZD` (an array of 5 objects). Zone 0 is **Aethon City**, a safe hub with no monsters where every NPC (quest givers and shops) lives; zones 1–4 are combat zones with no NPCs. Each zone contains platform geometry, monster spawn data, NPC placement, and edge portals (`portals`). Zones are accessed by index; transitions happen via the map modal or by walking into a portal and pressing F (or the touch Talk button). Zone level locks come from each zone's `req` field — no hardcoded index checks.

### Game Loop

The main loop uses `requestAnimationFrame`. Each frame calls:
1. `tick(dt)` — updates physics, AI, cooldowns, combat, input
2. `draw()` — renders background layers, entities, and UI to canvas

### Rendering

Everything is procedural Canvas 2D. Backgrounds use multi-layer parallax (depths 0.2–0.9). Sprites are generated into off-screen canvases at startup and indexed for animation frames. No image files are ever loaded.

### Audio

All sound is synthesized via Web Audio API oscillators and noise. Zone music is generated algorithmically per-zone. SFX (spells, hits, levelup, death, crits) are short procedural bursts. No audio files exist.

## Key Constants

```js
GRAV = 900      // Gravity (px/s²)
JUMP = -390     // Jump velocity
SPD  = 175      // Horizontal speed cap
```

Combat damage includes ±random variance. Skill `Arcane Mastery` adds +20% spell damage; crits deal 2× with 20% chance when `Arcane Surge` is unlocked.

XP to next level scales as `xpNext *= 1.4` per level. Each level grants +20 HP, +10 MP, and 1 skill point.

## Content Reference

- **Zones**: Aethon City (hub, safe), Village Outskirts (Lv.1+), Verdant Forest (Lv.5+), Crystal Caverns (Lv.10+), Ancient Ruins (Lv.15+)
- **Monsters**: Slime, Goblin, Bat, Golem, Skeleton Archer, Shadow Wraith. Spawns roll a 10% Elite chance (`mkMon`): ★-prefixed, 3× HP, 1.5× damage, 2.5× XP, 3× gold, golden glow, drawn larger, guaranteed rare+ gear drop. Dying drops 10% of carried gold. Boss respawn countdown is drawn top-right of the canvas in boss zones.
- **Spells**: Arcane Bolt, Mana Shield (base); Fireball, Ice Shard (skill unlocks)
- **Skills**: Arcane Mastery → Fireball → Arcane Surge / Pyromancy; Mana Flow → Ice Shard → Deep Frost; Mana Flow → Greater Ward; Vitality and Gold Sense (passives)
- **Equipment**: procedural gear drops (`rollGear`) with 5 rarity tiers (`RARS`); weapons add flat magic damage (`eqMag`), armor adds defense (`eqDef`) and max HP. 8% drop chance per kill, guaranteed rare+ from bosses. Quest-reward gear ids convert to gear objects via `GEAR_FIXED`. Click bag items to equip, equipped slots to unequip.
- **NPCs**: Elder Mira, Guard Tomlin, Ranger Sylva, Sage Oriax (quest givers); Forgemaster Bren (gear upgrades: gold + monster materials per `UPG` tier table, `upgradeGear()` rescales stats by rarity multiplier); Bounty Board (repeatable hunts: `genBounty()` scales target/reward to player level, progress tracked on `G.bounty`, pays gold + XP + a gear roll, re-offers immediately)
- **Quests**: 6 quests forming a sequential story chain (the Hollow Rift arc — each `prev` field gates on the prior quest). Each quest object carries narrative fields: `txt` (offer), `done` (turn-in reveal), `after` (post-completion), `lock` (shown while the previous quest is unfinished); `{name}` in any of them substitutes the player name via `qtxt()`. The arc explains the Fallen Oracle boss: Oracle Veyra, corrupted in the Shattering, is becoming a gateway for the rift. Shop NPCs carry a `lore` line shown atop their shop dialog.

## Development Conventions

- All additions go directly into `index.html` — do not split into separate files.
- Follow the existing section structure; new systems belong in the section that owns their domain (e.g., new audio in the Audio Engine section).
- New game content (monsters, items, spells, quests) is defined as data objects/arrays near their existing counterparts, not scattered inline.
- Canvas draw calls use `ctx.save()` / `ctx.restore()` around any state changes (transforms, compositing).
- All new properties added to `G` should have an initial value set where `G` is first defined, not lazily.
