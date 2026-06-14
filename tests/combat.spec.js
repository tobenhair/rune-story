const { test, expect } = require('./fixtures');

test.describe('Combat & spells', () => {
  test('spell mana costs reflect the rebalance', async ({ game }) => {
    const mp = await game.evaluate(() => SPELLS.map(s => s.mp));
    expect(mp).toEqual([7, 24, 16, 27]); // Bolt, Fireball, Ice, Mana Shield
  });

  test('casting deducts mana and spawns a projectile', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.mp = 80;
      fireAt({ x: PL.x + 120, y: PL.y }, 0); // Arcane Bolt
      return { mp: G.mp, projs: projs.length };
    });
    expect(r.mp).toBe(73); // 80 - 7
    expect(r.projs).toBe(1);
  });

  test('insufficient mana blocks a cast', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.mp = 3;
      fireAt({ x: PL.x + 120, y: PL.y }, 0);
      return { mp: G.mp, projs: projs.length };
    });
    expect(r.mp).toBe(3);
    expect(r.projs).toBe(0);
  });

  test('unlearned spells cannot be cast', async ({ game }) => {
    const projs = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.mp = 80; mons.push(mkMon('slime', PL.x + 80, PL.y));
      castSpell(1); // Fireball not yet learned
      return projs.length;
    });
    expect(projs).toBe(0);
  });

  test('a player projectile damages a monster', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer();
      const m = mkMon('golem', PL.x + 300, 260); m.hp = 500; m.mhp = 500; m.spd = 0; m.vx = 0; mons.push(m);
      projs.push({ x: m.x, y: m.y, vx: 0, vy: 0, dmg: 50, proj: 'bolt', c: '#fff', slow: false, life: 1, pw: 8, ph: 8 });
      update(0.016);
      return 500 - m.hp;
    });
    expect(r).toBe(50); // no skill modifiers active
  });

  test('Arcane Mastery adds +20% spell damage', async ({ game }) => {
    const dealt = await game.evaluate(() => {
      USK.add('am'); T.clear(); T.resetPlayer();
      const m = mkMon('golem', PL.x + 300, 260); m.hp = 1000; m.mhp = 1000; m.spd = 0; m.vx = 0; mons.push(m);
      projs.push({ x: m.x, y: m.y, vx: 0, vy: 0, dmg: 100, proj: 'bolt', c: '#fff', slow: false, life: 1, pw: 8, ph: 8 });
      update(0.016);
      return 1000 - m.hp;
    });
    expect(dealt).toBe(120); // floor(100 * 1.2)
  });

  test('Mana Shield activates a damage-absorbing shield', async ({ game }) => {
    const shield = await game.evaluate(() => { T.clear(); G.mp = 80; castSpell(3); return G.shield; });
    expect(shield).toBe(true);
  });

  test('artifact powers are detected via hasPow when equipped', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment.weapon = { slot: 'weapon', rar: 5, mag: 42, pow: 'lifesteal' };
      const before = spellCd(1);
      G.equipment.weapon = { slot: 'weapon', rar: 5, mag: 36, pow: 'haste' };
      return { lifesteal: hasPow('lifesteal'), haste: hasPow('haste'), cdBase: before, cdHaste: spellCd(1) };
    });
    expect(r.lifesteal).toBe(false); // weapon was swapped to haste
    expect(r.haste).toBe(true);
    expect(r.cdHaste).toBeCloseTo(+(r.cdBase * 0.7).toFixed(2), 5); // haste cuts cooldowns 30%
  });
});
