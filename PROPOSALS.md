# AstralBound — Feature Proposals

> Grand ideas to make the game more interesting and to keep players coming back.
> Every proposal below is grounded in the current single-file architecture (`index.html`)
> and notes the concrete integration points (state, functions, save migration, tests).

---

## The retention problem (why we need these)

AstralBound today is a **finite, linear experience**:

- **15 quests** (`QUESTS`, line 977) form one sequential story chain. When you turn in
  `q15` and kill `hollow_oracle`, *the content is over.* There is no reason to open the
  tab tomorrow.
- **Progression caps out** with the story. Levels keep rising (`xpNext *= 1.4`) but there
  is nothing to spend that growth on once the final boss dies.
- **Loot has a ceiling.** The best item — a guaranteed Artifact from Veyra — is obtained
  once, and the 6-node-deep gear tier ladder (`RARS`, line 1076) tops out quickly.
- **The skill tree is shallow.** `SKN` (line 1073) has ~10 nodes and a single viable
  caster build; there is no respec, no reason to experiment.
- **No daily hook.** Nothing changes between sessions; no seeded variety, no streak, no
  "one more run" loop.

The proposals below attack each of these. They are ordered as a **recommended roadmap**:
each builds naturally on the last, and the first one (Endless Rift) is the single biggest
retention lever because it gives the game a *loop* instead of an *ending*.

---

## Proposal 1 — The Endless Rift (infinite scaling endgame) ⭐ flagship — ✅ IMPLEMENTED

> **Status: shipped.** Built into `index.html` (the `RIFT` controller, `RIFT_MODS`, `RIFT_SHOP`,
> arena zone `RIFT_ZONE`, Riftwarden Kael in the hub) with full coverage in `tests/rift.spec.js`.
> The description below is the original proposal; it matches what was built.

**Problem solved:** The game ends. This gives it a *forever* mode.

After sealing the Hollow Rift, Seer Vesper unlocks **Rift Incursions**: a repeatable,
infinitely-scaling challenge accessed from the hub. Each "descent" is a run of escalating
waves in a procedurally-modified arena. Push as deep as you can; bank rewards; come back
stronger.

### Player-facing loop
- Talk to a new **Riftwarden** NPC (or reuse Seer Vesper) in Aethon City → choose a
  **Depth** to start at (highest cleared, or lower for a safer farm).
- Each depth is a wave-survival fight in the Hollow Rift arena (zone 5 geometry already
  exists). Clear all waves → choose **1 of 3 modifiers** for the next depth (more reward
  vs. more danger), then descend deeper.
- Monsters scale: `hpMul = 1 + depth*0.18`, `dmgMul = 1 + depth*0.12`, plus guaranteed
  affixes and extra elites at higher depths. Bosses reappear as "Echoes" every 5 depths.
- Death (or voluntary "extract") banks **Rift Shards** (new currency) scaled to deepest
  depth reached. Beating your record gives a bonus.

### Why it retains
- **No ceiling** — there is always a deeper depth and a personal best to beat.
- **Run variety** — the modifier draft (à la Slay-the-Spire / Diablo Nightmares) means no
  two descents feel identical.
- **A spendable currency** (Rift Shards) that feeds Proposals 2 & 4.

### Integration points
- New `G` fields: `riftDepth` (best cleared), `riftShards`, `riftActive`/`riftWave` runtime
  flags. Add to the `G` initializer (line 961), `saveGame()` (1159) and `applySave()` (1178).
- Reuse `mkMon` (line ~1250) with a depth multiplier hook; reuse zone 5 plats; spawn waves
  from a timer instead of static `ZD[5].mons`.
- New dialog handler beside `openBounty`/`openForge` (the NPC `board`/`forge`/`storage`
  pattern at `openDlg`, line 1803).
- Bump save to `v:3`; migration is additive (default the new fields).
- **Tests:** new `rift.spec.js` — wave scaling math, shard payout, modifier application,
  extract vs. death banking.

---

## Proposal 2 — Ascension / New Game+ (meta-progression & prestige) — ✅ IMPLEMENTED

> **Status: shipped.** Built into `index.html` (the `META` object + `ASCN` talent board,
> Astralwright Nyx in the hub, paragon multipliers wired into mkMon/spawnBoss/fireAt/killM/
> depthCleared) with coverage in `tests/ascension.spec.js`. One refinement vs. the original
> proposal: the permanent tree is funded by a dedicated prestige currency, **Astral Echoes**
> (earned by ascending), rather than Rift Shards — Shards stay the in-run rift currency, giving
> two clean, separate economies. Meta lives under its own localStorage key as proposed.

**Problem solved:** Nothing carries between "lifetimes"; reaching max feels like a dead end.

Once the Oracle falls, the player can **Ascend**: restart the story chain (or jump straight
to endless) with a **permanent meta-talent tree** funded by Rift Shards (Proposal 1) and an
**Ascension Level** that scales all enemies *and* rewards.

### Mechanics
- An **Ascension constellation** — a persistent passive board separate from `SKN`:
  e.g. `+X% all damage`, `+X% gold/XP`, `+1 potion slot`, `start with a Rare weapon`,
  `+5% crit`, `extra dash charge`. Bought with Rift Shards; **persists across ascensions**.
- Each Ascension raises a global `ascLevel` that multiplies enemy HP/damage **and** XP/gold/
  drop-rarity — the classic "paragon" power-creep treadmill that makes re-runs feel fresh
  and fast.
- Story quests can be re-run for escalating rewards, or skipped via a "Veteran's Path" toggle.

### Integration points
- New `G` fields: `ascLevel`, `metaTalents` (Set/object), and the constellation persists
  **outside** the soft-reset (store under a second localStorage key, e.g.
  `astralbound_meta_v1`, so Ascension can wipe `G` without wiping meta).
- Hooks into existing multipliers: `gainXP`, gold award in `killM` (line 1755), `rollGear`
  rarity weights (line 1090), damage in `fireAt`/`castSpell` (line 1752).
- **Tests:** `ascension.spec.js` — meta persists across reset, multipliers stack correctly,
  constellation purchase/refund.

---

## Proposal 3 — Deep build system: schools, runes & respec — ✅ IMPLEMENTED

> **Status: shipped.** Runes + sockets (`RUNES`, drilled at the Forge), a free `respec`, and
> three school capstones (`inferno`/`chain`/`glacier`) are in `index.html`, covered by
> `tests/runes.spec.js`. Sockets are drilled (gold sink) rather than rolled, so `rollGear`'s
> RNG — and the gear test suite — is untouched.

**Problem solved:** One build, no experimentation, shallow theorycrafting.

Turn the thin `SKN` tree into a real **build engine** with three specializable schools and
**socketable runes** on gear, plus a respec so players actually tinker.

### A. Three schools (expand `SKN`)
- **Pyromancer** (burn DoT, AoE explosions), **Cryomancer** (freeze/shatter, control),
  **Arcanist** (raw bolt scaling, crit, cooldown). Capstone nodes per school grant a
  build-defining mutator (e.g. Fireball leaves a burning pool; Ice Shard pierces & chills
  an area; Bolt chains to 2 extra targets).
- Add a **Respec** option (free in town, or small gold cost) so players re-roll builds for
  Endless modifiers — drives repeated engagement with the system.

### B. Rune sockets on gear
- Gear can roll **1–3 sockets**; **runes** (a new droppable item class) slot in for stat
  mods or effects (`+crit`, `+burn duration`, `mana on kill`, `lifesteal`).
- Adds a loot *axis* beyond rarity tier — a Common with the right runes can beat a vanilla
  Epic, which keeps every drop interesting.

### Integration points
- Extend `SKN` (line 1073) and `USK` apply-sites (the `hasPow`/skill checks scattered through
  `fireAt`, `castSpell`, `spellCd`); add a `respec()` mirroring `renderSP`.
- Gear objects (`rollGear`, line 1090) gain a `sockets[]` array; new `RUNES` data table near
  `ITEMS` (line 971); equip/socket UI alongside the bag click handlers.
- Save: gear already serializes as objects, so sockets ride along; add `RUNES` to the item
  resolver in `applySave` (line 1188).
- **Tests:** extend `skills.spec.js` + new `runes.spec.js` — school capstones modify spell
  behavior, rune stats apply, respec refunds points.

---

## Proposal 4 — Living hub: rebuild Aethon City (settlement progression) — ✅ IMPLEMENTED

> **Status: shipped.** `CITY`/`G.city` districts upgraded via Master Builder Sora, each wired
> into a single gameplay chokepoint, with a skyline monument that grows with investment.
> Covered by `tests/city.spec.js`.

**Problem solved:** The hub is static set-dressing; gold has few long-term sinks.

Make Aethon City a **settlement the player rebuilds** with Rift Shards + gold + materials,
unlocking passive account-wide bonuses and new services. A "city builder lite" layer that
gives every farming session a visible, persistent payoff.

### Buildings (each = a tiered upgrade)
- **Arcane Sanctum** → faster mana regen / extra spell slot.
- **Grand Forge** (upgrade Bren) → higher upgrade tiers, reforge/reroll affixes.
- **Apothecary** → craft & auto-restock potions; potion potency tiers.
- **Mercenary Guild** (upgrade Bounty Board) → multiple concurrent bounties, elite bounties.
- **Vault** (upgrade Storage Chest) → cheaper expansions, auto-sort, material stockpile.
- **Statue of the Sealed Door** → cosmetic milestone that visibly changes the skyline as you
  invest (the hub literally grows as you progress — strong long-term motivation).

### Integration points
- New `G.city` object: `{sanctum:0,forge:0,apothecary:0,guild:0,vault:0}` level map.
- Each building reads its level to gate existing systems (forge `UPG` table line 1112,
  bounty `genBounty` line 1100, storage `storageCost` line 1831).
- Hub background draw (zone 0 branch in `draw`, ~line 1291) keys off `G.city` to render
  built structures.
- **Tests:** `city.spec.js` — building levels gate the right unlocks; costs scale.

---

## Proposal 5 — Daily Rifts, achievements & the Codex (engagement + collection) — ✅ IMPLEMENTED

> **Status: shipped.** A deterministic UTC-seeded **Daily Rift** (Riftwarden dialog, streaks),
> ~24 account-wide **achievements** (`ACHV`/`checkAchv`) that pay Rift Shards, and a **Bestiary/
> Codex** (Chronicler Ily) that fills as creatures are slain. All state is account-wide on `META`,
> so it survives Ascension. Covered by `tests/engagement.spec.js`.

**Problem solved:** No reason to log in *today*; no long-tail collection goals.

### A. Daily Seeded Rift
- A **deterministic daily challenge**: same seed for everyone that day (derive from the UTC
  date — works fully offline, no server). Fixed modifiers, one scored attempt, a daily
  reward + streak counter. This is the classic "come back every day" hook.
- Reuses the Endless Rift engine (Proposal 1) with a seeded RNG instead of `Math.random`.

### B. Achievements
- ~30 milestone achievements (`Slay 1,000 monsters`, `Reach Depth 50`, `Equip a full
  Artifact set`, `Win without taking damage`, `Forge a Legendary`). Each grants Rift Shards /
  cosmetics. Gives mid-session micro-goals and a completion meta-goal.

### C. Bestiary / Lore Codex
- Auto-fills as you kill monsters and complete quests: monster stats, drop tables, lore
  blurbs, boss strategies, and the unfolding Hollow Rift story re-readable in one place.
- Cheap to build (data already exists in `MDEF`, `BOSS_DEFS`, `QUESTS`), high perceived value,
  and turns the existing story into a *collectible*.

### Integration points
- New `G` fields: `daily` (`{date,done,streak}`), `achievements` (Set), `codex` (auto-derived
  from `G.kills` + `questStates`, mostly needs no new state).
- A small seeded PRNG helper (mulberry32) near the audio/util helpers; gate the daily on UTC
  date string.
- Achievement checks fire from existing event sites: `killM`, `turnInQ`, `addGear`,
  `upgradeGear`, level-up.
- **Tests:** `daily.spec.js` (seed determinism, streak rollover), `achievements.spec.js`
  (triggers fire once, reward granted), `codex.spec.js` (unlocks on first kill).

---

## Proposal 6 — Combat depth: companions & elemental reactions (optional, high-flavor)

**Problem solved:** Moment-to-moment combat is "cast bolt, dodge"; it can go deeper.

Two smaller, self-contained systems that make fights richer (good once the structural
proposals above land):

- **Spirit Companion / Familiar** — a craftable pet (from rift relics) that auto-attacks,
  levels with you, and has one active you trigger. Adds a progression pet to nurture and a
  build choice (offensive vs. support familiar).
- **Elemental reactions** — combo spells: Ice-then-Fire = **Shatter** (burst), Fire-then-Ice
  = **Steam** (blind/slow). Rewards spell sequencing and makes the multi-school build
  (Proposal 3) shine. Hooks cleanly into the existing `slow`/projectile resolution in
  `fireAt`.

### Integration points
- `G.companion` object; draw it near the player sprite (draw loop ~1660); update in `update`
  beside monster AI.
- Reactions: tag monsters with a transient `m.elem`/`m.elemT`; check on spell hit in `fireAt`
  (line 1753) and trigger the reaction effect + SFX (add `sfxShatter`/`sfxSteam` in the audio
  section ~321).
- **Tests:** `companion.spec.js`, extend `combat.spec.js` for reactions.

---

## Recommended roadmap

| Phase | Ship | Why first |
|---|---|---|
| **1** | **Endless Rift** (P1) | Converts an ending into a loop. Biggest single retention win; everything else feeds off Rift Shards. |
| **2** | **Ascension + meta tree** (P2) | Gives the loop long-term meaning; the prestige treadmill. |
| **3** | **Build depth: schools + runes + respec** (P3) | Makes the now-repeatable combat worth re-engaging with. |
| **4** | **Daily Rift + Achievements + Codex** (P5) | Cheap, high-impact daily/again hooks reusing P1's engine. |
| **5** | **Living hub** (P4) | Long-tail gold/shard sink with a visible, satisfying payoff. |
| **6** | **Companions + reactions** (P6) | Flavor & combat depth once the structure is in place. |

### Cross-cutting engineering notes
- All of this stays in **`index.html`** per `CLAUDE.md` conventions — data tables near their
  existing counterparts, systems in their owning section.
- **Save discipline:** every new persistent field must be added to all three of the `G`
  initializer, `saveGame()`, and `applySave()`, with a `v:3` bump and additive migration.
  Meta-progression (P2) should live under a *separate* localStorage key so Ascension can
  reset `G` without nuking permanent unlocks.
- **Test discipline:** `CLAUDE.md` requires the Playwright suite to stay a complete content
  inventory — each proposal lists the spec file(s) to add/extend.
- Each proposal is independently shippable; the roadmap is the *recommended* order, not a
  hard dependency chain (P1 → Rift Shards is the main shared dependency).

---

## TL;DR

The fastest path from "fun demo you finish once" to "game you keep playing" is:
**1) give it an infinite, varied endgame (Endless Rift), 2) make power persist across runs
(Ascension), 3) make builds worth experimenting with (schools + runes), then 4) layer on
daily/collection hooks and a hub that visibly grows.** Start with the Endless Rift — it's the
keystone the rest hang from.
