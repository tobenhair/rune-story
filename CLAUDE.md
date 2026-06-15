# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rune-story** is a self-contained, single-file browser RPG called **AstralBound** — a pixel-art 2D platformer set in the world of Aethoria. The entire game lives in `index.html` (~1,900 lines). There is no build system, no package manager, no external dependencies, and no configuration files.

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

## Testing & CI

The game logic is covered by a **Playwright** suite in `tests/` that loads `index.html` in headless Chromium and drives the real game functions/state via `page.evaluate` (the RAF loop is cancelled so time is stepped deterministically). A shared fixture (`tests/fixtures.js`) boots the game and exposes in-page helpers (`window.T`: `withRandom`, `clear`, `resetPlayer`, `mon`). Specs are organized by domain: `boot`, `zones`, `monsters` (+ affixes), `combat`, `skills`, `gear` (+ forge), `quests`, `economy`, `bosses` (+ enrage), `movement` (dash/i-frames).

```bash
npm install                                  # installs @playwright/test
npx playwright install --with-deps chromium  # one-time browser download
npm test                                     # runs the suite (playwright test)
```

CI runs the suite on every pull request and on pushes to `main` via `.github/workflows/tests.yml`. **When adding or changing game content/systems, add or update the matching spec** so the suite stays a complete content inventory. Linting is still not used; the game itself remains a single inline `index.html`. Beyond the automated suite, final feel-checks (animation, audio, difficulty) are still worth doing by opening the game in a browser.

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

Keyboard input drives the `keys` (held) and `jp` (just-pressed, cleared every frame) maps. Touch controls reuse the same maps: on-screen left/right/jump buttons (plus a contextual Talk button near NPCs and a Dash button) are overlaid on the canvas and enabled automatically on coarse-pointer devices or on first `touchstart`. Tapping the canvas casts at the nearest monster / talks to NPCs via the existing click handler.

**Dash:** **Shift** (or the touch `tb-dash` button → `jp['dash']`) triggers a dodge dash — a short horizontal burst (`DASH_SPD`/`DASH_TIME`) with invulnerability frames (`DASH_IFRAME`, applied via `PL.inv`) and a cooldown (`DASH_CD`). Dash state lives on `PL` (`dashT`/`dashCd`/`dashDir`/`trail`); the `trail` array drives fading afterimages drawn just before the player sprite. Dash fields are reset on `respawn()` and `loadZone()`. Because i-frames raise `PL.inv`, dashing passes through both melee contact and hostile projectiles (all gated on `PL.inv<=0`).

Spells are bound to **Q W E R**. Consumables use a two-slot **potion hotbar** bound to **T** and **Y** (`G.hotbar` holds the assigned item ids): click a slot's icon (or press its key) to use the assigned potion, click the slot's label to open the assign/clear picker (`openHotbarAssign`/`assignHotbar`). Newly acquired consumables auto-bind to the first empty slot via `autofillHotbar()` (called from `addItem` and storage withdrawal). `renderHotbar()` keeps the icons and quantity badges in sync and is called from `renderIP`/`renderAll`. The hotbar persists in saves like other `G` fields.

### Zone Data

Static zone definitions live in `ZD` (an array of 7 objects). Zone 0 is **Aethon City**, a safe hub with no monsters where every NPC (quest givers and shops) lives; zones 1–4 are combat zones with no NPCs. Zone 5 is **The Hollow Rift**, the hidden final-boss arena: it has no regular monsters and is unreachable from the map modal (`buildMap` only lists `ZD.slice(0,5)`) — the only way in is the teleport fired when the final quest (`tp:5`) is accepted, or the "Return to the Hollow Rift" button shown while that quest is active; the only way out is its edge portal back to the hub. Zone 6 is **The Endless Rift**, the endgame wave-survival arena (`RIFT_ZONE`) — also off the map, entered only via the Riftwarden's gate and left via its edge portal (see The Endless Rift below). Each zone contains platform geometry, monster spawn data, NPC placement, and edge portals (`portals`). Zones are accessed by index; transitions happen via the map modal or by walking into a portal and pressing F (or the touch Talk button). Zone level locks come from each zone's `req` field — no hardcoded index checks.

### The Endless Rift

The post-story endgame: an infinitely scaling wave-survival mode (the flagship retention feature). All state lives on a transient global `RIFT` object plus two persistent `G` fields (`riftBest`, `riftShards`). Players talk to **Riftwarden Kael** (a `rift:true` NPC in the hub; `openDlg` routes to `openRift`) — gated by `riftUnlocked()` (final boss killed or `q15` done) — and choose a starting **depth**. `startRift(d)` loads the arena (`RIFT_ZONE`), and `updateRift(dt)` (called at the end of `update`) drives the loop: each **depth** is a set of waves (`riftWaveCount`) of depth-scaled monsters (`mkRiftMon` ramps HP/damage/xp by depth and active modifiers; `spawnRiftWave`), with a boss **Echo** (`spawnRiftBoss`, a depth-scaled reuse of a `BOSS_DEFS` entry) every 5th depth. Clearing a depth (`depthCleared`) banks **Rift Shards**, updates `riftBest` (with a new-record bonus), and opens a **curse draft** (`openRiftDraft`/`pickRiftMod`): one of three `RIFT_MODS` that ramp danger for a cumulative `shardMul`. Death in the rift routes through `respawn` → sets `RIFT.ending` → `endRift(false)` next frame (banked shards are kept); walking the edge portal calls `endRift(true)` (`enterPortal` intercepts). Shards are spent at the Riftwarden on `RIFT_SHOP` caches (`buyRift`). The rift HUD (depth/wave/banked/mods panel + transition banner) draws at the end of `draw()`. `saveGame` records the hub zone (never `RIFT_ZONE`) while a run is active, and `applySave` redirects a stray `RIFT_ZONE` to the hub.

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

- **Zones**: Aethon City (hub, safe), Village Outskirts (Lv.1+), Verdant Forest (Lv.5+), Crystal Caverns (Lv.10+), Ancient Ruins (Lv.15+), The Hollow Rift (Lv.25+, final-boss arena — teleport-only, not on the map), and The Endless Rift (endgame wave-survival arena — Riftwarden-only, not on the map)
- **The Endless Rift**: post-story infinite endgame (`RIFT`/`RIFT_MODS`/`RIFT_SHOP`, zone `RIFT_ZONE`). Depth-scaled waves, boss Echoes every 5th depth, a one-of-three curse draft between depths, **Rift Shards** currency banked per cleared depth (kept on death), and shard-bought caches from **Riftwarden Kael**. See the Architecture › The Endless Rift section.
- **Monsters**: Slime, Goblin, Bat, Golem, Skeleton Archer, Shadow Wraith. Spawns roll a 10% Elite chance (`mkMon`): ★-prefixed, 3× HP, 1.5× damage, 2.5× XP, 3× gold, golden glow, drawn larger. Gear drops are 1% per kill for normal **and** elite kills (elites get boosted rare+ rarity when they do drop — they are no longer a guaranteed drop); see Equipment. Dying drops 10% of carried gold. Boss respawn countdown is drawn top-right of the canvas in boss zones. **Elite affixes** (`AFFIXES`, rolled in `mkMon`, stored on `m.affix`/`m.affixC`): `frenzied` (×1.5 move + faster attacks/ranged), `vampiric` (heals 50% of melee damage dealt), `explosive` (AoE detonation on death, handled in `killM`), `armored` (takes 40% less spell damage). The affix name is prepended to the monster name and tints its glow/label. **Boss enrage** (`enrageMul`, `ENRAGE_AFTER`/`ENRAGE_RATE`/`ENRAGE_MAX`): each boss accumulates `m.fightT` in `updateBossAbilities`; past the threshold its damage ramps over time (capped at `ENRAGE_MAX`), applied to every boss ability projectile and to boss melee. Onset sets `m.enraged` (one-time banner + 🔥 marker + red aura) to punish endless kiting. Each combat zone's signature monster also has a **1% rare-relic drop** in its `loot` table (Slime→`rift_seed`, Bat→`wither_heart`, Golem→`resonant_core`, Skeleton→`rift_sigil`) — these are the targets of the per-zone rare-hunt quests.
- **Spells**: Arcane Bolt, Mana Shield (base); Fireball, Ice Shard (skill unlocks)
- **Skills**: Arcane Mastery → Fireball → Arcane Surge / Pyromancy; Mana Flow → Ice Shard → Deep Frost; Mana Flow → Greater Ward; Vitality and Gold Sense (passives)
- **Equipment**: procedural gear drops (`rollGear`) with 6 rarity tiers (`RARS`): Common→Legendary plus **Artifact** (tier 5). Weapons add flat magic damage (`eqMag`), armor adds defense (`eqDef`) and max HP. **1% drop chance per kill** (normal and elite alike; `rollGear(G.zone,m.elite)` in `killM` — elite kills roll boosted rare+ rarity), guaranteed rare+ from bosses (the final boss `hollow_oracle` also drops a guaranteed Artifact). Looting or forging a Legendary triggers `celebrateLegendary()`: a swirling gold particle column + fireworks around the player, a banner, and a synthesized trumpet fanfare (`sfxFanfare`). Quest-reward gear ids convert to gear objects via `GEAR_FIXED`. Click bag items to equip, equipped slots to unequip.
- **Artifacts**: a fixed pool (`ARTIFACTS`) of unique boss-only items (1% drop per boss kill, rolled in `killM` in addition to the guaranteed rare+). Each carries a special `pow` whose effect is applied at runtime via `hasPow(id)` and described in `POW`: `lifesteal` (heal 15% of spell damage), `haste` (`spellCd()` cuts cooldowns 30%), `manaregen` (+8 MP/s), `thorns` (reflect 40% of melee damage). `gearStats` appends the power text. Looting one triggers `celebrateArtifact()` — the crimson variant of the celebration (`celebrateDrop(g,'art')`, `ART_COLS`, `sfxArtifact()`). Artifacts can't be forged further (`canUpg` caps at rar≥4) and persist as normal gear objects in saves.
- **NPCs**: Elder Mira, Guard Tomlin, Ranger Sylva, Sage Oriax, Scholar Aldric, Seer Vesper (quest givers — each may hold several quests across the story; `npcQuest()` resolves a giver's current quest by matching `quest.giver` to the NPC name, preferring active > newly available > still-locked > last completed, so the `q` field on NPC data is only a marker, not a single fixed quest); Forgemaster Bren (gear upgrades: gold + monster materials per `UPG` tier table, `upgradeGear()` rescales stats by rarity multiplier); Bounty Board (repeatable hunts: `genBounty()` scales target/reward to player level — `n = (8–12) × 5` kills, XP = the base formula × 2, progress tracked on `G.bounty`, pays gold + XP + a gear roll, re-offers immediately); Storage Chest (a treasure-chest sprite NPC in the hub: deposit/withdraw items between bag and `G.storage`, base 10 slots, expandable in 10-slot blocks via `expandStorage()` at a doubling cost — `storageCost()` = 2000g × 2^expansions; when the 16-slot bag is full, `addItem` auto-routes the new item into storage via `bagAdd`, and only loses it if storage is full too)
- **Quests**: 15 quests forming one continuous sequential story chain (the Hollow Rift arc — each `prev` field gates on the prior quest). The chain is ordered **zone-by-zone** (all of Zone 1, then Zone 2, …, then the finale); within each zone the order is story quest → rift-relic hunt → boss kill, so low-level/low-zone quests always come before higher-zone ones. The `QUESTS` array order matches the chain order, but the `prev` links — not array position — define the gating (ids stay stable, e.g. `q7`/`q8` are Zone 1 even though numbered after the `q3`–`q6` story quests). Story beats (the Veyra reveal, the Shattering, sealing the door) are woven into the per-zone quests rather than front-loaded. For **each combat zone** there is a rare-hunt quest (collect that zone's 1% relic) and a boss-kill quest (`type:'kill'` against the zone's boss `t`, e.g. `slime_sov` — boss kills are recorded in `G.kills` by `killM` just like normal monsters). The six regular-monster kill quests demand **5× kills for 2× XP**. q15 ("Into the Hollow Rift", Seer Vesper, `rlvl:25`) is the finale: accepting it (`tp:5`) teleports the player into the Hollow Rift to fight `hollow_oracle`, an enlarged/recolored reuse of the Fallen Oracle (`scale` field → `m.bscale`, used by the boss draw + spawn). The finale is a *soft* gate — `rlvl:25` plus brutal tuning; q14 hands out a guaranteed Legendary (`oracle_staff`) so the player realistically has the Legendary the lore demands. Each quest object carries narrative fields: `txt` (offer), `done` (turn-in reveal), `after` (post-completion), `lock` (shown while the previous quest is unfinished **or** while the level requirement is unmet); `{name}` in any of them substitutes the player name via `qtxt()`. Tasks are `{type:'kill',tgt,n}` or `{type:'col',item,n}`; `qProg`/`monName` render kill targets by display name, and `col` progress lines append the dropping monster via `itemSource()` (e.g. "Pulsing Rift Seed (drops from Slime): 0/1") so the quest tab tells you where to hunt. Shop NPCs carry a `lore` line shown atop their shop dialog.

## Development Conventions

- All additions go directly into `index.html` — do not split into separate files.
- Follow the existing section structure; new systems belong in the section that owns their domain (e.g., new audio in the Audio Engine section).
- New game content (monsters, items, spells, quests) is defined as data objects/arrays near their existing counterparts, not scattered inline.
- Canvas draw calls use `ctx.save()` / `ctx.restore()` around any state changes (transforms, compositing).
- All new properties added to `G` should have an initial value set where `G` is first defined, not lazily.
