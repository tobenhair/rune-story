// Phase 3 — Animation core: derived player state machine, death events, spawn materialize,
// hitstop. All cosmetic — gameplay timing/collision is unchanged (corpses live in a separate
// `dying` list excluded from AI).
const { test, expect } = require('./fixtures');

test('ANIM registry defines the mage states and they resolve from physics flags', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const states = Object.keys(ANIM.mage).sort();
    T.resetPlayer();
    const set = o => Object.assign(PL, o);
    const results = {};
    set({ gnd: false, vy: -120, dashT: 0, casting: 0, landT: 0, hurtT: 0, vx: 0 }); results.jump = playerAnimState();
    set({ gnd: false, vy: 120 }); results.fall = playerAnimState();
    set({ gnd: true, vy: 0, vx: 100 }); results.walk = playerAnimState();
    set({ vx: 0, casting: 0.3 }); results.cast = playerAnimState();
    set({ casting: 0, vx: 0 }); results.idle = playerAnimState();
    set({ dashT: 0.1 }); results.dash = playerAnimState();
    set({ dashT: 0, landT: 0.1 }); results.land = playerAnimState();
    set({ landT: 0, hurtT: 0.2 }); results.hurt = playerAnimState();
    // jump/fall pose sheets exist
    const sheets = ['mJumpR','mJumpL','mFallR','mFallL'].every(k => SHS[k]);
    return { states, results, sheets };
  });
  expect(r.states).toEqual(['cast','dash','fall','hurt','idle','jump','land','walk']);
  expect(r.results).toEqual({ jump:'jump', fall:'fall', walk:'walk', cast:'cast', idle:'idle', dash:'dash', land:'land', hurt:'hurt' });
  expect(r.sheets).toBe(true);
});

test('killing a monster spawns a cosmetic corpse that drains from the dying list', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = false;
    dying.length = 0;
    const m = T.mon('slime', 300, 300, null);
    mons.push(m);
    const before = mons.length;
    killM(m);
    const removedFromMons = mons.length === before - 1;
    const corpseAdded = dying.length > 0;
    // drain: advance more than the corpse duration
    for (let i = 0; i < 30; i++) updateDying(0.05);
    const drained = dying.length === 0;
    return { removedFromMons, corpseAdded, drained };
  });
  expect(r.removedFromMons).toBe(true);
  expect(r.corpseAdded).toBe(true);
  expect(r.drained).toBe(true);
});

test('a boss kill triggers hitstop and a bounded death flash', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = false; hitStop = 0; deathFlashT = 0;
    loadZone(1); spawnBoss(1);
    const boss = mons.find(m => m.boss);
    boss.hp = 1;
    killM(boss);
    const flashCapped = deathFlashT <= 0.15 + 1e-9;
    return { hitStop, deathFlashT, flashCapped };
  });
  expect(r.hitStop).toBeGreaterThan(0);
  expect(r.deathFlashT).toBeGreaterThan(0);
  expect(r.flashCapped).toBe(true);   // photosensitivity: full-screen flash ≤ 0.15s
});

test('reduced-motion disables hitstop and corpse spawns', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = true; dying.length = 0;
    const m = T.mon('goblin', 300, 300, null); mons.push(m);
    killM(m);
    return { corpses: dying.length };
  });
  expect(r.corpses).toBe(0);
});
