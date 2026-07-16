# AstralBound — Graphics & Experience Overhaul

> A complete art-direction and implementation plan for taking AstralBound's visuals from
> "charming procedural prototype" to "deliberate, atmospheric pixel-art game" — while keeping
> every constraint that makes this project what it is: **one `index.html`, zero image/audio
> assets, everything procedural, everything testable**.
>
> Written as a design document first and an engineering plan second. Every proposal names the
> exact functions/sections it touches so any slice of it can be picked up independently.

---

## 1. Vision & Art-Direction Pillars

AstralBound already has a voice: a lone mage in a broken world, neon arcana against deep
darkness, cities that grow as you invest in them. The overhaul does not replace that voice —
it commits to it. Four pillars govern every decision below:

1. **Darkness is the canvas, light is the story.** Every zone is fundamentally dark; every
   point of light (spells, windows, lava veins, auroras, the player's own aura) is meaningful.
   The existing `drawLighting()` pass is the germ of this — we make light the primary
   read of the whole game.
2. **Silhouette first.** Every character, monster, and prop must be identifiable in pure
   black. If two NPCs share an outline, one of them needs a new outline. (Today, 15 hub NPCs
   share 4 humanoid sheets — three identical "Sages" can stand on one screen.)
3. **Everything alive moves; everything that moves tells you something.** Idle characters
   breathe, monsters telegraph before they strike, deaths are events rather than deletions.
   Animation is communication, not decoration.
4. **The world reacts to you.** Footsteps kick dust, grass parts, spells scorch the air,
   platforms belong to the terrain they sit in. The player should feel *in* the zone, not
   *in front of* it.

**Hard constraints honored throughout:** single inline file; no external requests (a strict
no-asset policy — any font/texture must be procedural or inline); gameplay math untouched
(`SW`/`SH`/`SCALE` footprints, hitboxes, `bScale` multipliers stay exactly as they are —
everything here is cosmetic); the Playwright `render` spec must keep passing, and each phase
adds specs so the suite remains a complete content inventory.

---

## 2. Visual Audit — Where We Are Today

An honest read of the current build (references are to `index.html`):

### What already works
- **Hi-res sprite grid** — sprites author at 32×48 (`SS=2`, line ~908) with shading helpers
  (`vg`, `orc`, `band`, `glow`, `fx`). The player mage (`drawMage`) has a cape flutter, hat
  glow, and a casting variant. This is a solid foundation.
- **Multi-layer parallax backgrounds** — each zone has a bespoke BG function
  (`drawCityBG` … `drawGlacierBG`) with 3–4 depth layers, animated skies (aurora ribbons,
  smouldering sun, drifting smoke). Genuinely good.
- **Polish layers exist** — `drawProps()` (ground decorations), `drawForeground()` (fog +
  ambient particles + silhouette band), `drawLighting()` (colour grade + player aura +
  per-projectile light + vignette). The *architecture* for atmosphere is in place.
- **Celebration moments** — Legendary/Artifact drops get particle columns, banners, fanfares.
- **Game-feel primitives** — screen shake, hit flash, damage numbers (`spawnDN`), particle
  bursts (`burst`, `burstRing`), dash afterimages (`PL.trail`).

### What holds the experience back

| # | Problem | Evidence | Player impact |
|---|---------|----------|---------------|
| A1 | **NPC identity collapse** | 15 named hub NPCs share 4 sheets (`elder`/`guard`/`ranger`/`sage`). Seer Vesper, Sage Oriax, Riftwarden Kael, and Astralwright Nyx are literally the same sprite. | The hub — the game's home — reads as copy-paste. Named characters with hours of dialogue have no visual identity. |
| A2 | **Platforms are floating slabs** | `draw()` renders `plats` as flat colored rects + 2px highlight/shadow (line ~3121). Zone identity comes only from the rect's hex color. | The single most-viewed surface in the game looks like a debug build. Screenshot-level quality is capped here. |
| A3 | **One animation strip per entity** | `mkSheet` bakes a single loop per monster; the player's 8-frame walk cycle is reused for idle, jump, fall, and land. No death, spawn, attack, or hurt animations exist anywhere. | Monsters vanish on death (`killM` just filters the array + particle burst). Combat reads as UI events, not physical ones. |
| A4 | **Attack telegraphs are invisible** | Boss/monster attacks spawn projectiles instantly from `updateBossAbilities` / monster AI with no wind-up pose or flash. | Difficulty feels arbitrary; dodging is reactive to projectiles already in flight, never to the monster's body language. |
| A5 | **Projectiles are static dots** | 8–10px single-frame canvases scaled ×3 (`drawBolt`/`drawFireball`/`drawIce` etc., baked once in `buildSheets`). No rotation, pulse, or trail (only the lighting glow). | Spells — the core verb of the game — are the least animated thing in it. |
| A6 | **UI is generic browser chrome** | System `sans-serif` at 8–12px everywhere: canvas labels, HUD, side panel, dialogs (CSS head section; `ctx2.font='9px sans-serif'` throughout `draw()`). | The frame around the pixel-art world constantly breaks the fiction. Small-text readability is poor. |
| A7 | **Three arenas share one backdrop** | Hollow Rift, Endless Rift, *and* the Riftheart all fall through to `drawRiftBG()` (line ~2448). | The true-final raid — the game's climax — looks like the mid-game arena. |
| A8 | **No entrances or exits** | Monsters pop into existence (`mkMon` push), the player teleports between zones with a hard cut, respawn is instant. | Transitions feel like state changes, not travel. |

Everything below is organized as six workstreams (A–F) that map onto these findings,
followed by a phased roadmap.

---

## 3. Workstream A — Environments: Ten Zones, Ten Places

**Goal:** every zone passes the "muted screenshot test" — shown any frame with the HUD
hidden, a player can name the zone instantly from terrain, palette, weather, and landmarks.

### A.1 Platform terrain skinning (highest-leverage change in the whole plan)

Replace the flat rect rendering in `draw()` with a themed platform renderer:

```
drawPlat(p, theme)   // called from draw() in place of the fillRect block
```

Rendering is procedural and deterministic (seeded by `p.x` like `drawProps` already does with
`Math.sin(wx*12.9898)`), so no state is added and the render spec stays deterministic. Each
theme defines: a top **surface strip** (grass/snow/moss/ash), a **body fill** (dirt strata,
brick courses, ice with cracks), an **edge treatment** (overhanging grass tufts, dripping
icicles, broken masonry corners), and optional **accents** (glowing crystal seams, ember
cracks, rune etchings) at low density.

| Zone | Surface | Body | Edge/accents |
|------|---------|------|--------------|
| Aethon City | paved stone + lamplit rim | brick courses, mortar lines | banner poles at ends; lamplight pools on surface |
| Village Outskirts | grass tufts, dandelions | packed earth strata + stones | grass overhang, occasional fence post stub |
| Verdant Forest | moss + mushrooms | root-woven earth | vines dangling from underside, fireflies near edges |
| Crystal Caverns | crystalline crust | dark stone + amethyst veins | glowing crystal clusters on underside (light source) |
| Ancient Ruins | cracked tiles + runes | carved block masonry | broken edges, faint rune glow that brightens as player nears |
| Hollow Rift / Endless Rift | obsidian glass | void-cracked stone | floating rubble fragments orbiting large platforms |
| Emberfall Wastes | scorched crust | basalt columns + lava veins | ember drips, heat shimmer above surface |
| Frostveil Glacier | fresh snow (deforms — see A.4) | blue ice with trapped bubbles | icicles, refracted sparkle |
| Ashen Sanctum | fused ash tiles | kiln-brick + fire cracks | smoldering seams |
| The Riftheart | pulsing flesh-stone | void marble + gold idol inlay | slow "heartbeat" luminance pulse synced across all platforms |

Implementation notes: keep the existing `p.c` colors as the body base so `ZD` data doesn't
change; cache each platform's skin to an offscreen canvas on `loadZone()` (keyed by
`zone:x:w`) so per-frame cost is one `drawImage` per platform, cheaper than the current
three fillRects only slightly more expensive in memory. Animated accents (ember drips,
rune glow) draw as a thin dynamic pass over the cached base.

### A.2 A real backdrop for The Riftheart (fix A7)

New `drawRiftheartBG()`: the inside of a dead god's chamber. Concentric ribs of void-marble
vanishing toward a distant glowing core; slow-orbiting stone shards (parallax 0.3/0.5);
a gold "third eye" motif faintly visible behind the idol's arena position that opens as the
fight progresses (readable from `mons` — if the `hollow_idol` boss is at stage 3, the eye is
open; purely a read, no new state). Register it in `drawZoneBG()`'s dispatch and give the
Ashen Sanctum's `drawAshenBG` a distinct treatment pass while there (it exists but is the
weakest of the BG set).

### A.3 Landmarks — one hero set-piece per combat zone

`drawProps` currently scatters small repeating decorations. Add **one large, unique,
non-repeating landmark per zone** drawn at a fixed world x (world-space, behind characters):

- Outskirts: a ruined watchtower with a lit brazier (foreshadows Guard Tomlin's quests)
- Forest: a colossal hollow tree with a glowing heart (the "rift-song" made visible)
- Caverns: a half-excavated crystal titan skeleton
- Ruins: the Sealed Door itself — the object q1–q15 talk about, finally on screen
- Emberfall: Malachar's ember-forge, chimney glowing
- Glacier: a frozen wave, mid-crash, with something dark inside
- Arenas: the portal wound you entered through, still bleeding light

These are pure additions to `drawProps()` (one `if(theme && worldX window)` branch each),
they give each zone a memory anchor, and they let level design "speak" the story the quests
tell. Landmarks tie into the codex/quest fiction that already exists — zero new systems.

### A.4 Living-world micro-interactions

- **Footstep reaction:** walking spawns 1–2 terrain-colored motes at the feet (dust/grass
  flecks/snow puffs/embers) via the existing `parts` array; landing from a jump spawns a
  small ring. Snow zones additionally draw brighter "trampled" surface pixels for platforms
  the player has recently crossed (a tiny per-platform `lastWalked` timestamp on the runtime
  `plats` copy — transient, never saved).
- **Grass/vegetation parting:** the platform skin's tuft strip near the player's x bends away
  (a 2-frame swap driven by distance, computed at draw time — no state).
- **Weather pass per zone** in `drawForeground()`: Outskirts gets occasional drifting rain
  streaks; Glacier gets snowfall with wind gusts synced to the aurora; Emberfall's embers
  occasionally spiral upward in a thermal. All extend the existing particle loop's per-theme
  branches.

### A.5 Portals worth walking into

`drawPortals` currently draws simple markers. Redesign as **standing stone gates** with a
theme-colored energy film (two mirrored pillars + an animated vertical ripple using the
existing `glow` helper), an idle swirl particle, and a bright "bloom + particle rush" flare
when `enterPortal` fires (fits the existing zone-transition code path; the flare is a
0.4s effect drawn from a transient `portalFlashT` global like `bossAlertT`).

---

## 4. Workstream B — Characters: Everyone Gets a Face

**Goal:** zero shared silhouettes among named characters; every monster family visually
communicates its behavior.

### B.1 Unique sprites for all 15 hub NPCs (fix A1)

Each named NPC gets a dedicated `draw*` function and sheet, designed around **role, story,
and one signature animated prop**. Design sheet:

| NPC | Silhouette hook | Palette | Signature idle motion |
|-----|-----------------|---------|----------------------|
| Elder Mira | hunched, tall gnarled staff, trailing shawl | plum / gold trim | jar of slime-goo at her belt pulses faintly |
| Guard Tomlin | tower shield planted at his side (new outline vs. generic guard) | steel / Aethon red | shield tap, visor glint sweep |
| Ranger Sylva | longbow across back, single braid, kneeling half-pose | forest green / leather | fletches an arrow every few seconds |
| Sage Oriax | orrery of 3 orbiting motes above an open palm | indigo / brass | motes orbit continuously (reuse `glow`) |
| Scholar Aldric | armful of books, quill behind ear | oxblood / parchment | a book floats up, flips a page, settles |
| Seer Vesper | blindfolded, levitating 2px off the ground, veil drift | white / astral blue | veil ripple; ground shadow breathes |
| Envoy Sable | wide-brim hat, courier satchel, travel cloak | charcoal / ember orange | cloak flicks as if wind-caught |
| Merchant Galen | apron, coin scale in hand | teal / brass | scale pans tip back and forth |
| Forgemaster Bren | massive tongs over shoulder, leather mask up | soot / fire | anvil spark burst every ~4s (light source) |
| Master Builder Sora | rolled blueprints, plumb line | sandstone / cobalt | unrolls blueprint, studies, rerolls |
| Bounty Board | (object) parchment-covered board | wood / wax red | a new notice flutters when a bounty is available (reads `G.bounty` — the board becomes UI) |
| Storage Chest | (object) rune-locked chest | oak / gold | lid strains, spills a glint when nearly full (`G.storage.length` read) |
| Riftwarden Kael | cracked half-armor leaking rift light, chained gauntlet | void red / gunmetal | crack-light pulses with a heartbeat rhythm |
| Chronicler Ily | floating quill writing in a levitating tome | sage / silver | quill scribbles; ink motes fall |
| Astralwright Nyx | three-armed silhouette (two real + one astral), constellation cloak | deep space / starlight | astral arm slowly traces a sigil |

Notes: Kael/Nyx/Vesper are the endgame trio — they get the most exotic silhouettes and the
only levitation/extra-limb effects, visually signaling "post-story content lives here."
Each function follows the `drawElder` pattern (60-frame gentle loop) and registers in
`buildSheets()`; `ZD[0].npcs[].sheet` values switch to the new keys. The render spec's zone-0
pass automatically covers all of them; add a `sprites.spec.js` asserting every NPC name maps
to a unique sheet key.

### B.2 Player character: readable states + earned progression

- **State-aware sprite** (see Workstream C for the state machine): dedicated jump (tucked
  legs, hat brim lifted), fall (robe flaring upward, hat pressed down), land (1-frame squash),
  hurt (recoil, hat askew), cast-loop, and a 2-frame **idle breathe** with a hat-star twinkle
  so a resting player never looks frozen. Dash gets a lean-forward pose used for the trail
  images too (`PL.trail` currently reuses the walk frame).
- **Visible equipment tiers** (the RPG payoff): `drawMage` takes the equipped weapon's tier
  (`G.equipment.weapon`) and swaps the staff's head — plain wood → orb → forest coil →
  crystal → the Sealed-Door key-staff → phoenix wings → artifact-unique. Robe trim color
  shifts with armor rarity (`RARS` color). Implementation: `buildSheets()` already rebuilds
  cheaply; rebuild the four mage sheets on equip (call site: equip/unequip in the inventory
  handlers + `applySave`). This makes loot *visible*, the single strongest reward-feel
  upgrade available.
- **Shield read:** replace the plain circle stroke with a hex-facet bubble that ripples at
  the impact point when it absorbs a hit (impact angle from the projectile that hit).

### B.3 Monster families with behavioral costume

Monsters keep their footprints but each family's redesign encodes its AI:

- **Slime** — translucent body with a visible "core" that *is* the rift-seed relic it can
  drop; squash-stretch cycle; core flashes before the lunge.
- **Goblin** — asymmetric armor scraps; raises its blade over its head for 0.3s before a
  melee swing (the telegraph pose, see C.3).
- **Cave Bat** — membrane wings with light shining through; folds wings for a dive.
- **Crystal Golem** — cracked stone with inner light in the joints; the inner light
  brightens as HP drops (damage read = `m.hp/m.mhp`, drawn as glow alpha).
- **Skeleton Archer** — draw-and-loose cycle where the bow visibly bends; quiver empties
  visually.
- **Shadow Wraith** — no ground shadow (the only entity without one — instant identification);
  trailing tatters via a 3-position afterimage.
- **Act 2 family** (Magmite/Ashwing/Frostmaw/Sleetwisp): each gets an elemental "leak" —
  dripping magma, falling ash, frost breath puffs, sleet static — using the `parts` system
  at spawn-throttled rates.
- **Elites:** beyond the ★ and gold glow, elites get a physical crown-of-affix: frenzied =
  red speed-lines, vampiric = drifting blood motes, explosive = a visibly sputtering fuse
  spark, armored = a stone-plate overlay. Affix identity becomes readable at a glance
  before the name tag is.

### B.4 Bosses: presence scaling

Bosses already scale 4×; give them **layered draw passes**: an under-glow silhouette, the
body, and an over-pass for stage effects (Zal'Guroth's third eye, enrage's rising heat
lines). Each boss gets one **signature ambient effect** tied to its arena (Slime Sovereign
drips that spawn tiny cosmetic slimelets; Frost Matriarch's local snowfall intensifies as
her HP drops). All reads, no new state.

---

## 5. Workstream C — Animation: A State Machine, Not a Strip

**Goal:** replace "one looping strip per entity" with a light animation-state system that
stays 100% compatible with `mkSheet`/`SHS`.

### C.1 The `ANIM` registry + state resolution

```js
// Data (Sprite System section):
const ANIM = {
  mage: {
    idle:  {frames: 4,  fps: 4,  loop: true},
    walk:  {frames: 8,  fps: 12, loop: true},
    jump:  {frames: 2,  fps: 8,  loop: false},
    fall:  {frames: 2,  fps: 8,  loop: true},
    land:  {frames: 2,  fps: 16, loop: false},   // fires the dust ring
    cast:  {frames: 4,  fps: 14, loop: false},
    hurt:  {frames: 2,  fps: 10, loop: false},
    dash:  {frames: 1,  fps: 1,  loop: true},
  },
  // per-monster entries: idle / walk / windup / attack / hurt / die / spawn
};
```

- Sheets bake as **one row per state** (extend `mkSheet` to accept a state list and stack
  rows vertically — blit sites gain a `sy` source row; the six existing `drawImage` sites
  are the only touch points, exactly as the SS=2 migration did).
- State selection is **derived, not stored**, wherever possible: airborne + `vy<0` = jump,
  `vy>0` = fall, `dashT>0` = dash, `casting>0` = cast, `|vx|>10` = walk, else idle. Only
  `land` and `hurt` need a transient timer (`PL.landT`, `m.hurtT`) — runtime-only fields
  like `dashT`, never saved.
- Draw functions receive `(ctx, state, f, ...)` and share body-part sub-functions so a
  state is a *pose recipe*, not a full redraw (the `drawMage` body is already built from
  composable segments — formalize that).

### C.2 Deaths are events (fix A3/A8)

`killM` currently deletes the monster. Instead, move the corpse into a cosmetic `dying`
list (excluded from all AI/collision — gameplay timing unchanged, tests unaffected) that
plays a per-family death: slimes deflate into a puddle that soaks away; golems crumble into
falling chunks (3–4 physics motes using `parts` gravity); skeletons collapse into a bone
pile; wraiths tear apart into streaks; bats tumble with gravity. Bosses get a 1.2s
multi-flash + chunk burst + slow-mo-esque white flash (a 0.15s full-screen `lighter` pulse).
**Spawn-in mirrors it:** the 5s respawn `setTimeout` in `killM` spawns monsters with a 0.4s
materialize state (rising motes + alpha ramp) instead of popping in.

### C.3 Telegraphs (fix A4)

Every damage source gets a **windup read** of 0.25–0.4s before the existing timing fires
(shift the visual earlier, not the attack later, so difficulty/tests don't change):
melee monsters play `windup` (raised arm/coiled body + a 1-frame white edge flash);
ranged/boss abilities pre-glow at the emission point (`glow` at the future projectile
origin, growing over the windup) — the code point is the top of each ability branch in
`updateBossAbilities`, keyed on the same `a1T/a2T` cooldowns (draw the glow when the
cooldown is within windup-time of firing: pure read of existing timers, zero new state).
Gravity-lob attacks (idol crusher arms) additionally draw a faint landing-zone arc marker.

### C.4 Micro-feel kit

- **Hitstop:** 40ms freeze (skip one `tick` scale-down, not a real sleep) on crits and boss
  hits; 90ms on boss kills.
- **Squash & stretch:** jump launch = 0.9x/1.1y for 2 frames, land = 1.15x/0.85y.
  Implemented as a draw-time transform around the player blit only.
- **Knockback read:** monsters already get `hit` flash — add a 2px recoil offset in the
  hit direction during `hit>0`.
- **Camera:** soften `camX` with a small look-ahead in the facing direction (+24px lerp)
  and a 4px vertical ease on landings; keep `screenShake` but add per-source amplitude
  (crit < boss ability < death) — half of these calls already pass custom `amt`.

---

## 6. Workstream D — Spell & Combat VFX

**Goal:** spells feel like the game's signature verb.

- **Animated projectiles:** bake 4-frame sheets per projectile (`bolt` crackles, `fireball`
  roils with a licking tail, `ice` rotates and glints, `curseOrb` pulses with an inner eye,
  `toxic` bubbles). `projs` entries already carry `proj`/`pw`/`ph` — the blit site indexes
  frames by `gTime`.
- **Trails:** each projectile appends 2 fading motes per frame to `parts` in its spell color
  (cap total parts; see §8 performance budget). Ice leaves a brief crystalline glitter;
  fireball leaves heat-shimmer rings.
- **Muzzle + impact:** casting already has a hand spark — add a 3-frame muzzle flash ring
  at fire; impacts get per-element bursts (already color-coded via `burst`) plus a
  **surface response**: scorch fade-mark on platforms for fire, frost patch for ice
  (drawn into the platform's cached skin canvas with a timed fade — cosmetic, cache-local).
- **School capstone identity:** Inferno burn = small flame tongues on the burning monster
  (`m.burn` read); Chain = a 2-frame lightning arc drawn between primary and secondary
  target at hit time; Glacier deep-freeze = full ice-block encasement sprite overlay while
  frozen. Emberstorm splash = expanding ring wave. These systems exist mechanically but are
  nearly invisible today — pure draw additions at the existing projectile-hit code paths.
- **Mana Shield:** see B.2; on break, shard particles fly outward.
- **Enrage:** the existing red aura gains rising heat-line particles and a brief full-screen
  red edge-pulse at onset (there is already a banner + log line to sync with).

---

## 7. Workstream E — UI/UX: A Frame Worthy of the Painting

**Goal:** the HTML shell and canvas text stop looking like a debug harness (fix A6),
readability goes *up* at every size.

### E.1 Typography
- Embed **one pixel font as an inline base64 WOFF2** (~15–25KB inline; still a single file
  with zero external requests, matching the "self-contained" constraint the same way
  base64 would for any asset) — used for headings, canvas labels, damage numbers, HUD
  numerals. Body/dialog text stays a readable system UI stack at a *larger* size (13–14px,
  up from 10–12px): pixel fonts for flavor, humanist for paragraphs. If the inline-font
  budget is rejected, fallback plan: a procedural 5×7 bitmap glyph renderer for canvas
  labels only (≈60 lines), and keep system fonts in HTML.
- Canvas name tags get a consistent treatment: small-caps pixel font, 1px shadow, alpha
  tied to distance from player (nearby names bright, far names faint) to cut label clutter
  in the crowded hub.

### E.2 The game frame
- Restyle the side panel + HUD as a **cohesive "arcane ledger"**: dark parchment-on-slate
  panels, 1px gold/astral-blue rules, corner notches (pure CSS, `border-image` from an
  inline SVG data-URI). Tabs become tabbed bookmarks. All existing IDs/classes keep working —
  restyle only.
- **HP/MP/XP orbs & bars:** HP and MP become small orbs (canvas-drawn, liquid fill with a
  sine surface) flanking the portrait; XP stays a thin full-width bar with tick marks per
  10%. Low HP (<25%) pulses the orb and adds a subtle red vignette breathing into
  `drawLighting` — communicated in world, not just in chrome.
- **Cooldown clarity:** spell buttons get radial wipe cooldowns + a 1-frame flash when
  ready (players currently watch numbers).
- **Boss bar** is already decent — add a portrait chip (blit the boss's sheet frame 0 into
  a 24px circle), stage pips for multi-stage bosses, and an enrage timer sliver.
- **Damage numbers:** size/color grammar — normal white, crit gold + 1.4× with a pop-scale
  ease, DoT ticks small and unobtrusive, player damage red with a slight downward drift,
  heals green rising. `spawnDN` already takes strings/colors; formalize the grammar.
- **Quest tracker:** the side panel quest tab gains a compact on-canvas tracker (top-left,
  current quest + progress ticks) so the panel isn't required during play; toggleable.

### E.3 Screens & transitions
- **Zone transitions** (fix A8): 0.5s iris/fade wipe through black with the zone name in
  the pixel font ("— Verdant Forest —") — hooks `loadZone`, pure DOM overlay like `#fade`.
- **Title screen:** replace the CSS gradient with a live canvas vista (the Aethon skyline
  from `drawCityBG` + drifting motes + the mage idle animation at 3× on a pedestal). The
  character-select card becomes a museum plinth. All code reuse.
- **Map modal:** restyle as an inked chart — zones as illuminated nodes on a path, locked
  zones as smudged ink, the current zone with a pulsing player sigil.

---

## 8. Workstream F — Light, Color & Performance Discipline

### F.1 Global color script
Define a **master palette ramp per zone** (5 darks, 3 mids, 2 accents each) documented in a
`PAL` object and used by BGs, platform skins, props, and `ZGRADE` alike, so each zone's
grade/props/terrain stop being ad-hoc hexes and start being a graded family. Accent colors
are reserved: *only* interactive/dangerous things get full-saturation accents (spells,
telegraphs, portals, loot glints) — this is the readability contract that keeps busy scenes
parseable.

### F.2 Lighting upgrades (all inside `drawLighting`)
- Platform-aware light pools: lamppost/crystal/ember props register cheap static light
  positions per zone (computed at `loadZone`) so ground lights actually illuminate the
  platform strip under them.
- Player aura tint follows the last spell cast for 2s (identity feedback).
- Boss presence grade: while a boss is alive, the vignette closes ~10% and the grade
  shifts 5% toward the boss color — the room *belongs* to it; reverts on kill (both are
  reads of `mons`).

### F.3 Performance & accessibility budget
- **Budget:** ≤ 400 live particles (hard cap on `parts.push` with oldest-first drop);
  platform skins cached per zone-load; sprite sheets remain build-once; target steady
  60fps on a 2019 laptop in the Endless Rift's worst wave. Add a debug FPS overlay behind
  a query flag (`?fps=1`) for feel-checks.
- **Reduced-motion setting** (volume-slider row in the HUD): disables screen shake,
  hitstop, and foreground particles; keeps all information-bearing reads (telegraphs,
  flashes at reduced intensity). Persisted like the volume values.
- **Photosensitivity:** no full-screen flash exceeds 0.15s or fires more than twice per
  second (audit the boss-kill and enrage pulses against this rule).
- **Colorblind-safe grammar:** damage/heal/crit distinguished by *shape and motion*
  (drift direction, pop scale) not hue alone; elite affixes distinguished by overlay
  iconography (C-of-affix designs in B.3), not just tint.

---

## 9. Phased Roadmap

Ordered by player-visible leverage per unit of risk. Each phase is shippable and
independently testable; no phase changes gameplay math or save format (the only new
persisted field in the entire plan is the reduced-motion toggle).

| Phase | Contents | Workstreams | Est. size | Key risk |
|-------|----------|-------------|-----------|----------|
| **1. Ground truth** | Platform terrain skinning + portal redesign + zone-name transition wipe | A.1, A.5, E.3 | ~600 lines | Platform cache memory on huge zones (mitigate: cache per visible chunk) |
| **2. Faces of Aethon** | 15 unique NPC sprites + player equipment-visible staff/robe tiers + shield redesign | B.1, B.2 | ~900 lines | Sprite authoring time; mitigate with shared body-part helpers |
| **3. Animation core** | `ANIM` state machine, player states, squash/stretch, land dust, monster hurt/death/spawn states, hitstop | C.1–C.4 | ~700 lines | The multi-row `mkSheet` change touches all 6 blit sites — do it first, alone, verify with render spec |
| **4. Combat language** | Telegraph system, animated projectiles + trails, impact/surface FX, capstone spell identity, enrage/boss presence FX | C.3, D, F.2 | ~500 lines | Particle budget; enforce the cap before adding emitters |
| **5. The frame** | Pixel font, HUD orbs, panel restyle, cooldown wipes, damage-number grammar, boss bar portrait, map restyle, title vista | E.1, E.2, E.3 | ~450 lines + font blob | Font licensing — pick an OFL pixel font; fallback bitmap renderer specced |
| **6. Set dressing** | Zone landmarks, Riftheart/Ashen backdrops, weather, footsteps/snow deformation, monster ambient leaks, elite affix costumes, boss signature ambience | A.2–A.4, B.3, B.4 | ~700 lines | Pure additive; lowest risk, highest polish density — intentionally last |

**Definition of done per phase:** `npm test` green (existing `render.spec.js` covers every
zone incl. sprites/props/foreground/lighting); new spec files —
`sprites.spec.js` (every NPC/monster maps to a registered unique sheet; every `ANIM` state
row exists in its sheet), `anim.spec.js` (state resolution: airborne→jump/fall, death
list drains, telegraph timers precede ability fires), `ui.spec.js` (font loaded, reduced-
motion toggle persists) — plus a manual feel-check pass in the browser per the CLAUDE.md
convention (animation/difficulty feel is still human-judged).

**Suggested first slice if starting immediately:** Phase 1's platform skinning alone
transforms every screenshot of the game and de-risks the caching pattern that Phase 6's
surface-FX also uses.

---

## 10. What This Plan Deliberately Does *Not* Do

- No canvas resolution change, no WebGL, no offloaded workers — the Canvas 2D + offscreen
  sheet architecture is fast, testable, and fits the single-file soul of the project.
- No gameplay retuning disguised as graphics: telegraphs shift *visuals* earlier, never
  attack timings; death animations are cosmetic corpses, never targetable entities.
- No image or audio files, no external fetches — the one inline base64 font is the sole
  binary blob, and it has a fully-procedural fallback if even that is unwanted.
- No redesign of the cutscene system in this pass — it inherits the pixel font and palette
  ramps for free, and a dedicated cutscene-art pass is a natural Phase 7 once the in-game
  language is established.
