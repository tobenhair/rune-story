# AstralBound — Full Game Critique (July 2026)

> A hard, end-to-end review of the current build: presentation, UX, combat, level design,
> systems, story, and audio. Produced by playing through every zone, boss, arena, and hub
> service in the real game (headless Chromium playthrough + full code read).
>
> **Status: awaiting review.** Nothing here is in the backlog yet. Each finding has an ID —
> approve the ones you want and they move to `backlog.md` as concrete items.
>
> Severity: 🔴 High (hurts every session) · 🟡 Medium (hurts often) · 🟢 Low (polish).

First, credit where due: the quest writing is genuinely strong, the endgame system stack
(Rift → Ascension → runes → city) is coherent and well-integrated, and the recent graphics
overhaul shows. The problems below are what stands between "impressive single-file project"
and "game people recommend to each other."

---

## A. Presentation & first impressions

### A1 🔴 The game doesn't fit the screen it's played on
On a normal 1440×900 desktop window, the play area is a fixed ~1240×515 strip pinned to the
top-left; roughly **40% of the screen is dead black**, and the spell hotbar + combat log
float in that void, visually detached from the game. There is no fullscreen toggle and no
scaling. This is the very first thing every player sees and it reads as "unfinished embed,"
undoing the work the art overhaul did.
**Recommendation:** scale the canvas (integer pixel scale or CSS transform) to fill the
viewport height, keep HUD/hotbar anchored to the canvas edges, add a fullscreen button.

### A2 🔴 "Choose your destiny" — with exactly one option
The character screen headline says *"Choose your destiny in the world of Aethoria"* above a
single Mage card. A choice screen with one choice is worse than no choice screen: it
advertises missing content in the first 10 seconds.
**Recommendation:** either ship a second playstyle (even a stat-variant "Battlemage" /
"Frostcaller" preset that maps to existing skill trees) or reframe the screen as pure
naming/identity ("Name your mage") until a real class exists.

### A3 🟡 The intro cutscene plays before you exist
Cold boot goes: narrator cutscene → *then* the naming screen. The player sits through lore
for a character they haven't created, and the typewriter text is slow with small
Next/Skip buttons. Order is backwards for attachment.
**Recommendation:** name first, then the cutscene (which can then use `{name}`); make
click-anywhere advance the text, Enter to skip.

### A4 🟡 The whole game is night
Every one of the 10 zones is a dark palette on a dark sky — the hub, forest, glacier and
lava wastes are all variations of midnight. It's atmospheric but monotone across a 3-hour
campaign, and it costs readability everywhere (see B1). There is no time-of-day, and no
single bright biome to give contrast to the darkness the art direction is built on.
**Recommendation:** one or two zones deliberately lit differently (dawn over the
Outskirts, ember-orange ambient in the Wastes, aurora glow in the Glacier) — contrast makes
the signature darkness land harder.

### A5 🟢 Cavern landmark reads as a placeholder
The tall pale humanoid silhouette in the Crystal Caverns midground looks like an
untextured placeholder against the finished crystal work around it — first-time players
will assume a sprite failed to load.
**Recommendation:** give it interior detail/glow consistent with the zone, or remove it.

---

## B. UI / UX

### B1 🔴 World-space text is unreadable
Monster name labels, NPC names, and portal labels ("Village Outskirts", "Sealed by ash")
are ~7px low-contrast gray on dark backgrounds. In the hub — a room whose entire gameplay
is "find the right NPC" — the names are effectively invisible. I could not tell quest
givers from shopkeepers without walking into everyone.
**Recommendation:** bigger labels with a dark backing pill on proximity; per-role icons
over NPC heads (anvil, bag, book, 🗺) always visible, not just the quest `!`.

### B2 🔴 The quest tracker buries the main story
Seven-plus entries sit in the tracker at once — the active story quest plus every
available "! Talk to X" guild side-quest, all styled identically. The single most
important line in the game ("what do I do next?") has no visual priority. New players see
a wall of "Talk to Elder Mira / Seer Vesper / Scholar Aldric / Guard Tomlin…" before
they've fought a single monster.
**Recommendation:** tracked-active quest pinned on top with progress; available-but-
unaccepted quests collapsed to a single "N new quests in Aethon City" line. Stagger the
guild side-quest unlock levels so they don't all pop at once.

### B3 🟡 No pause, and settings live in the HUD
Music/SFX sliders and the reduced-motion checkbox permanently occupy the top HUD bar next
to your XP, and there is no pause key and no settings/menu screen at all (map and dialogs
freeze the sim as a side effect, but nothing says so).
**Recommendation:** Esc → pause menu (resume / settings / how-to-play / quit-to-title),
move audio + RM there, keep the HUD for play state only.

### B4 🟡 The skill "tree" is a flat list
`SKN` has real structure — three schools, prerequisites, capstones, an infinite sink —
but renders as a uniform vertical list where locked, unaffordable, and prerequisite-
missing nodes all look the same shade of gray. The game's build system, one of its best
features, looks like a settings list.
**Recommendation:** three labeled school columns with connector lines (fire/frost/arcane
color coding already exists in the spell palette); show "requires Fireball" on locked
nodes.

### B5 🟡 Inventory communicates almost nothing
Bag tiles are bare emoji — no rarity border on the tile, no hover tooltip; gear stats
appear only in the log line when equipped. For a loot game with 6 rarity tiers, sockets,
and artifacts, item inspection is essentially blind. (Rarity color exists in the game —
it's just not on the tiles.)
**Recommendation:** rarity-colored tile borders, hover/tap tooltip card (name, stats,
sockets, power text, sell value), and a compare line vs. equipped.

### B6 🟡 One log to rule them all
Damage taken, loot, tutorials, achievement unlocks, and quest updates all fight for a
4-line strip at the bottom — and long lines clip mid-sentence at the strip's edge (visible
in normal play). Important beats (achievement, legendary) scroll away in seconds.
**Recommendation:** route achievements/quest-state changes to transient toasts top-right;
keep the log for combat/loot; make it expandable on hover.

### B7 🟢 Boss banners leak across zones
`bossAlertT`/rift banners aren't reset in `loadZone`, so leaving an arena mid-banner
carries "⚠ BOSS: Echo of Veyra" into Aethon City. Verified in play.
**Recommendation:** zero the banner timers in `loadZone`/`endRift`.

### B8 🟢 Rift HUD overlaps the control hints
The depth/wave panel draws over the top-left "move/jump/dash" hint bar during rift runs.

---

## C. Combat & moment-to-moment gameplay

### C1 🔴 Core combat is a stationary DPS check
Click (or Q) auto-targets the nearest enemy and the projectile flies to it — no aim, no
lead, no positioning requirement. Most enemies walk at you and deal contact damage, so
optimal play against 80% of the roster is: stand on a ledge they can't path to, spam
Arcane Bolt every 0.7s, drink a potion if something leaks. Dash, the best-feeling verb in
the game, is rarely *required* outside boss abilities. The systems layer (crits, runes,
burns) is deep, but the hands are idle.
**Recommendation (pick a direction):** more enemies that punish standing still (leapers,
lobbers like the raid arms, aura enemies that must be kited), or a manual-aim bonus
(free-aimed shots deal +25%), or short cast movement penalties that create rhythm.
The raid proves the engine can do interesting fights — pull those patterns down into the
regular zones.

### C2 🔴 Zone entrances are not safe
Monsters patrol and spawn directly on the entry portal (a slime was hitting me the moment
I stepped into Village Outskirts), and in teleport arenas the boss can walk to and camp
the spawn point — Veyra met me *at the door* of the Hollow Rift. Dying there respawns you
into the same trap.
**Recommendation:** enforce a no-spawn/no-aggro radius (~150px) around portals and grant
1s of entry i-frames; anchor arena bosses to arena center until first player action.

### C3 🟡 Zones are single-screen boxes with no exploration
Every zone is ~1300px wide — one-and-a-bit screens of floating platforms, one layout,
nothing hidden. There are no secrets, no chests, no locked doors, no reason to platform
except to reach a monster. For a "platformer RPG," the platforming carries zero content.
**Recommendation:** cheapest high-value additions — one hidden treasure spot per zone
(behind a foreground silhouette, above the visible ceiling), rare wandering elites, and
one platforming challenge per zone with a guaranteed chest.

### C4 🟡 Ten enemy types across a 3-hour campaign
Six Act 1 + four Act 2 monsters, and the Rift/bounties reuse the same pool. Elites are
stat multipliers + one affix. By mid-Act-1 you have seen every behavior the regular game
will ever show you; only bosses add new patterns.
**Recommendation:** one new behavior archetype per act beats five reskins: a shielded
enemy (must dash through / hit from behind), a summoner, a suicide-bomber with a visible
fuse (the `explosive` affix already half-exists — promote it to a real telegraphed enemy).

### C5 🟡 The relic hunts are the campaign's low point
Four of Act 1's fifteen quests (q7/q9/q11/q13) — and more in Act 2 — are "re-farm the zone
you just cleared until a 1% drop lands," with pity only ramping after 75 dry kills. The
fiction ("one slime in a hundred") is honest, but it's still 4× re-running finished
content with zero new stimulus. This is where players quit.
**Recommendation:** keep the fantasy, change the delivery — relic quests spawn a visible
★ rare carrier every ~20 kills (guaranteed drop), or pity starts at 25 and the drop chance
displays ("the rift-song grows louder…"). Halving the plain kill counts (15–25 per story
quest) is also worth testing; the sim says no wall exceeds ~25 min, but minutes of
repeated identical kills *feel* longer than the timer says.

### C6 🟢 Difficulty edges are ragged at zone entry levels
At the zone's own `req` level, ranged skeletons hit for ~10% of your HP per arrow while
slimes in the previous zone hit for 2% — spikes come from monster type, not zone tier.
Worth a tuning pass keyed on "damage as % of at-level max HP."

---

## D. Systems & endgame

### D1 🟡 The Endless Rift is one room forever
The flagship retention mode plays out in the identical pink arena with identical geometry
at every depth, and boss Echoes are straight reuses of campaign bosses. The *systems*
(curse draft, shards, daily) are excellent; the *stage* undermines them — depth 40 looks
exactly like depth 1.
**Recommendation:** cheap wins — rotate the arena through the existing zone palettes/props
per 5-depth band (the theming layer already exists via `zoneTheme`), vary platform layouts
from 3–4 fixed sets, give deep Echoes one new ability rider each ("Echo of Veyra, Frenzied").

### D2 🟡 The Codex teaches nothing until it's full
0/19 discovered renders as nineteen identical "???" rows — no grouping, no hint of what
you're missing or where. Collection UIs motivate by *shape of the gap*.
**Recommendation:** group by zone with zone headers, show silhouette + zone name for
undiscovered entries, and a per-zone "3/4 recorded" count.

### D3 🟢 Artifact/rune discovery is invisible until it happens
Nothing in the game tells you artifacts exist (1% boss drop) or that gear can be socketed
until you stumble into the Forge UI. One line from Bren on first gear upgrade and one from
the first boss kill ("legends speak of what the great bosses hoard…") would set the chase.

### D4 🟢 Two-slot potion hotbar, four potion types by Act 2
Apothecary potency scaling + ward scrolls + two hotbar slots means micromanaging assigns
mid-fight later on. Consider 3 slots at a city Apothecary level, as a district perk.

---

## E. Story & narrative delivery

### E1 🟡 The engine has cutscenes; the story only uses them once
A full canvas cutscene system exists (`drawS0`…, typewriter, skip) and plays exactly once,
before the title. Act 1's climax — sealing the rift, the thing the entire game is named
for — resolves as a dialog box. So does Act 2, and so does the raid against the true
villain. The biggest narrative payoffs get the smallest presentation in the game.
**Recommendation:** three short cutscenes — post-q15 (the door closes), post-q22, and a
true ending after Zal'Guroth — reusing the existing scene engine and zone art. Even 20
seconds each transforms the endings.

### E2 🟡 The finale's stakes are contradicted by the door
q15 is sold hard as "a one-way step into the dark — I cannot promise to bring you back."
You can walk out of the Hollow Rift through an edge portal at any time, including mid-
fight, with no acknowledgment. The lock the whole act builds toward is fiction the
mechanics immediately deny.
**Recommendation:** either seal the exit until Veyra falls (with a "retreat = quest
resets" confirm), or have Vesper's dialog own the retreat ("so you fled — the door held,
barely. Ready to finish it?").

### E3 🟢 Act 2 and the raid rush their villains
Veyra gets 15 quests of build-up through four zones of evidence; Malachar gets 7 quests
and Zal'Guroth ("the Voice behind both") is introduced and killed inside a single quest.
The retroactive "it was the Voice all along" reveal deserves seeding — one line each from
the goblin prisoners (already canon: "the Hollow Voice commands"), the Lich, and Malachar
would make the raid reveal feel planned rather than appended.

### E4 🟢 Side-quest pacing dumps
All guild-introduction quests unlock in a burst (see B2) and several NPCs stand unmarked
in the hub until then. Spreading `n1`–`n5` across levels 3/6/9/12/16 fixes B2's pile-up
and gives each hub return one new thing.

---

## F. Audio (code review — needs a human ear-check)

### F1 🟡 Procedural music risk: 3 hours of 2-bar loops
Zone tracks are short generative patterns (bells, tritone tension chords, wind beds).
Clever engineering, but the hub loop will play for *hours* of cumulative city time — and
generative-sparse can drift into "randomly beeping" fatigue. This can't be judged
headless: needs a deliberate listening pass per zone (10 min each).
**Recommendation:** add long-cycle variation (intensity ramps every ~90s, instrument
swap-ins keyed to `gTime`), and a combat-intensity layer that fades in while monsters
aggro — the Web Audio graph already supports gain automation.

### F2 🟢 No audio feedback for some high-value moments
Rune socketing, city district raises, and codex unlocks are silent or share generic SFX
while lesser events (bolt cast) have dedicated sounds. Cheap wins for perceived polish.

---

## Suggested priority (if approved wholesale)

| Order | Items | Why |
|---|---|---|
| 1 | A1, B1, B2 | Every player, every session, first five minutes |
| 2 | C1, C2, C5 | The core loop and its worst friction |
| 3 | E1, E2, D1 | Payoffs: endings that land, an endgame that varies |
| 4 | B3–B6, C3, C4, D2 | Sustained-play quality |
| 5 | A2–A5, remaining 🟢 | Polish pass |

*Verification notes: playthrough was scripted headless Chromium (1440×900) over the real
`index.html` — every zone, boss arena, rift depth 1/25 + curse draft, and all eight hub
service dialogs; combat observed in zones 1–4; findings B7/B8/C2 reproduced live.
Screenshots available on request.*
