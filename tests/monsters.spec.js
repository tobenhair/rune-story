const { test, expect } = require('./fixtures');

test.describe('Monsters, loot & elite affixes', () => {
  test('monster stats reflect the rebalance (gold halved, damage raised)', async ({ game }) => {
    const m = await game.evaluate(() => MDEF);
    expect(m.slime.gold).toBe(1);
    expect(m.golem.gold).toBe(5);
    expect([m.slime.mn, m.slime.mx]).toEqual([4, 9]);
    expect([m.golem.mn, m.golem.mx]).toEqual([23, 38]);
  });

  test('each combat zone signature monster drops a 1% rare relic', async ({ game }) => {
    const has = await game.evaluate(() => {
      const drop = (t, id) => MDEF[t].loot.some(l => l[0] === id && l[1] === 0.01);
      return drop('slime', 'rift_seed') && drop('bat', 'wither_heart') && drop('golem', 'resonant_core') && drop('skeleton', 'rift_sigil');
    });
    expect(has).toBe(true);
  });

  test('mkMon rolls elites with affixes and a tripled HP pool', async ({ game }) => {
    const e = await game.evaluate(() => {
      const base = MDEF.goblin.hp, m = T.withRandom([0.0, 0.0, 0.9, 0.5], () => mkMon('goblin', 0, 0));
      return { base, elite: m.elite, affix: m.affix, hp: m.hp, mhp: m.mhp };
    });
    expect(e.elite).toBe(true);
    expect(e.affix).toBe('frenzied');
    expect(e.hp).toBe(e.base * 3);
    expect(e.mhp).toBe(e.base * 3);
  });

  test('all four affixes can roll and tag the monster', async ({ game }) => {
    const out = await game.evaluate(() => ['frenzied', 'vampiric', 'explosive', 'armored'].map(a => {
      const m = T.mon('goblin', 0, 0, a);
      return { affix: m.affix, named: m.n.startsWith('★ ') };
    }));
    expect(out.map(o => o.affix)).toEqual(['frenzied', 'vampiric', 'explosive', 'armored']);
    expect(out.every(o => o.named)).toBe(true);
  });

  test('frenzied moves 1.5× faster', async ({ game }) => {
    const r = await game.evaluate(() => {
      const base = MDEF.goblin.spd, m = T.mon('goblin', 0, 0, 'frenzied');
      return { base, spd: m.spd };
    });
    expect(r.spd).toBeCloseTo(r.base * 1.5, 5);
  });

  test('vampiric elite heals from the damage it deals', async ({ game }) => {
    const healed = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.hp = 500; G.maxHp = 500; PL.inv = 0;
      const m = T.mon('goblin', PL.x, PL.y, 'vampiric'); m.hp = 10; m.mhp = 50; mons.push(m);
      update(0.05);
      return m.hp;
    });
    expect(healed).toBeGreaterThan(10);
  });

  test('armored elite takes ~40% less spell damage', async ({ game }) => {
    const dealt = await game.evaluate(() => {
      T.clear(); T.resetPlayer();
      const m = T.mon('golem', PL.x + 300, 260, 'armored'); m.hp = 1000; m.mhp = 1000; m.spd = 0; m.vx = 0; mons.push(m);
      projs.push({ x: m.x, y: m.y, vx: 0, vy: 0, dmg: 100, proj: 'bolt', c: '#fff', slow: false, life: 1, pw: 8, ph: 8 });
      update(0.016);
      return 1000 - m.hp;
    });
    expect(dealt).toBe(60); // ceil(100 * 0.6), no skill modifiers
  });

  test('gear drops at 1% for both normal and elite kills (elites no longer guaranteed)', async ({ game }) => {
    const r = await game.evaluate(() => {
      const hasGear = () => !!(G.equipment.weapon || G.equipment.armor || G.inventory.some(x => x && x.g));
      const run = (elite, rnd) => {
        T.clear(); T.resetPlayer(); G.zone = 1; CZ = ZD[1]; G.hp = 999; G.maxHp = 999;
        G.equipment = { weapon: null, armor: null }; G.inventory = [];
        const m = elite ? T.mon('goblin', PL.x + 400, 260, 'frenzied') : mkMon('goblin', PL.x + 400, 260);
        const o = Math.random; Math.random = () => rnd;
        try { killM(m); } finally { Math.random = o; }
        return hasGear();
      };
      return { eliteNo: run(true, 0.5), normalNo: run(false, 0.5), eliteYes: run(true, 0), normalYes: run(false, 0) };
    });
    expect(r.eliteNo).toBe(false);   // 0.5 ≥ 0.01 → no gear, even from an elite
    expect(r.normalNo).toBe(false);
    expect(r.eliteYes).toBe(true);   // 0 < 0.01 → gear drops
    expect(r.normalYes).toBe(true);
  });

  test('explosive elite detonates on death, damaging a nearby player', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 1; CZ = ZD[1]; G.hp = 500; G.maxHp = 500; G.shield = false;
      G.equipment = { weapon: null, armor: null };
      const m = T.mon('goblin', PL.x, PL.y, 'explosive'); m.x = PL.x; m.y = PL.y; mons.push(m); // exact overlap
      PL.inv = 0; const before = G.hp;
      const o = Math.random; Math.random = () => 0; try { killM(m); } finally { Math.random = o; }
      return { dropped: before - G.hp, gone: !mons.includes(m) };
    });
    expect(r.dropped).toBeGreaterThan(0);
    expect(r.gone).toBe(true);
  });
});
