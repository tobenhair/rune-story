# Feature Backlog

Features planned for AstralBound, to be built later.

All items below were approved from the July 2026 game critique
(`docs/GAME_CRITIQUE.md` — see each ID there for full evidence and rationale).
Ordered by the critique's suggested priority. Severity: 🔴 High · 🟡 Medium · 🟢 Low.

## Priority 1 — first five minutes, every session

- [x] **A1 🔴 Responsive display**: scale the game canvas to fill the viewport
      (integer pixel scale or CSS transform), anchor HUD/hotbar/log to the canvas
      edges instead of the page, and add a fullscreen toggle. Kills the dead-black
      letterboxing that covers ~40% of a desktop window.
      _Done: fixed 16:9 internal resolution (`VIEW_W`/`VIEW_H`) + `fitCanvas()` scales
      the element to fill the play area; the shell fills the viewport (`100dvh`);
      `⛶` HUD button → `toggleFullscreen()`._
- [x] **B1 🔴 Readable world-space labels**: larger monster/NPC/portal labels with
      a dark backing pill shown on proximity; always-visible per-role icons above
      hub NPC heads (anvil = forge, bag = shop, book = codex, etc.).
      _Done: `labelPill()` backing-pill helper on NPC/monster/portal names (pill on
      proximity; bosses/elites/portals always); `npcRoleIcon()` glyph above each
      service NPC._
- [x] **B2 🔴 Quest tracker hierarchy**: pin the tracked active story quest on top
      with progress; collapse available-but-unaccepted quests into a single
      "N new quests in Aethon City" line.
      _Done: `renderQP()` pins the active story quest (`.qtrack`), folds available
      quests into one `.qavail` line, and collapses completed ones to a count._

## Priority 2 — core loop friction

- [x] **C1 🔴 Combat that demands movement**: add enemy behaviors that punish
      standing still (leapers, lobbers, aura enemies that must be kited) and/or a
      manual-aim damage bonus, so optimal play is no longer ledge-camping with
      Arcane Bolt on cooldown. Pull raid-arm-style patterns into regular zones.
      _Done: `beh` archetypes on `MDEF` — `leap` (goblin/frostmaw, telegraphed
      ballistic spring), `aura` (golem/magmite, kite-or-take-DoT field with a ground
      ring), `lob` (skeleton/sleetwisp, gravity-arced shot that reaches ledge-campers)._
- [x] **C2 🔴 Safe zone entrances**: no-spawn/no-aggro radius (~150px) around
      portals, ~1s of entry i-frames, and arena bosses anchored to arena center
      until the player first moves/casts (prevents boss spawn-camping — reproduced
      with Veyra at the Hollow Rift entrance).
      _Done: `loadZone` grants 1s entry i-frames; a `pSafe` 150px portal radius
      suppresses trash aggro/melee/lob/leap; `combatStarted` freezes a non-anchored
      arena boss at spawn until the first move/cast._
- [x] **C5 🟡 Rework relic-hunt delivery**: keep the 1%-relic fantasy but remove
      the dead grind — spawn a visible ★ rare carrier with a guaranteed drop every
      ~20 kills, or start bad-luck pity at 25 kills (was 75) with visible progress
      ("the rift-song grows louder…"). Test halving the 15–25 story-quest kill counts.
      _Done: relic pity ramps from 25 dry kills at +2%/kill (guaranteed by ~75) with
      "rift-song grows louder" hints; regular kill-quest counts halved._

## Priority 3 — payoffs that land

- [x] **E1 🟡 Finale cutscenes**: three short scenes on the existing cutscene
      engine — post-q15 (the door closes), post-q22 (Malachar falls), and a true
      ending after Zal'Guroth — reusing zone art.
      _Done: playScene engine + three finale scenes (q15/q22/q23 turn-ins), reusing intro art, personalised with {name}._
- [x] **E2 🟡 Honor the finale's stakes**: seal the Hollow Rift exit portal until
      Veyra falls (with a confirmed "retreat resets the attempt" option), or have
      Seer Vesper's dialog acknowledge a mid-fight retreat.
      _Done: finaleSealed() gates the arena exit — walking the portal opens a confirmed retreat that resets the fight; portal draws sealed._
- [x] **D1 🟡 Rift arena variety**: rotate the Endless Rift arena through existing
      zone palettes/props per 5-depth band (via `zoneTheme`), add 3–4 alternate
      platform layouts, and give deep boss Echoes one extra ability rider
      (e.g. "Echo of Veyra, Frenzied").
      _Done: riftTheme rotates palette/props/grade per 5-depth band; 4 alternate RIFT_LAYOUTS; deep Echoes get a Frenzied/Warded/Searing rider._

## Priority 4 — sustained-play quality

- [x] **B3 🟡 Pause menu**: Esc → pause (resume / settings / how-to-play / quit to
      title); move music/SFX sliders and the reduced-motion toggle out of the HUD
      into it.
      _Done: Esc pause menu (resume/settings/how-to-play/quit-to-title) freezes update; volume + RM controls relocated into it._
- [x] **B4 🟡 Skill tree rendering**: three labeled school columns (fire/frost/
      arcane color coding) with prerequisite connector lines; locked nodes state
      their requirement ("requires Fireball").
      _Done: renderSP grouped into colour-coded Arcane/Fire/Frost sections with connector-indented sub-skills and "Requires X" on locked nodes._
- [x] **B5 🟡 Item inspection**: rarity-colored borders on bag tiles, hover/tap
      tooltip card (name, stats, sockets, power text, sell value), compare line
      vs. currently equipped.
      _Done: labelPill-style hover tooltip card (name/stats/sockets/power/Δ-vs-equipped/sell) on bag + equipped tiles; rarity borders._
- [x] **B6 🟡 Split the log**: achievements/quest-state changes become transient
      toasts (top-right); the bottom log keeps combat/loot, stops clipping long
      lines, and expands on hover.
      _Done: quest-state + achievement lines route to top-right toasts; the log keeps combat/loot, word-wraps, and expands on hover._
- [x] **C3 🟡 Exploration content per zone**: one hidden treasure spot (behind
      foreground silhouettes / above the visible ceiling), rare wandering elites,
      and one platforming challenge with a guaranteed chest per combat zone.
      _Done: ZONE_TREASURE cache on each combat zone's top platform (guaranteed rare+ + gold, once); ~30% wandering elite on entry._
- [x] **C4 🟡 New enemy behavior archetypes**: one per act — e.g. a shielded enemy
      (dash through / hit from behind), a summoner, a telegraphed suicide-bomber
      (promote the `explosive` affix into a real enemy with a visible fuse).
      _Done: shield (wraith — dash through the ward) and bomb (ashwing — telegraphed fuse detonation) beh archetypes, one per act._
- [x] **D2 🟡 Codex gap shaping**: group bestiary entries by zone with headers,
      show silhouette + zone name for undiscovered creatures, per-zone
      "3/4 recorded" counts.
      _Done: bestiary grouped by zone via monZoneMap with per-zone counts; undiscovered rows show a silhouette + the zone name._
- [x] **F1 🟡 Music variation pass** (needs a human listening check first):
      long-cycle variation keyed to `gTime` (intensity ramps every ~90s,
      instrument swap-ins) and a combat-intensity layer that fades in on aggro.
      _Done (needs listening check): updateCombatMusic swells a bass layer with nearby threat + a slow ~90s filter sweep._

## Priority 5 — polish

- [x] **A2 🟢 Fix the one-class "choice" screen**: add a second playstyle preset
      (stat/skill-tree variant) or reframe the screen as pure naming ("Name your
      mage") until real classes exist.
      _Done: character screen reframed as pure naming ("Name your mage" / "Your Calling")._
- [x] **A3 🟢 Intro flow order**: naming screen before the intro cutscene (cutscene
      can then use `{name}`); click-anywhere advances text, Enter skips.
      _Done: naming precedes the intro (beginNewGame); the intro personalises with {name}; Enter skips, click advances._
- [x] **A4 🟢 Palette contrast zone(s)**: light one or two zones deliberately
      differently (dawn Outskirts, ember-orange Wastes ambient, aurora Glacier) so
      the signature darkness has contrast.
      _Done: Village Outskirts warm-dawn grade, Frostveil Glacier aurora grade (ZGRADE)._
- [x] **A5 🟢 Cavern landmark polish**: give the pale silhouette landmark interior
      detail/glow consistent with the zone, or remove it.
      _Done: the Crystal Guardian landmark gains glowing crystal veins + a pulsing core._
- [x] **B7 🟢 Bug — boss banner leaks across zones**: reset `bossAlertT` (and rift
      banner timers) in `loadZone`/`endRift`.
      _Done: loadZone clears bossAlertT/riftMsgT so banners can't bleed between zones._
- [x] **B8 🟢 Bug — rift HUD overlaps the top-left control hints** during rift runs.
      _Done: #sg.in-rift hides the top-left control hints while the rift depth HUD is up._
- [x] **C6 🟢 Difficulty tuning pass**: normalize monster damage as a % of at-level
      max HP per zone tier (skeleton archers spike vs. neighbors).
      _Done: zone-4 pair raised, zone-8 pair trimmed toward a consistent %-of-at-level-HP band._
- [x] **D3 🟢 Foreshadow artifacts & sockets**: one Forgemaster Bren line on first
      gear upgrade (sockets) and one line after the first boss kill (artifacts).
      _Done: one-shot Forgemaster Bren lines foreshadow sockets (first upgrade) and artifacts (first boss kill)._
- [x] **D4 🟢 Third potion hotbar slot** as an Apothecary district perk.
      _Done: a third potion slot (U) unlocks at Apothecary level 3 (hotbarSlots)._
- [x] **E3 🟢 Seed the Voice reveal**: one line each from the goblin prisoners, the
      Crystal Lich, and Malachar hinting at Zal'Guroth so the raid reveal feels
      planned.
      _Done: Crystal Lich rasps "Zal'Guroth" on death; Malachar's turn-in reveals the fallen sages all obeyed the Voice._
- [x] **E4 🟢 Stagger guild side-quest unlocks** across levels ~3/6/9/12/16
      (also relieves B2's tracker pile-up).
      _Done: side-quest gates staggered to ~3/6/9/12/16._
- [x] **F2 🟢 SFX for high-value moments**: dedicated sounds for rune socketing,
      city district raises, and codex unlocks.
      _Done: dedicated sfxSocket / sfxCityRaise / sfxCodex cues._

---

_Note: expandable capacity is provided by the Storage Chest in Aethon City (the
carried bag stays fixed); only storage is expandable._
