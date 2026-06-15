const { test, expect } = require('./fixtures');

// Engagement layer (Proposal 5): the Daily Rift, account-wide Achievements, and the Codex.
// All state lives on META (its own localStorage key), so it survives Ascension.

test.describe('Achievements', () => {
  test('the achievement board is defined and starts empty', async ({ game }) => {
    const r = await game.evaluate(() => ({
      count: ACHV.length,
      ach: typeof META.achievements,
      unlocked: Object.keys(META.achievements).length,
    }));
    expect(r.count).toBeGreaterThanOrEqual(20);
    expect(r.ach).toBe('object');
    expect(r.unlocked).toBe(0);
  });

  test('the first kill unlocks First Blood, records the codex, and pays shards', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.achievements = {}; META.flags = {}; META.codex = {}; META.totalKills = 0;
      G.riftShards = 0; G.equipment = { weapon: null, armor: null }; G.inventory = [];
      G.zone = 1; CZ = ZD[1]; mons.length = 0;
      const m = mkMon('slime', PL.x + 500, 260, false); m.gold = 0;
      killM(m);
      return { kills: META.totalKills, firstblood: !!META.achievements.firstblood, shards: G.riftShards, codex: !!META.codex.slime };
    });
    expect(r.kills).toBe(1);
    expect(r.firstblood).toBe(true);
    expect(r.shards).toBeGreaterThan(0);
    expect(r.codex).toBe(true);
  });

  test('an achievement only pays out once', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.achievements = {}; META.flags = {}; META.totalKills = 1; G.riftShards = 0;
      checkAchv(); const s1 = G.riftShards;
      checkAchv(); const s2 = G.riftShards;
      return { s1, s2 };
    });
    expect(r.s1).toBeGreaterThan(0);
    expect(r.s2).toBe(r.s1);
  });

  test('flags drive event-based achievements', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.achievements = {}; META.flags = { legendary: true }; G.riftShards = 0;
      checkAchv();
      return !!META.achievements.legend;
    });
    expect(r).toBe(true);
  });

  test('achievements persist through META save/load', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.achievements = { firstblood: true }; META.totalKills = 55; META.codex = { slime: true };
      saveMeta();
      META.achievements = {}; META.totalKills = 0; META.codex = {};
      loadMeta();
      const out = { a: !!META.achievements.firstblood, k: META.totalKills, c: !!META.codex.slime };
      META.achievements = {}; META.totalKills = 0; META.codex = {}; saveMeta();
      return out;
    });
    expect(r.a).toBe(true);
    expect(r.k).toBe(55);
    expect(r.c).toBe(true);
  });
});

test.describe('Daily Rift', () => {
  test('the daily curse loadout is deterministic for the day', async ({ game }) => {
    const r = await game.evaluate(() => ({
      a: dailyMods().join(','),
      b: dailyMods().join(','),
      count: dailyMods().length,
    }));
    expect(r.a).toBe(r.b);   // same seed → same mods
    expect(r.count).toBe(2);
  });

  test('completing the daily marks it done, starts a streak, and rewards shards', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.daily = null; META.flags = {}; META.achievements = {}; G.riftShards = 0;
      const before = dailyDone();
      dailyComplete(4);
      return { before, after: dailyDone(), streak: META.daily.streak, dated: META.daily.date === dailyKey(), flag: !!META.flags.daily, shards: G.riftShards };
    });
    expect(r.before).toBe(false);
    expect(r.after).toBe(true);
    expect(r.streak).toBe(1);
    expect(r.dated).toBe(true);
    expect(r.flag).toBe(true);
    expect(r.shards).toBeGreaterThan(0);
  });

  test('the streak continues when yesterday was completed', async ({ game }) => {
    const streak = await game.evaluate(() => {
      const y = new Date(Date.now() - 864e5);
      const yk = y.getUTCFullYear() + '-' + (y.getUTCMonth() + 1) + '-' + y.getUTCDate();
      META.daily = { date: yk, streak: 3, best: 5 };
      dailyComplete(2);
      return META.daily.streak;
    });
    expect(streak).toBe(4);
  });

  test('the daily can only be entered once per day', async ({ game }) => {
    const active = await game.evaluate(() => {
      META.daily = { date: dailyKey(), streak: 1, best: 1 };
      RIFT.active = false; startDaily();
      return RIFT.active;
    });
    expect(active).toBe(false);
  });

  test('starting the daily loads the arena with the fixed mod loadout', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.daily = null; G.questStates = { q15: 'done' };
      startDaily();
      const out = { active: RIFT.active, daily: RIFT.daily, mods: RIFT.mods.length, zone: G.zone };
      endRift(true);
      return out;
    });
    expect(r.active).toBe(true);
    expect(r.daily).toBe(true);
    expect(r.mods).toBe(2);
    expect(r.zone).toBe(6);
  });
});

test.describe('Codex / Bestiary', () => {
  test('the bestiary lists every monster and boss, and the Chronicler lives in the hub', async ({ game }) => {
    const r = await game.evaluate(() => ({
      total: bestiaryList().length,
      expected: Object.keys(MDEF).length + BOSS_DEFS.length,
      hasLore: !!CODEX_LORE.slime && !!CODEX_LORE.hollow_oracle,
      npc: ZD[0].npcs.some(n => n.codex),
    }));
    expect(r.total).toBe(r.expected);
    expect(r.hasLore).toBe(true);
    expect(r.npc).toBe(true);
  });
});
