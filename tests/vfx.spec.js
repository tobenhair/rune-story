// Phase 4 — combat VFX: animated projectile sheets, particle budget, muzzle rings, telegraph
// timers, enrage edge-pulse. All cosmetic; the underlying attack timers/damage are unchanged.
const { test, expect } = require('./fixtures');

test('core projectiles bake as animated 4-frame sheets', async ({ game: page }) => {
  const r = await page.evaluate(() => ({
    bolt: SHS.bolt.width / 8, fireball: SHS.fireball.width / 10, ice: SHS.ice.width / 10,
    curseOrb: SHS.curseOrb.width / 10, toxic: SHS.toxic.width / 12,
  }));
  expect(r).toEqual({ bolt: 4, fireball: 4, ice: 4, curseOrb: 4, toxic: 4 });
});

test('the particle budget caps live particles at 400 (oldest-first)', async ({ game: page }) => {
  const n = await page.evaluate(() => {
    G.reduceMotion = true; T.clear();
    for (let i = 0; i < 600; i++) parts.push({ x: 0, y: 0, vx: 0, vy: 0, life: 5, c: '#fff', r: 1 });
    update(0.001);
    return parts.length;
  });
  expect(n).toBeLessThanOrEqual(400);
});

test('casting emits a muzzle ring; the projectile still fires', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = false; T.clear(); rings.length = 0; G.mp = 999;
    const m = T.mon('slime', 260, 300, null); mons.push(m);
    PL.x = 200; PL.y = 300;
    fireAt(m, 0);                 // Arcane Bolt
    return { rings: rings.length, projs: projs.length };
  });
  expect(r.rings).toBeGreaterThan(0);
  expect(r.projs).toBe(1);
});

test('a boss enrage fires the bounded red edge-pulse', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = false; enrageFlashT = 0;
    loadZone(1); spawnBoss(1);
    const boss = mons.find(m => m.boss);
    boss.fightT = (boss.enrageAfter || 35) + 1;   // push past the enrage threshold
    updateBossAbilities(boss, 0.1, 10, 10);
    return { enraged: boss.enraged, flash: enrageFlashT };
  });
  expect(r.enraged).toBe(true);
  expect(r.flash).toBeGreaterThan(0);
});

test('reduced-motion suppresses trails, rings and muzzle particles', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = true; T.clear(); rings.length = 0; parts.length = 0; G.mp = 999;
    const m = T.mon('slime', 260, 300, null); mons.push(m);
    PL.x = 200; PL.y = 300;
    fireAt(m, 0);
    return { rings: rings.length, parts: parts.length };
  });
  expect(r.rings).toBe(0);
  expect(r.parts).toBe(0);
});
