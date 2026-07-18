# Feature Backlog

Features planned for AstralBound, to be built later.

All items below were approved from the July 2026 game critique
(`docs/GAME_CRITIQUE.md` — see each ID there for full evidence and rationale).
Ordered by the critique's suggested priority. Severity: 🔴 High · 🟡 Medium · 🟢 Low.

## Priority 1 — first five minutes, every session

- [ ] **A1 🔴 Responsive display**: scale the game canvas to fill the viewport
      (integer pixel scale or CSS transform), anchor HUD/hotbar/log to the canvas
      edges instead of the page, and add a fullscreen toggle. Kills the dead-black
      letterboxing that covers ~40% of a desktop window.
- [ ] **B1 🔴 Readable world-space labels**: larger monster/NPC/portal labels with
      a dark backing pill shown on proximity; always-visible per-role icons above
      hub NPC heads (anvil = forge, bag = shop, book = codex, etc.).
- [ ] **B2 🔴 Quest tracker hierarchy**: pin the tracked active story quest on top
      with progress; collapse available-but-unaccepted quests into a single
      "N new quests in Aethon City" line.

## Priority 2 — core loop friction

- [ ] **C1 🔴 Combat that demands movement**: add enemy behaviors that punish
      standing still (leapers, lobbers, aura enemies that must be kited) and/or a
      manual-aim damage bonus, so optimal play is no longer ledge-camping with
      Arcane Bolt on cooldown. Pull raid-arm-style patterns into regular zones.
- [ ] **C2 🔴 Safe zone entrances**: no-spawn/no-aggro radius (~150px) around
      portals, ~1s of entry i-frames, and arena bosses anchored to arena center
      until the player first moves/casts (prevents boss spawn-camping — reproduced
      with Veyra at the Hollow Rift entrance).
- [ ] **C5 🟡 Rework relic-hunt delivery**: keep the 1%-relic fantasy but remove
      the dead grind — spawn a visible ★ rare carrier with a guaranteed drop every
      ~20 kills, or start bad-luck pity at 25 kills (was 75) with visible progress
      ("the rift-song grows louder…"). Test halving the 15–25 story-quest kill counts.

## Priority 3 — payoffs that land

- [ ] **E1 🟡 Finale cutscenes**: three short scenes on the existing cutscene
      engine — post-q15 (the door closes), post-q22 (Malachar falls), and a true
      ending after Zal'Guroth — reusing zone art.
- [ ] **E2 🟡 Honor the finale's stakes**: seal the Hollow Rift exit portal until
      Veyra falls (with a confirmed "retreat resets the attempt" option), or have
      Seer Vesper's dialog acknowledge a mid-fight retreat.
- [ ] **D1 🟡 Rift arena variety**: rotate the Endless Rift arena through existing
      zone palettes/props per 5-depth band (via `zoneTheme`), add 3–4 alternate
      platform layouts, and give deep boss Echoes one extra ability rider
      (e.g. "Echo of Veyra, Frenzied").

## Priority 4 — sustained-play quality

- [ ] **B3 🟡 Pause menu**: Esc → pause (resume / settings / how-to-play / quit to
      title); move music/SFX sliders and the reduced-motion toggle out of the HUD
      into it.
- [ ] **B4 🟡 Skill tree rendering**: three labeled school columns (fire/frost/
      arcane color coding) with prerequisite connector lines; locked nodes state
      their requirement ("requires Fireball").
- [ ] **B5 🟡 Item inspection**: rarity-colored borders on bag tiles, hover/tap
      tooltip card (name, stats, sockets, power text, sell value), compare line
      vs. currently equipped.
- [ ] **B6 🟡 Split the log**: achievements/quest-state changes become transient
      toasts (top-right); the bottom log keeps combat/loot, stops clipping long
      lines, and expands on hover.
- [ ] **C3 🟡 Exploration content per zone**: one hidden treasure spot (behind
      foreground silhouettes / above the visible ceiling), rare wandering elites,
      and one platforming challenge with a guaranteed chest per combat zone.
- [ ] **C4 🟡 New enemy behavior archetypes**: one per act — e.g. a shielded enemy
      (dash through / hit from behind), a summoner, a telegraphed suicide-bomber
      (promote the `explosive` affix into a real enemy with a visible fuse).
- [ ] **D2 🟡 Codex gap shaping**: group bestiary entries by zone with headers,
      show silhouette + zone name for undiscovered creatures, per-zone
      "3/4 recorded" counts.
- [ ] **F1 🟡 Music variation pass** (needs a human listening check first):
      long-cycle variation keyed to `gTime` (intensity ramps every ~90s,
      instrument swap-ins) and a combat-intensity layer that fades in on aggro.

## Priority 5 — polish

- [ ] **A2 🟢 Fix the one-class "choice" screen**: add a second playstyle preset
      (stat/skill-tree variant) or reframe the screen as pure naming ("Name your
      mage") until real classes exist.
- [ ] **A3 🟢 Intro flow order**: naming screen before the intro cutscene (cutscene
      can then use `{name}`); click-anywhere advances text, Enter skips.
- [ ] **A4 🟢 Palette contrast zone(s)**: light one or two zones deliberately
      differently (dawn Outskirts, ember-orange Wastes ambient, aurora Glacier) so
      the signature darkness has contrast.
- [ ] **A5 🟢 Cavern landmark polish**: give the pale silhouette landmark interior
      detail/glow consistent with the zone, or remove it.
- [ ] **B7 🟢 Bug — boss banner leaks across zones**: reset `bossAlertT` (and rift
      banner timers) in `loadZone`/`endRift`.
- [ ] **B8 🟢 Bug — rift HUD overlaps the top-left control hints** during rift runs.
- [ ] **C6 🟢 Difficulty tuning pass**: normalize monster damage as a % of at-level
      max HP per zone tier (skeleton archers spike vs. neighbors).
- [ ] **D3 🟢 Foreshadow artifacts & sockets**: one Forgemaster Bren line on first
      gear upgrade (sockets) and one line after the first boss kill (artifacts).
- [ ] **D4 🟢 Third potion hotbar slot** as an Apothecary district perk.
- [ ] **E3 🟢 Seed the Voice reveal**: one line each from the goblin prisoners, the
      Crystal Lich, and Malachar hinting at Zal'Guroth so the raid reveal feels
      planned.
- [ ] **E4 🟢 Stagger guild side-quest unlocks** across levels ~3/6/9/12/16
      (also relieves B2's tracker pile-up).
- [ ] **F2 🟢 SFX for high-value moments**: dedicated sounds for rune socketing,
      city district raises, and codex unlocks.

---

_Note: expandable capacity is provided by the Storage Chest in Aethon City (the
carried bag stays fixed); only storage is expandable._
