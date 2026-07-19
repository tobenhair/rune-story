# AstralBound tests

Playwright suite that boots `index.html` in headless Chromium and exercises the
game's real functions and state. The render loop is cancelled per test so time is
stepped deterministically via `update(dt)`.

## Running

```bash
npm install
npx playwright install --with-deps chromium   # one-time
npm test
```

Run a single domain:

```bash
npx playwright test tests/quests.spec.js
```

## Layout

- `fixtures.js` — the `game` fixture (booted page) + in-page helpers on `window.T`
  (`withRandom`, `clear`, `resetPlayer`, `mon`). Fails a test on any uncaught page error.
- `*.spec.js` — one file per domain: boot/persistence, zones, monsters & affixes,
  combat & spells, skills, gear/loot/forge, quests, economy (shop/storage/hotbar),
  bosses & enrage, movement (dash/i-frames), `display` (responsive canvas fit +
  fullscreen, world-space label pills / NPC role glyphs, quest-tracker hierarchy), and
  `coreloop` (movement-demanding enemy behaviors, safe portal entrances + boss dormancy,
  relic-hunt pity rework).

## Adding tests

When you add or change content/systems in `index.html`, add or update the matching
spec. Prefer asserting on game state via `page.evaluate`; force `Math.random` with
`T.withRandom([...], fn)` when a result would otherwise be random.
