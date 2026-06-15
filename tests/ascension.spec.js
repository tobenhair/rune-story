const { test, expect } = require('./fixtures');

// Ascension — prestige / New Game+ meta-progression. State lives on the global META object
// (persisted under a separate localStorage key) and drives paragon multipliers that are all
// neutral (1) at META.asc=0 with no talents — so a never-ascended game is unchanged.

test.describe('Ascension & meta-progression', () => {
  test('META defaults are empty and the talent board is intact', async ({ game }) => {
    const r = await game.evaluate(() => ({
      asc: META.asc, echoes: META.echoes, talents: JSON.stringify(META.talents),
      ids: ASCN.map(a => a.id),
    }));
    expect(r.asc).toBe(0);
    expect(r.echoes).toBe(0);
    expect(r.talents).toBe('{}');
    expect(r.ids).toEqual(['might', 'fortune', 'vigor', 'wellspring', 'scholar', 'edge', 'luck', 'shardseeker']);
  });

  test('every paragon multiplier is neutral with no ascensions or talents', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.asc = 0; META.talents = {};
      return [ascEnemyMul(), metaRewardMul(), metaDmgMul(), metaCrit(), metaDropMul(), metaShardMul(), metaStartHp(), metaStartMp(), metaStartSP()];
    });
    expect(r).toEqual([1, 1, 1, 0, 1, 1, 100, 80, 0]);
  });

  test('ascension level and talent ranks feed the multipliers', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.asc = 2; const enemy = ascEnemyMul();
      META.asc = 0; META.talents = { might: 2 }; const dmg = metaDmgMul();
      META.talents = { edge: 3 }; const crit = metaCrit();
      META.talents = { vigor: 2, wellspring: 3, scholar: 4 };
      const start = [metaStartHp(), metaStartMp(), metaStartSP()];
      META.talents = {};
      return { enemy, dmg: Math.round(dmg * 100) / 100, crit: Math.round(crit * 100) / 100, start };
    });
    expect(r.enemy).toBe(1.5);          // 1 + 2*0.25
    expect(r.dmg).toBe(1.16);           // 1 + 2*0.08
    expect(r.crit).toBe(0.12);          // 3*0.04
    expect(r.start).toEqual([150, 125, 4]); // 100+25*2, 80+15*3, scholar 4
  });

  test('mkMon scales enemy HP up with ascension level', async ({ game }) => {
    const r = await game.evaluate(() => {
      // withRandom([]) forces Math.random → 0.5 so neither roll is a (random) elite
      META.asc = 0; const base = T.withRandom([], () => mkMon('goblin', 0, 0)).hp;
      META.asc = 4; const scaled = T.withRandom([], () => mkMon('goblin', 0, 0)).hp;
      META.asc = 0;
      return { base, scaled };
    });
    expect(r.scaled).toBeGreaterThan(r.base); // 1 + 4*0.25 = 2x
  });

  test('Ascension gate is locked until the final boss is beaten', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = {}; G.kills = {};
      const locked = canAscend();
      G.questStates = { q15: 'done' };
      return { locked, open: canAscend() };
    });
    expect(r.locked).toBe(false);
    expect(r.open).toBe(true);
  });

  test('buying a talent spends Echoes, ranks up, and blocks when unaffordable', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.asc = 0; META.echoes = 10; META.talents = {};
      buyAscn('might'); const r1 = metaRank('might'), e1 = META.echoes; // cost 2
      buyAscn('might'); const r2 = metaRank('might'), e2 = META.echoes; // cost 3
      META.echoes = 0; buyAscn('might'); const r3 = metaRank('might'); // can't afford
      META.echoes = 0; META.talents = {};
      return { r1, e1, r2, e2, r3 };
    });
    expect(r.r1).toBe(1); expect(r.e1).toBe(8);
    expect(r.r2).toBe(2); expect(r.e2).toBe(5);
    expect(r.r3).toBe(2); // unchanged — too poor
  });

  test('Ascend is a two-click confirm that resets the run but keeps vault, rift progress, and META', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      META.asc = 0; META.echoes = 0; META.talents = { vigor: 2 };
      G.level = 30; G.gold = 999; G.skillPoints = 5;
      G.riftBest = 4; G.riftShards = 77;
      G.storage = [{ id: 'slime_goo', qty: 3 }]; G.storageMax = 20;
      G.equipment = { weapon: { slot: 'weapon', rar: 5, n: 'X', mag: 40 }, armor: null };
      G.inventory = [{ id: 'bat_wing', qty: 2 }];
      ascArmed = false;
      ascend(); const armed = ascArmed;     // first click: arm only
      ascend();                              // second click: ascend
      const out = {
        armed, asc: META.asc, echoes: META.echoes,
        level: G.level, gold: G.gold, zone: G.zone, quests: Object.keys(G.questStates).length,
        weapon: G.equipment.weapon, bag: G.inventory.length, maxHp: G.maxHp,
        storage: G.storage.length, storeMax: G.storageMax, riftBest: G.riftBest, riftShards: G.riftShards,
      };
      META.asc = 0; META.echoes = 0; META.talents = {}; ascArmed = false;
      return out;
    });
    expect(r.armed).toBe(true);        // first click only arms
    expect(r.asc).toBe(1);
    expect(r.echoes).toBeGreaterThan(0);
    expect(r.level).toBe(1);           // run reset
    expect(r.gold).toBe(0);
    expect(r.zone).toBe(0);
    expect(r.quests).toBe(0);
    expect(r.weapon).toBeNull();       // gear wiped
    expect(r.bag).toBe(0);
    expect(r.maxHp).toBe(150);         // meta vigor rank 2 starting HP
    expect(r.storage).toBe(1);         // vault kept
    expect(r.storeMax).toBe(20);
    expect(r.riftBest).toBe(4);        // rift progress kept
    expect(r.riftShards).toBe(77);
  });

  test('META persists through saveMeta/loadMeta under its own key', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.asc = 3; META.echoes = 42; META.talents = { luck: 2 };
      saveMeta();
      const raw = JSON.parse(localStorage.getItem('astralbound_meta_v1'));
      META.asc = 0; META.echoes = 0; META.talents = {};
      loadMeta();
      const out = { rawAsc: raw.asc, asc: META.asc, echoes: META.echoes, luck: metaRank('luck') };
      META.asc = 0; META.echoes = 0; META.talents = {}; saveMeta();
      return out;
    });
    expect(r.rawAsc).toBe(3);
    expect(r.asc).toBe(3);
    expect(r.echoes).toBe(42);
    expect(r.luck).toBe(2);
  });

  test('the Astralwright NPC lives in the hub', async ({ game }) => {
    const has = await game.evaluate(() => ZD[0].npcs.some(n => n.asc));
    expect(has).toBe(true);
  });
});
