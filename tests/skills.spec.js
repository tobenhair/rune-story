const { test, expect } = require('./fixtures');

test.describe('Skill tree', () => {
  test('learning a skill spends a point and enforces prerequisites', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.skillPoints = 3;
      learnSk('fb');          // requires Arcane Mastery first → should be blocked
      const blocked = !USK.has('fb');
      learnSk('am');          // costs 1
      learnSk('fb');          // costs 2, now allowed → unlocks Fireball spell slot
      return { blocked, am: USK.has('am'), fb: USK.has('fb'), fireball: G.spells[1], sp: G.skillPoints };
    });
    expect(r.blocked).toBe(true);
    expect(r.am).toBe(true);
    expect(r.fb).toBe(true);
    expect(r.fireball).toBe(true);
    expect(r.sp).toBe(0); // 3 - 1 - 2
  });

  test('passive skills raise the right stats', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.skillPoints = 2; const mp0 = G.maxMp, hp0 = G.maxHp;
      learnSk('mf'); // +30 max MP
      learnSk('vt'); // +60 max HP
      return { dMp: G.maxMp - mp0, dHp: G.maxHp - hp0 };
    });
    expect(r.dMp).toBe(30);
    expect(r.dHp).toBe(60);
  });

  test('cannot learn a skill without enough points', async ({ game }) => {
    const learned = await game.evaluate(() => { G.skillPoints = 0; learnSk('am'); return USK.has('am'); });
    expect(learned).toBe(false);
  });

  test('Gold Sense boosts kill gold by 40%', async ({ game }) => {
    const r = await game.evaluate(() => {
      USK.add('gs'); T.clear(); T.resetPlayer(); G.zone = 1; CZ = ZD[1]; G.gold = 0;
      const m = mkMon('golem', PL.x + 500, 260); m.gold = 10; m.elite = false;
      // Force every RNG call to 0 so the gold roll is m.gold + floor(0*gold) = 10, then ×1.4
      const o = Math.random; Math.random = () => 0;
      try { killM(m); } finally { Math.random = o; }
      collectAllDrops(); // gold drops on the ground now → sweep it up
      return G.gold;
    });
    expect(r).toBe(14); // floor(10 * 1.4)
  });
});
