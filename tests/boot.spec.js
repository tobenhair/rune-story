const { test, expect } = require('./fixtures');

test.describe('Boot & core data', () => {
  test('boots into Aethon City with starting stats', async ({ game }) => {
    const g = await game.evaluate(() => ({ name: G.name, level: G.level, zone: G.zone, hp: G.hp, maxHp: G.maxHp, maxMp: G.maxMp, spells: G.spells, sp: G.skillPoints }));
    expect(g.level).toBe(1);
    expect(g.zone).toBe(0);
    expect(g.hp).toBe(100);
    expect(g.maxHp).toBe(100);
    expect(g.maxMp).toBe(80);
    expect(g.spells).toEqual([true, false, false, true]); // Bolt + Mana Shield known
  });

  test('content tables have the expected sizes', async ({ game }) => {
    const c = await game.evaluate(() => ({
      zones: ZD.length, quests: QUESTS.length, spells: SPELLS.length, rars: RARS.length,
      bosses: BOSS_DEFS.length, affixes: AFFIXES.length, artifacts: ARTIFACTS.length, skills: SKN.length,
    }));
    expect(c.zones).toBe(7); // 5 story zones + hub + the Endless Rift arena
    expect(c.quests).toBe(15);
    expect(c.spells).toBe(4);
    expect(c.rars).toBe(6);
    expect(c.bosses).toBe(5);
    expect(c.affixes).toBe(4);
    expect(c.artifacts).toBe(4);
    expect(c.skills).toBe(13); // 10 base + 3 school capstones
  });

  test('save → load round-trips key progress', async ({ game }) => {
    const ok = await game.evaluate(() => {
      G.level = 12; G.gold = 777; G.zone = 2; G.questStates = { q1: 'done', q2: 'active' };
      G.kills = { slime: 5 }; G.inventory = [{ id: 'slime_goo', qty: 4 }];
      saveGame();
      const d = loadSave();
      applySave(d);
      return G.level === 12 && G.gold === 777 && G.zone === 2 &&
        G.questStates.q1 === 'done' && G.kills.slime === 5 &&
        G.inventory.some(x => x && x.id === 'slime_goo' && x.qty === 4) && d.v === 2;
    });
    expect(ok).toBe(true);
  });

  test('legacy v1 saves are migrated (zone shifts by 1)', async ({ game }) => {
    const zone = await game.evaluate(() => {
      applySave({ v: 1, name: 'Old', level: 3, xp: 0, xpNext: 100, hp: 50, maxHp: 100, mp: 40, maxMp: 80, gold: 10, skillPoints: 0, zone: 1, kills: {}, questStates: {}, equipment: { weapon: null, armor: null }, inventory: [], spells: [true, false, false, false] });
      return G.zone;
    });
    expect(zone).toBe(2); // v1 zone 1 → hub-era zone 2
  });
});
