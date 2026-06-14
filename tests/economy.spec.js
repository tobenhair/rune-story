const { test, expect } = require('./fixtures');

test.describe('Economy: shop, storage, hotbar, potions', () => {
  test('potion prices are doubled', async ({ game }) => {
    const p = await game.evaluate(() => ({
      health: SHOP.find(e => e.id === 'health_potion').price,
      mana: SHOP.find(e => e.id === 'mana_potion').price,
    }));
    expect(p.health).toBe(40);
    expect(p.mana).toBe(30);
  });

  test('buy, sell, and buy-back move gold correctly', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.gold = 100; G.inventory = []; G.lastSold = null;
      const price = SHOP.find(e => e.id === 'health_potion').price;
      buyItem('health_potion', price);           // -price, gain a potion
      const afterBuy = G.gold;
      const idx = G.inventory.findIndex(x => x && x.id === 'health_potion');
      const resell = sellValue({ id: 'health_potion' });
      sellItem(idx);                             // +resell, sets lastSold
      const afterSell = G.gold;
      buyBack();                                 // -lastSold.price, item returns
      return { price, resell, afterBuy, afterSell, afterBuyBack: G.gold, hasPotion: G.inventory.some(x => x && x.id === 'health_potion') };
    });
    expect(r.price).toBe(40);                     // doubled
    expect(r.resell).toBe(10);                    // floor(40 / 4)
    expect(r.afterBuy).toBe(100 - r.price);
    expect(r.afterSell).toBe(100 - r.price + r.resell);
    expect(r.afterBuyBack).toBe(100 - r.price);
    expect(r.hasPotion).toBe(true);
  });

  test("'Sell all' skips consumables and active-quest relics but sells plain materials", async ({ game }) => {
    const r = await game.evaluate(() => {
      G.gold = 0; G.questStates = { q7: 'active' }; // q7 collects rift_seed
      G.inventory = [{ id: 'rift_seed', qty: 1 }, { id: 'slime_goo', qty: 3 }, { id: 'health_potion', qty: 2 }];
      sellAll();
      const has = id => G.inventory.some(x => x && x.id === id);
      return { relic: has('rift_seed'), potion: has('health_potion'), material: has('slime_goo'), gold: G.gold };
    });
    expect(r.relic).toBe(true);
    expect(r.potion).toBe(true);
    expect(r.material).toBe(false);
    expect(r.gold).toBeGreaterThan(0);
  });

  test('storage deposits, withdraws, and expands at a doubling cost', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.storage = []; G.storageMax = 10; G.inventory = [{ id: 'bone_shard', qty: 2 }];
      const baseCost = storageCost();
      storeItem(0);
      const stored = G.storage.some(x => x && x.id === 'bone_shard');
      const bagEmpty = !G.inventory.some(Boolean);
      withdrawItem(G.storage.findIndex(x => x && x.id === 'bone_shard'));
      const backInBag = G.inventory.some(x => x && x.id === 'bone_shard');
      G.gold = 5000; expandStorage();
      return { baseCost, stored, bagEmpty, backInBag, max: G.storageMax, nextCost: storageCost() };
    });
    expect(r.baseCost).toBe(2000);
    expect(r.stored).toBe(true);
    expect(r.bagEmpty).toBe(true);
    expect(r.backInBag).toBe(true);
    expect(r.max).toBe(20);
    expect(r.nextCost).toBe(4000);
  });

  test('acquiring a potion auto-fills the hotbar and it can be used', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.hotbar = [null, null]; G.inventory = [];
      addItem('mana_potion'); // autofills slot 0
      const bound = G.hotbar[0];
      G.maxMp = 400; G.mp = 0;
      hotbarUse(0);           // uses the mana potion
      return { bound, mp: Math.round(G.mp) };
    });
    expect(r.bound).toBe('mana_potion');
    expect(r.mp).toBe(140); // 35% of 400
  });

  test('bounties demand 5× the monsters and pay 2× XP', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.level = 20; // all bounty zones unlocked
      const o = Math.random; Math.random = () => 0; // baseN = 8 → n = 40
      let b; try { b = genBounty(); } finally { Math.random = o; }
      const d = MDEF[b.t];
      return { n: b.n, xp: b.xp, expectXp: Math.round(d.xp * 8 * 0.6 * 2) };
    });
    expect(r.n).toBe(40);          // (8) × 5
    expect(r.xp).toBe(r.expectXp); // original per-kill XP formula × 2
  });

  test('health potion scales to 35% of max HP (min 50)', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.maxHp = 600; G.hp = 100; G.inventory = [{ id: 'health_potion', qty: 1 }];
      useItem('health_potion');
      return G.hp;
    });
    expect(r).toBe(310); // 100 + round(600*0.35)
  });
});
