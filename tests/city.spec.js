const { test, expect } = require('./fixtures');

// The living hub (Proposal 4): rebuild Aethon City's districts (G.city) for permanent,
// account-wide bonuses. Every effect is neutral with no districts raised.

test.describe('Living hub — Aethon City', () => {
  test('the district board is defined and starts empty', async ({ game }) => {
    const r = await game.evaluate(() => ({
      ids: CITY.map(c => c.id),
      levels: [cityLvl('sanctum'), cityLvl('forge'), cityLvl('apothecary'), cityLvl('guild'), cityLvl('vault')],
      total: cityTotal(),
      townNpc: ZD[0].npcs.some(n => n.town),
    }));
    expect(r.ids).toEqual(['sanctum', 'forge', 'apothecary', 'guild', 'vault']);
    expect(r.levels).toEqual([0, 0, 0, 0, 0]);
    expect(r.total).toBe(0);
    expect(r.townNpc).toBe(true);
  });

  test('every district effect is neutral at level 0', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      return { forge: forgeDiscount(), potion: potionPotency(), bounty: bountyMul(), sockets: maxSockets() };
    });
    expect(r.forge).toBe(1);
    expect(r.potion).toBe(1);
    expect(r.bounty).toBe(1);
    expect(r.sockets).toBe(2);
  });

  test('upgrading a district spends gold, raises its level, and ramps the cost', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      G.gold = 10000;
      const cost0 = cityCost('sanctum');
      upgradeCity('sanctum');
      const lvl = cityLvl('sanctum'), gold = G.gold, cost1 = cityCost('sanctum');
      return { cost0, lvl, gold, ramps: cost1 > cost0 };
    });
    expect(r.cost0).toBe(600);
    expect(r.lvl).toBe(1);
    expect(r.gold).toBe(9400);
    expect(r.ramps).toBe(true);
  });

  test('a district upgrade is blocked without enough gold', async ({ game }) => {
    const lvl = await game.evaluate(() => {
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      G.gold = 10; upgradeCity('sanctum');
      return cityLvl('sanctum');
    });
    expect(lvl).toBe(0);
  });

  test('district levels scale their effects', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.city = { sanctum: 0, forge: 2, apothecary: 3, guild: 2, vault: 0 };
      const out = {
        forge: Math.round(forgeDiscount() * 100) / 100,
        potion: Math.round(potionPotency() * 100) / 100,
        bounty: Math.round(bountyMul() * 100) / 100,
      };
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      return out;
    });
    expect(r.forge).toBe(0.8);   // 1 - 2*0.10
    expect(r.potion).toBe(1.24); // 1 + 3*0.08
    expect(r.bounty).toBe(1.24); // 1 + 2*0.12
  });

  test('the Vault discounts storage expansion and the Sanctum boosts mana regen', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.storageMax = 10;
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      const baseStore = storageCost();
      G.city.vault = 2; const discStore = storageCost();
      // mana regen: step a fixed slice of time with and without the sanctum
      USK.clear(); G.equipment = { weapon: null, armor: null };
      PL.x = 200; PL.y = 260; PL.vx = 0; PL.vy = 0; PL.inv = 0;
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      G.maxMp = 200; G.mp = 0; update(0.5); const baseMp = G.mp;
      G.mp = 0; G.city.sanctum = 4; update(0.5); const boostMp = G.mp;
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      return { discounted: discStore < baseStore, boostMp, baseMp };
    });
    expect(r.discounted).toBe(true);
    expect(r.boostMp).toBeGreaterThan(r.baseMp);
  });

  test('city districts persist through save/load', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.city = { sanctum: 1, forge: 2, apothecary: 0, guild: 3, vault: 1 };
      saveGame();
      const raw = JSON.parse(localStorage.getItem('astralbound_save_v1'));
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      applySave(raw);
      return { forge: cityLvl('forge'), guild: cityLvl('guild'), saved: !!raw.city };
    });
    expect(r.saved).toBe(true);
    expect(r.forge).toBe(2);
    expect(r.guild).toBe(3);
  });
});
