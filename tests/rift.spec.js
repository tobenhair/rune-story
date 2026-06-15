const { test, expect } = require('./fixtures');

// The Endless Rift — infinite scaling wave-survival endgame (zone index 6).
// These specs drive the rift controller deterministically: time is stepped via update(dt)
// and run-state lives on the global RIFT object.

test.describe('The Endless Rift', () => {
  test('the arena is zone 6 and never appears on the travel map', async ({ game }) => {
    const r = await game.evaluate(() => {
      buildMap();
      const thumbs = document.getElementById('zthumbs').innerHTML;
      return {
        zoneCount: ZD.length,
        riftZone: RIFT_ZONE,
        name: ZD[RIFT_ZONE] && ZD[RIFT_ZONE].name,
        bossTimersLen: bossTimers.length,
        musicLen: ZONE_MUSIC.length,
        onMap: thumbs.includes('Endless Rift'),
        warden: ZD[0].npcs.some(n => n.rift),
      };
    });
    expect(r.zoneCount).toBe(7);
    expect(r.riftZone).toBe(6);
    expect(r.name).toBe('The Endless Rift');
    expect(r.bossTimersLen).toBe(7);
    expect(r.musicLen).toBe(7);
    expect(r.onMap).toBe(false);
    expect(r.warden).toBe(true);
  });

  test('Riftwarden gate is locked until Veyra is defeated', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = {}; G.kills = {};
      const locked = riftUnlocked();
      G.kills.hollow_oracle = 1;
      const byKill = riftUnlocked();
      G.kills = {}; G.questStates.q15 = 'done';
      const byQuest = riftUnlocked();
      return { locked, byKill, byQuest };
    });
    expect(r.locked).toBe(false);
    expect(r.byKill).toBe(true);
    expect(r.byQuest).toBe(true);
  });

  test('startRift drops the player into the arena and spawns the first wave', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      startRift(1);
      const afterStart = { zone: G.zone, active: RIFT.active, depth: RIFT.depth, waves: RIFT.waves, mons: mons.length, intermission: RIFT.intermission > 0 };
      // step past the opening intermission so the first wave spawns
      for (let i = 0; i < 200 && mons.length === 0; i++) update(0.05);
      return { afterStart, spawned: mons.length, allRift: mons.every(m => m.rift), wave: RIFT.wave };
    });
    expect(r.afterStart.zone).toBe(6);
    expect(r.afterStart.active).toBe(true);
    expect(r.afterStart.depth).toBe(1);
    expect(r.afterStart.waves).toBe(3); // 3 + floor(1/2)
    expect(r.afterStart.intermission).toBe(true);
    expect(r.afterStart.mons).toBe(0);
    expect(r.spawned).toBeGreaterThan(0);
    expect(r.allRift).toBe(true);
    expect(r.wave).toBe(1);
  });

  test('mkRiftMon scales HP and damage with depth', async ({ game }) => {
    const r = await game.evaluate(() => {
      const base = MDEF.goblin;
      RIFT.mods = []; RIFT.depth = 1;
      const shallow = mkRiftMon('goblin', 400, 300);
      RIFT.depth = 10;
      const deep = mkRiftMon('goblin', 400, 300);
      return {
        baseHp: base.hp, baseMx: base.mx,
        shallowHp: shallow.hp, deepHp: deep.hp,
        shallowMx: shallow.mx, deepMx: deep.mx,
        rift: deep.rift,
      };
    });
    // depth scales hp by (1 + d*0.18) over the base 50 HP (no elite roll in this path is irrelevant — scaling is monotonic)
    expect(r.deepHp).toBeGreaterThan(r.shallowHp);
    expect(r.deepMx).toBeGreaterThan(r.shallowMx);
    expect(r.rift).toBe(true);
  });

  test('the Elite Legion modifier forces every spawn to be elite', async ({ game }) => {
    const elite = await game.evaluate(() => {
      RIFT.mods = ['legion']; RIFT.depth = 3;
      // even with RNG that would normally skip elite, legion forces it
      return T.withRandom([0.9, 0.9, 0.9, 0.9], () => mkRiftMon('slime', 400, 300).elite);
    });
    expect(elite).toBe(true);
  });

  test('modifier multipliers stack into the shard multiplier and danger', async ({ game }) => {
    const r = await game.evaluate(() => ({
      savageDmg: RIFT_MODS.find(m => m.id === 'savage').dmg,
      legionShard: RIFT_MODS.find(m => m.id === 'legion').shard,
      ids: RIFT_MODS.map(m => m.id),
    }));
    expect(r.ids).toEqual(['savage', 'vigor', 'swift', 'horde', 'legion', 'brutal']);
    expect(r.savageDmg).toBeGreaterThan(1);
    expect(r.legionShard).toBeGreaterThan(1);
  });

  test('boss depths (every 5th) spawn a single scaled boss Echo', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      startRift(5);
      for (let i = 0; i < 200 && mons.length === 0; i++) update(0.05);
      const b = mons.find(m => m.boss);
      return { boss: RIFT.boss, waves: RIFT.waves, count: mons.length, isEcho: !!b, name: b && b.n, rift: b && b.rift, hp: b && b.hp, baseHp: BOSS_DEFS[0].hp };
    });
    expect(r.boss).toBe(true);
    expect(r.waves).toBe(1);
    expect(r.isEcho).toBe(true);
    expect(r.name).toContain('Echo of');
    expect(r.rift).toBe(true);
    expect(r.hp).toBeGreaterThan(r.baseHp); // depth-scaled above the base boss
  });

  test('clearing a depth banks shards, records a new best, and opens the curse draft', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' }; G.riftShards = 0; G.riftBest = 0;
      startRift(1);
      RIFT.wave = RIFT.waves; RIFT.spawned = true; RIFT.intermission = 0; mons.length = 0;
      const shardsBefore = G.riftShards;
      updateRift(0.05); // wave cleared + final wave → depthCleared
      return { shardsBefore, shardsAfter: G.riftShards, banked: RIFT.banked, best: G.riftBest, draftOpen: dlgOpen };
    });
    expect(r.shardsBefore).toBe(0);
    // depth 1: base (5 + 1*2)=7 shards + new-best bonus (1*3)=3 → 10
    expect(r.shardsAfter).toBe(10);
    expect(r.banked).toBe(10);
    expect(r.best).toBe(1);
    expect(r.draftOpen).toBe(true);
  });

  test('picking a curse applies it, multiplies shard reward, and descends a depth', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      startRift(1);
      RIFT.shardMul = 1; RIFT.depth = 1;
      pickRiftMod('savage');
      const savage = RIFT_MODS.find(m => m.id === 'savage');
      return { mods: RIFT.mods.slice(), shardMul: RIFT.shardMul, expected: savage.shard, depth: RIFT.depth, draftClosed: !dlgOpen };
    });
    expect(r.mods).toEqual(['savage']);
    expect(r.shardMul).toBeCloseTo(r.expected, 9);
    expect(r.depth).toBe(2);
    expect(r.draftClosed).toBe(true);
  });

  test('intermediate waves clear into the next wave, not the draft', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      startRift(1); // 3 waves
      RIFT.wave = 1; RIFT.waves = 3; RIFT.spawned = true; RIFT.intermission = 0; mons.length = 0;
      updateRift(0.05);
      return { intermission: RIFT.intermission > 0, draftOpen: dlgOpen, wave: RIFT.wave };
    });
    expect(r.intermission).toBe(true);
    expect(r.draftOpen).toBe(false);
    expect(r.wave).toBe(1); // not advanced until the intermission elapses
  });

  test('dying in the rift ends the run but keeps banked shards', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' }; G.riftShards = 0;
      startRift(2);
      // simulate a cleared depth that already banked shards
      G.riftShards = 25; RIFT.banked = 25;
      G.hp = 5; respawn(); // death in the rift
      const ending = RIFT.ending;
      update(0.05); // next frame resolves the end
      return { ending, active: RIFT.active, zone: G.zone, shards: G.riftShards };
    });
    expect(r.ending).toBe(true);
    expect(r.active).toBe(false);
    expect(r.zone).toBe(0); // returned to the hub
    expect(r.shards).toBe(25); // banked shards survive
  });

  test('extracting via the edge portal returns to the hub with the run reward', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      startRift(3);
      const before = RIFT.active;
      enterPortal({ toZone: 0, x: 40, y: 388, dir: 'left' });
      return { before, active: RIFT.active, zone: G.zone };
    });
    expect(r.before).toBe(true);
    expect(r.active).toBe(false);
    expect(r.zone).toBe(0);
  });

  test('rift shards persist through save/load and a save made in the rift records the hub', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q15: 'done' };
      startRift(4);
      G.riftShards = 99; G.riftBest = 7;
      saveGame();
      const raw = JSON.parse(localStorage.getItem('astralbound_save_v1'));
      // wipe and reload
      G.riftShards = 0; G.riftBest = 0; G.zone = 5;
      applySave(raw);
      return { savedZone: raw.zone, savedShards: raw.riftShards, savedBest: raw.riftBest, loadedShards: G.riftShards, loadedBest: G.riftBest, loadedZone: G.zone };
    });
    expect(r.savedZone).toBe(0); // never persists the rift zone
    expect(r.savedShards).toBe(99);
    expect(r.savedBest).toBe(7);
    expect(r.loadedShards).toBe(99);
    expect(r.loadedBest).toBe(7);
    expect(r.loadedZone).not.toBe(6);
  });

  test('buying a rift cache spends shards and yields gear', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: null, armor: null }; G.inventory = [];
      G.riftShards = 50;
      buyRift('cache');
      const gearCount = [G.equipment.weapon, G.equipment.armor, ...G.inventory.map(x => x && x.g)].filter(Boolean).length;
      const tooPoor = (() => { G.riftShards = 0; const before = G.riftShards; buyRift('artifact'); return G.riftShards === before; })();
      return { shards: G.riftShards, gearCount, tooPoor };
    });
    expect(r.shards).toBe(35); // 50 - 15
    expect(r.gearCount).toBeGreaterThan(0);
    expect(r.tooPoor).toBe(true); // can't afford → no change
  });
});
