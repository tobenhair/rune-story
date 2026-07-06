const { test, expect } = require('./fixtures');

test.describe('Zones & travel', () => {
  test('all eleven zones with correct names and level requirements', async ({ game }) => {
    const z = await game.evaluate(() => ZD.map(z => ({ n: z.name, req: z.req })));
    expect(z.map(x => x.n)).toEqual([
      'Aethon City', 'Village Outskirts', 'Verdant Forest', 'Crystal Caverns', 'Ancient Ruins', 'The Hollow Rift', 'The Endless Rift',
      'Emberfall Wastes', 'Frostveil Glacier', 'The Ashen Sanctum', 'The Riftheart',
    ]);
    expect(z.map(x => x.req)).toEqual([1, 1, 5, 10, 15, 25, 1, 20, 24, 28, 30]);
  });

  test('only the hub has NPCs; combat zones have monsters; arenas have neither', async ({ game }) => {
    const info = await game.evaluate(() => ZD.map(z => ({ npcs: z.npcs.length, mons: z.mons.length })));
    expect(info[0].npcs).toBeGreaterThan(0);   // hub has NPCs
    expect(info[0].mons).toBe(0);              // hub is safe
    for (const i of [1, 2, 3, 4, 7, 8]) { expect(info[i].npcs).toBe(0); expect(info[i].mons).toBeGreaterThan(0); }
    for (const i of [5, 6, 9, 10]) { expect(info[i].npcs).toBe(0); expect(info[i].mons).toBe(0); } // arenas: bosses/waves spawn, not pre-placed
  });

  test('the map lists five zones until Act 2 unlocks, then seven (arenas stay teleport-only)', async ({ game }) => {
    const r = await game.evaluate(() => {
      buildMap(); const before = document.getElementById('zthumbs').children.length;
      G.questStates.q15 = 'done'; buildMap();
      const after = document.getElementById('zthumbs').children.length;
      delete G.questStates.q15; buildMap();
      return { before, after };
    });
    expect(r.before).toBe(5);
    expect(r.after).toBe(7);
  });

  test('Act 2 lies west of the hub and is walkable once Act 1 is done', async ({ game }) => {
    // Portal geography: city ← Emberfall Wastes ← Frostveil Glacier (west chain).
    const layout = await game.evaluate(() => ({
      hubWest: ZD[0].portals[0],
      emberfall: ZD[7].portals.map(p => [p.toZone, p.dir]),
      frostveil: ZD[8].portals.map(p => [p.toZone, p.dir]),
    }));
    expect(layout.hubWest).toEqual({ toZone: 7, x: 40, y: 388, dir: 'left' });
    expect(layout.emberfall).toEqual([[8, 'left'], [0, 'right']]);
    expect(layout.frostveil).toEqual([[7, 'right']]);

    // The western road is sealed until q15 (Act 1 finale) is done, even at high level.
    const r = await game.evaluate(() => {
      G.level = 30; loadZone(0);
      enterPortal(ZD[0].portals[0]);
      const sealedZone = G.zone;
      G.questStates.q15 = 'done';
      enterPortal(ZD[0].portals[0]);
      const openZone = G.zone;
      delete G.questStates.q15;
      return { sealedZone, openZone };
    });
    expect(r.sealedZone).toBe(0);
    expect(r.openZone).toBe(7);
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

  test('loading the Ashen Sanctum spawns Malachar', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(9);
      return { zone: G.zone, boss: mons.some(m => m.boss && m.t === 'ash_sage') };
    });
    expect(r.zone).toBe(9);
    expect(r.boss).toBe(true);
  });
});
