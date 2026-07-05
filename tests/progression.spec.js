// Endgame progression (the pre-raid band): the repeatable Astral Attunement skill
// node, Greater Runes crafted from Act 2 materials at the Forge, and Emberstorm —
// the fireball splash taught by q22. Together they keep skill points, loot and the
// combat rotation moving between level ~25 and the Riftheart raid.
const { test, expect } = require('./fixtures');

test.describe('Astral Attunement (repeatable skill node)', () => {
  test('ranks cost 1, 2, 3, … and each adds +4% spell damage', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.attune = 0; G.skillPoints = 6;
      const c1 = attuneCost(); buyAttune();
      const c2 = attuneCost(); buyAttune();
      const c3 = attuneCost(); buyAttune(); // costs 3 → only 6-1-2=3 left, succeeds exactly
      const blocked = (buyAttune(), G.attune); // rank 4 costs 4, 0 SP left → refused
      return { c1, c2, c3, blocked, sp: G.skillPoints, mul: attuneMul() };
    });
    expect([r.c1, r.c2, r.c3]).toEqual([1, 2, 3]);
    expect(r.blocked).toBe(3);
    expect(r.sp).toBe(0);
    expect(r.mul).toBeCloseTo(1.12, 9);
  });

  test('attunement multiplies fireAt damage', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); USK.clear(); G.equipment = { weapon: null, armor: null };
      const m = mkMon('slime', PL.x + 100, PL.y); mons.push(m);
      const shot = () => { cds = [0, 0, 0, 0]; G.mp = 999; projs.length = 0; T.withRandom([0.5], () => fireAt(m, 0)); return projs[0].dmg; };
      G.attune = 0; const base = shot();
      G.attune = 10; const attuned = shot(); // +40%
      return { base, attuned };
    });
    expect(r.attuned).toBe(Math.floor(r.base * 1.4));
  });

  test('respec refunds the full triangle cost of all ranks', async ({ game }) => {
    const r = await game.evaluate(() => {
      USK.clear(); G.spells = [true, false, false, true];
      G.attune = 4; G.skillPoints = 0; // ranks cost 1+2+3+4 = 10
      respec();
      return { sp: G.skillPoints, attune: G.attune };
    });
    expect(r.sp).toBe(10);
    expect(r.attune).toBe(0);
  });

  test('ascension resets attunement and Emberstorm with the rest of the run', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.kills.hollow_oracle = 1; META.asc = 0; META.echoes = 0;
      G.attune = 5; G.emberstorm = true;
      ascend(); ascend(); // two-click confirm
      return { attune: G.attune, emberstorm: G.emberstorm, asc: META.asc };
    });
    expect(r.asc).toBe(1);
    expect(r.attune).toBe(0);
    expect(r.emberstorm).toBe(false);
  });
});

test.describe('Greater Runes (Forge crafting)', () => {
  test('six greater runes exist with ~double stats, flagged and priced as endgame items', async ({ game }) => {
    const r = await game.evaluate(() => ({
      count: Object.keys(RUNES).filter(id => RUNES[id].greater).length,
      rubyMag: RUNES.rune_ruby2.mag, baseMag: RUNES.rune_ruby.mag,
      itemFlag: !!(ITEMS.rune_ruby2 && ITEMS.rune_ruby2.rune),
      recipes: Object.keys(GREATER_CRAFT).length,
      shopExcludes: Object.keys(RUNES).filter(id => !RUNES[id].greater).length === 6,
    }));
    expect(r.count).toBe(6);
    expect(r.rubyMag).toBeGreaterThanOrEqual(r.baseMag * 2);
    expect(r.itemFlag).toBe(true); // stacks/stores like a rune, excluded from bulk-sell
    expect(r.recipes).toBe(6);
    expect(r.shopExcludes).toBe(true); // buyRune shop lists only the six base runes
  });

  test('crafting consumes 2 base runes + 4 Act 2 materials + gold and yields the greater rune', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.inventory = [{ id: 'rune_ruby', qty: 2 }, { id: 'ember_chunk', qty: 5 }]; G.storage = [];
      G.gold = 5000; G.city.forge = 0;
      craftRune('rune_ruby2');
      return {
        crafted: countItemAll('rune_ruby2'), baseLeft: countItemAll('rune_ruby'),
        matLeft: countItemAll('ember_chunk'), gold: G.gold,
      };
    });
    expect(r.crafted).toBe(1);
    expect(r.baseLeft).toBe(0);
    expect(r.matLeft).toBe(1);
    expect(r.gold).toBe(5000 - 1500);
  });

  test('crafting refuses without the materials', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.inventory = [{ id: 'rune_ruby', qty: 1 }]; G.storage = []; G.gold = 99999;
      craftRune('rune_ruby2');
      return countItemAll('rune_ruby2');
    });
    expect(r).toBe(0);
  });

  test('a socketed greater rune feeds runeSum at double strength', async ({ game }) => {
    const v = await game.evaluate(() => {
      G.equipment.weapon = { slot: 'weapon', rar: 2, n: 'Test Staff', e: '🪄', mag: 20, sockets: ['rune_ruby2'] };
      G.equipment.armor = null;
      return runeSum('mag');
    });
    expect(v).toBe(15);
  });
});

test.describe('Emberstorm (taught by q22)', () => {
  test('q22 turn-in teaches Emberstorm', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.emberstorm = false; G.questStates = { q22: 'active' }; G.questProg = { q22: { kills: { ash_sage: 1 }, items: {} } };
      turnInQ('q22');
      return { learned: G.emberstorm, teach: QUESTS.find(q => q.id === 'q22').rew.teach };
    });
    expect(r.teach).toBe('emberstorm');
    expect(r.learned).toBe(true);
  });

  test('fireball hits splash 40% damage to nearby enemies', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); USK.clear(); G.emberstorm = true;
      const m1 = T.mon('golem', 500, 260, null); m1.hp = 5000; m1.mhp = 5000;
      const m2 = T.mon('golem', 560, 260, null); m2.hp = 5000; m2.mhp = 5000; // 60px away: in splash, out of the bolt's 28px hitbox
      mons.push(m1, m2);
      projs.push({ x: m1.x, y: m1.y, vx: 0, vy: 0, dmg: 100, proj: 'fireball', c: '#f09575', slow: false, life: 1, pw: 10, ph: 10 });
      const o = Math.random; Math.random = () => 0.99; // no crit
      try { update(0.016); } finally { Math.random = o; }
      return { direct: 5000 - m1.hp, splash: 5000 - m2.hp };
    });
    expect(r.direct).toBe(100);
    expect(r.splash).toBe(40);
  });

  test('without Emberstorm the same hit does not splash', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); USK.clear(); G.emberstorm = false;
      const m1 = T.mon('golem', 500, 260, null); m1.hp = 5000; m1.mhp = 5000;
      const m2 = T.mon('golem', 560, 260, null); m2.hp = 5000; m2.mhp = 5000;
      mons.push(m1, m2);
      projs.push({ x: m1.x, y: m1.y, vx: 0, vy: 0, dmg: 100, proj: 'fireball', c: '#f09575', slow: false, life: 1, pw: 10, ph: 10 });
      const o = Math.random; Math.random = () => 0.99;
      try { update(0.016); } finally { Math.random = o; }
      return 5000 - m2.hp;
    });
    expect(r).toBe(0);
  });

  test('emberstorm and attunement persist through save/load', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.emberstorm = true; G.attune = 7;
      saveGame();
      G.emberstorm = false; G.attune = 0;
      applySave(loadSave());
      return { e: G.emberstorm, a: G.attune };
    });
    expect(r.e).toBe(true);
    expect(r.a).toBe(7);
  });
});
