const { test, expect } = require('./fixtures');

test.describe('Bosses & enrage', () => {
  test('five bosses including the scaled-up Hollow Oracle', async ({ game }) => {
    const r = await game.evaluate(() => ({
      count: BOSS_DEFS.length,
      zones: BOSS_DEFS.map(b => b.zone),
      gold: BOSS_DEFS.map(b => b.gold),
      oracle: BOSS_DEFS.find(b => b.t === 'hollow_oracle'),
    }));
    expect(r.count).toBe(5);
    expect(r.zones).toEqual([1, 2, 3, 4, 5]);
    expect(r.gold).toEqual([25, 50, 100, 150, 500]); // halved boss gold
    expect(r.oracle.hp).toBe(5000);
    expect(r.oracle.scale).toBe(5.2);
  });

  test('spawnBoss creates a boss with fresh enrage state', async ({ game }) => {
    const r = await game.evaluate(() => {
      mons.length = 0; G.zone = 1; CZ = ZD[1]; spawnBoss(1);
      const b = mons.find(m => m.boss);
      return { t: b.t, fightT: b.fightT, enraged: b.enraged, bscale: b.bscale };
    });
    expect(r.t).toBe('slime_sov');
    expect(r.fightT).toBe(0);
    expect(r.enraged).toBe(false);
    expect(r.bscale).toBe(4);
  });

  test('enrageMul stays 1 early, ramps, and caps at ENRAGE_MAX', async ({ game }) => {
    const r = await game.evaluate(() => ({
      early: enrageMul({ boss: true, fightT: 0 }),
      ramp: enrageMul({ boss: true, fightT: ENRAGE_AFTER + 10 }),
      expectRamp: 1 + 10 * ENRAGE_RATE,
      capped: enrageMul({ boss: true, fightT: 1e9 }),
      max: ENRAGE_MAX,
      nonBoss: enrageMul({ boss: false, fightT: 1e9 }),
    }));
    expect(r.early).toBe(1);
    expect(r.ramp).toBeCloseTo(r.expectRamp, 9);
    expect(r.capped).toBe(r.max);
    expect(r.nonBoss).toBe(1);
  });

  test('a long fight enrages the boss and scales its ability damage', async ({ game }) => {
    const r = await game.evaluate(() => {
      mons.length = 0; projs.length = 0; G.zone = 1; CZ = ZD[1]; T.resetPlayer();
      spawnBoss(1); const b = mons.find(m => m.boss); b.x = PL.x + 60;
      // Toxic Spit base damage (fixed 22, no RNG term)
      b.a1T = 0; b.fightT = 0; projs.length = 0; updateBossAbilities(b, 0.016, 50, 50);
      const baseDmg = projs.find(p => p.proj === 'toxic').dmg;
      // Past the enrage threshold → damage scales up and the boss is flagged
      b.a1T = 0; b.fightT = 1e9; projs.length = 0; updateBossAbilities(b, 0.016, 50, 50);
      const rageDmg = projs.find(p => p.proj === 'toxic').dmg;
      return { baseDmg, rageDmg, enraged: b.enraged, max: ENRAGE_MAX };
    });
    expect(r.baseDmg).toBe(22);
    expect(r.rageDmg).toBe(Math.round(22 * r.max));
    expect(r.enraged).toBe(true);
  });

  test('boss kills are recorded in G.kills (for boss-kill quests)', async ({ game }) => {
    const kills = await game.evaluate(() => {
      mons.length = 0; G.zone = 1; CZ = ZD[1]; G.kills = {}; G.equipment = { weapon: null, armor: null }; G.inventory = [];
      spawnBoss(1); const b = mons.find(m => m.boss); killM(b);
      return G.kills.slime_sov;
    });
    expect(kills).toBe(1);
  });

  test('the final boss drops a guaranteed Artifact', async ({ game }) => {
    const hasArtifact = await game.evaluate(() => {
      mons.length = 0; G.zone = 5; CZ = ZD[5]; G.equipment = { weapon: null, armor: null }; G.inventory = [];
      spawnBoss(5); const b = mons.find(m => m.t === 'hollow_oracle'); killM(b);
      const all = [G.equipment.weapon, G.equipment.armor, ...G.inventory.map(x => x && x.g)].filter(Boolean);
      return all.some(g => g.rar === 5);
    });
    expect(hasArtifact).toBe(true);
  });
});
