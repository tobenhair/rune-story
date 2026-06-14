const { test, expect } = require('./fixtures');

test.describe('Gear, loot & forge', () => {
  test('six rarity tiers from Common to Artifact', async ({ game }) => {
    const names = await game.evaluate(() => RARS.map(r => r.n));
    expect(names).toEqual(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact']);
  });

  test('rollGear produces a valid weapon or armor with stats', async ({ game }) => {
    const ok = await game.evaluate(() => {
      for (let i = 0; i < 40; i++) {
        const g = rollGear(2, false);
        if (g.slot === 'weapon' && !(g.mag > 0)) return false;
        if (g.slot === 'armor' && !(g.def > 0 && g.hp > 0)) return false;
        if (g.rar < 0 || g.rar > 4) return false;
      }
      return true;
    });
    expect(ok).toBe(true);
  });

  test('boss drops are always rare or better; normal drops can be common', async ({ game }) => {
    const r = await game.evaluate(() => ({
      bossLow: rollRarity(true), bossHigh: T.withRandom([0.99], () => rollRarity(true)),
      normalLow: T.withRandom([0], () => rollRarity(false)),
    }));
    expect(r.bossLow).toBeGreaterThanOrEqual(2);
    expect(r.bossHigh).toBe(4);
    expect(r.normalLow).toBe(0);
  });

  test('the q14 reward staff is a fixed Legendary weapon', async ({ game }) => {
    const s = await game.evaluate(() => GEAR_FIXED.oracle_staff);
    expect(s.rar).toBe(4);
    expect(s.slot).toBe('weapon');
    expect(s.mag).toBe(30);
  });

  test('artifacts carry a unique power described in POW', async ({ game }) => {
    const r = await game.evaluate(() => {
      const a = rollArtifact();
      return { rar: a.rar, hasPow: !!a.pow, known: Object.keys(POW), powOk: POW.hasOwnProperty(a.pow) };
    });
    expect(r.rar).toBe(5);
    expect(r.hasPow).toBe(true);
    expect(r.powOk).toBe(true);
    expect(r.known.sort()).toEqual(['haste', 'lifesteal', 'manaregen', 'thorns']);
  });

  test('addGear auto-equips an empty slot then bags duplicates', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: null, armor: null }; G.inventory = [];
      addGear({ slot: 'weapon', rar: 1, n: 'Test Wand', e: '🪄', mag: 9 });
      const equipped = G.equipment.weapon && G.equipment.weapon.n;
      addGear({ slot: 'weapon', rar: 1, n: 'Second Wand', e: '🪄', mag: 9 });
      return { equipped, bagged: G.inventory.some(x => x && x.g && x.g.n === 'Second Wand') };
    });
    expect(r.equipped).toBe('Test Wand');
    expect(r.bagged).toBe(true);
  });

  test('equipping armor raises max HP; unequipping restores it', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: null, armor: null }; G.maxHp = 100; G.hp = 100;
      G.inventory = [{ g: { slot: 'armor', rar: 2, n: 'Test Robe', e: '👘', def: 4, hp: 40 }, qty: 1 }];
      equipGear(0); const withArmor = G.maxHp;
      unequipGear('armor'); const without = G.maxHp;
      return { withArmor, without };
    });
    expect(r.withArmor).toBe(140);
    expect(r.without).toBe(100);
  });

  test('sell values reflect the 50% reduction', async ({ game }) => {
    const r = await game.evaluate(() => ({
      gear: sellValue({ g: { slot: 'weapon', rar: 0, mag: 10 } }),
      material: sellValue({ id: 'slime_goo', qty: 1 }),
      shopResell: sellValue({ id: 'health_potion', qty: 1 }),
    }));
    expect(r.gear).toBe(7);          // round(10*3 * 0.45 * 0.5)
    expect(r.material).toBe(1);      // floor(2 / 2)
    expect(r.shopResell).toBe(5);    // floor(20 / 4)
  });

  test('forge upgrades a common item one rarity tier', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.gold = 1000; G.equipment = { weapon: { slot: 'weapon', rar: 0, bn: 'Wand', n: 'Wand', e: '🪄', mag: 8 }, armor: null };
      G.inventory = [{ id: 'slime_goo', qty: 5 }];
      const before = G.equipment.weapon.rar;
      upgradeGear('weapon');
      return { before, after: G.equipment.weapon.rar, gold: G.gold };
    });
    expect(r.before).toBe(0);
    expect(r.after).toBe(1);
    expect(r.gold).toBe(950); // UPG[0].gold = 50
  });

  test('Legendary and Artifact gear cannot be forged further', async ({ game }) => {
    const r = await game.evaluate(() => ({
      legendary: canUpg({ rar: 4 }), artifact: canUpg({ rar: 5 }), common: !!canUpg({ rar: 0 }),
    }));
    expect(r.legendary).toBeNull();
    expect(r.artifact).toBeNull();
    expect(r.common).toBe(true);
  });
});
