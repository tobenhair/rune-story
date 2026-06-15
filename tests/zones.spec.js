const { test, expect } = require('./fixtures');

test.describe('Zones & travel', () => {
  test('all seven zones with correct names and level requirements', async ({ game }) => {
    const z = await game.evaluate(() => ZD.map(z => ({ n: z.name, req: z.req })));
    expect(z.map(x => x.n)).toEqual([
      'Aethon City', 'Village Outskirts', 'Verdant Forest', 'Crystal Caverns', 'Ancient Ruins', 'The Hollow Rift', 'The Endless Rift',
    ]);
    expect(z.map(x => x.req)).toEqual([1, 1, 5, 10, 15, 25, 1]);
  });

  test('only the hub has NPCs; combat zones have monsters; rift has neither', async ({ game }) => {
    const info = await game.evaluate(() => ZD.map(z => ({ npcs: z.npcs.length, mons: z.mons.length })));
    expect(info[0].npcs).toBeGreaterThan(0);   // hub has NPCs
    expect(info[0].mons).toBe(0);              // hub is safe
    for (let i = 1; i <= 4; i++) { expect(info[i].npcs).toBe(0); expect(info[i].mons).toBeGreaterThan(0); }
    expect(info[5].npcs).toBe(0);              // rift: no NPCs
    expect(info[5].mons).toBe(0);              // rift: boss is spawned, not pre-placed
  });

  test('the map modal lists only the five travellable zones (rift is teleport-only)', async ({ game }) => {
    const count = await game.evaluate(() => { buildMap(); return document.getElementById('zthumbs').children.length; });
    expect(count).toBe(5);
  });

  test('portals respect zone level requirements', async ({ game }) => {
    const blocked = await game.evaluate(() => {
      G.level = 1; const before = G.zone;
      enterPortal({ toZone: 2, x: 0, y: 0, dir: 'right' }); // Verdant Forest needs Lv.5
      return G.zone === before;
    });
    expect(blocked).toBe(true);

    const allowed = await game.evaluate(() => {
      G.level = 10; enterPortal({ toZone: 2, x: 0, y: 0, dir: 'right' });
      return G.zone;
    });
    expect(allowed).toBe(2);
  });

  test('loading the rift spawns the ultimate boss', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(5);
      return { zone: G.zone, boss: mons.some(m => m.boss && m.t === 'hollow_oracle') };
    });
    expect(r.zone).toBe(5);
    expect(r.boss).toBe(true);
  });
});
