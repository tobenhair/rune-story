// Act 2 — The Emberfall Saga: zones 7–9, four new monsters, the q16–q22 chain,
// three new bosses with ability kits, the flattened post-20 level curve, and the
// Act-2-gated world map. Complements zones/quests/bosses specs, which cover the
// shared inventories (zone list, chain shape, boss roster).
const { test, expect } = require('./fixtures');

test.describe('Act 2 monsters & loot', () => {
  test('the four Act 2 monsters are defined with matching sprites and thousands-scale XP', async ({ game }) => {
    const r = await game.evaluate(() => ['magmite', 'ashwing', 'frostmaw', 'sleetwisp'].map(t => ({
      t, def: !!MDEF[t], sheet: !!SHS[MDEF[t].sheet], xp: MDEF[t].xp, lore: !!CODEX_LORE[t],
    })));
    for (const m of r) {
      expect(m.def, m.t).toBe(true);
      expect(m.sheet, m.t + ' sprite sheet').toBe(true);
      expect(m.xp, m.t + ' xp').toBeGreaterThanOrEqual(1000);
      expect(m.lore, m.t + ' codex lore').toBe(true);
    }
  });

  test('each Act 2 zone signature monster drops its 1% rare relic', async ({ game }) => {
    const r = await game.evaluate(() => ({
      ember: MDEF.magmite.loot.some(l => l[0] === 'ember_heart' && l[1] === 0.01),
      tear: MDEF.frostmaw.loot.some(l => l[0] === 'frozen_tear' && l[1] === 0.01),
      emberSrc: itemSource('ember_heart'),
      tearSrc: itemSource('frozen_tear'),
    }));
    expect(r.ember).toBe(true);
    expect(r.tear).toBe(true);
    expect(r.emberSrc).toBe('Magmite');
    expect(r.tearSrc).toBe('Frostmaw');
  });

  test('Act 2 zones drop the two new gear tiers', async ({ game }) => {
    const names = await game.evaluate(() => T.withRandom([0, 0.3], () => {
      // rar roll 0 → Common → bare base name; slot roll picks weapon
      const w7 = rollGear(7, false), w9 = T.withRandom([0, 0.3], () => rollGear(9, false));
      return [w7.n, w9.n];
    }));
    expect(names[0]).toBe('Emberforged Scepter');
    expect(names[1]).toBe('Rimeheart Warstaff');
  });

  test('Act 2 monsters join the deep rift pool and bounty board', async ({ game }) => {
    const r = await game.evaluate(() => ({
      pool: RIFT_POOL.slice(-4),
      deep: riftTypes(30).includes('sleetwisp'),
      shallow: riftTypes(1).includes('magmite'),
      bounty7: BOUNTY_POOLS[7], bounty8: BOUNTY_POOLS[8],
    }));
    expect(r.pool).toEqual(['magmite', 'ashwing', 'frostmaw', 'sleetwisp']);
    expect(r.deep).toBe(true);
    expect(r.shallow).toBe(false); // Act 2 mobs only surface in deep descents
    expect(r.bounty7).toEqual(['magmite', 'ashwing']);
    expect(r.bounty8).toEqual(['frostmaw', 'sleetwisp']);
  });
});

test.describe('Act 2 quest chain', () => {
  test('q16 is locked behind the Act 1 finale and unlocks once q15 is done', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = {}; G.level = 25;
      const q16 = QUESTS.find(q => q.id === 'q16');
      const lockedPrev = q16.prev;
      const beforeMap = (buildMap(), document.getElementById('zthumbs').children.length);
      G.questStates.q15 = 'done';
      const vesper = npcQuest({ name: 'Seer Vesper' }).id;
      const afterMap = (buildMap(), document.getElementById('zthumbs').children.length);
      return { lockedPrev, vesper, beforeMap, afterMap, open: actTwoOpen() };
    });
    expect(r.lockedPrev).toBe('q15');
    expect(r.vesper).toBe('q16'); // Vesper moves on to Act 2 once the door is sealed
    expect(r.beforeMap).toBe(5);
    expect(r.afterMap).toBe(7);
    expect(r.open).toBe(true);
  });

  test('the Act 2 rewards hand out the fixed ember/frost gear', async ({ game }) => {
    const r = await game.evaluate(() => {
      const rew = id => QUESTS.find(q => q.id === id).rew.item;
      return { q16: rew('q16'), q18: rew('q18'), q21: rew('q21'), fixed: ['emberweave_robe', 'phoenix_staff', 'glacier_mantle'].map(id => GEAR_FIXED[id] && GEAR_FIXED[id].n) };
    });
    expect(r.q16).toBe('emberweave_robe');
    expect(r.q18).toBe('phoenix_staff');
    expect(r.q21).toBe('glacier_mantle');
    expect(r.fixed).toEqual(['Emberweave Robe', 'Phoenixheart Staff', 'Glacier Mantle']);
  });

  test('accepting q22 teleports into the Ashen Sanctum where Malachar waits', async ({ game }) => {
    const r = await game.evaluate(() => {
      QUESTS.filter(q => q.id !== 'q22').forEach(q => G.questStates[q.id] = 'done');
      G.level = 28; mons.length = 0;
      acceptQ('q22');
      return { zone: G.zone, boss: mons.some(m => m.boss && m.t === 'ash_sage'), tp: QUESTS.find(q => q.id === 'q22').tp };
    });
    expect(r.tp).toBe(9);
    expect(r.zone).toBe(9);
    expect(r.boss).toBe(true);
  });

  test('the Act 2 achievements exist and fire on Malachar\'s fall and q22', async ({ game }) => {
    const r = await game.evaluate(() => {
      META.achievements = {}; G.kills = { ash_sage: 1 }; G.questStates = { q22: 'done' };
      checkAchv();
      return { malachar: achvDone('malachar'), saga2: achvDone('saga2') };
    });
    expect(r.malachar).toBe(true);
    expect(r.saga2).toBe(true);
  });
});

test.describe('Post-16 level curve', () => {
  test('xpNext grows 1.4× before level 16 and 1.15× after', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.level = 14; G.xp = 0; G.xpNext = 1000;
      gainXP(1000); const at15 = G.xpNext;          // reached 15 → ×1.4
      gainXP(at15); const at16 = G.xpNext;          // reached 16 → ×1.15 (flattened)
      gainXP(at16); const at17 = G.xpNext;          // reached 17 → ×1.15
      return { at15, at16, at17 };
    });
    expect(r.at15).toBe(1400);
    expect(r.at16).toBe(Math.floor(1400 * 1.15));
    expect(r.at17).toBe(Math.floor(Math.floor(1400 * 1.15) * 1.15));
  });

  test('applySave caps an inflated pre-flattening xpNext at the canonical value', async ({ game }) => {
    const r = await game.evaluate(() => {
      const d = JSON.parse(JSON.stringify({
        v: 2, name: 'Migr', level: 25, xp: 0, xpNext: 480000, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
        gold: 0, skillPoints: 0, zone: 0, kills: {}, questStates: {}, questProg: {}, equipment: {}, inventory: [], spells: [true, false, false, true], skills: [],
      }));
      applySave(d);
      let x = 100; for (let l = 2; l <= 25; l++) x = Math.floor(x * (l >= 16 ? 1.15 : 1.4));
      return { got: G.xpNext, canonical: x };
    });
    expect(r.got).toBe(r.canonical);
    expect(r.got).toBeLessThan(480000);
  });

  test('zone 2–4 kill XP is rescaled to bridge toward the Act 2 band', async ({ game }) => {
    const xp = await game.evaluate(() => ({ bat: MDEF.bat.xp, golem: MDEF.golem.xp, skeleton: MDEF.skeleton.xp, wraith: MDEF.wraith.xp }));
    expect(xp).toEqual({ bat: 48, golem: 200, skeleton: 150, wraith: 190 });
  });
});

test.describe('Relic bad-luck protection', () => {
  test('the 1% relic chance ramps after 75 dry kills and resets on a drop', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 7; CZ = ZD[7]; G.hp = 999; G.maxHp = 999;
      G.inventory = []; G.relicPity = {}; G.bounty = null;
      const killWith = rnd => {
        const m = T.withRandom([0.5, 0.5, 0.9, 0.5], () => mkMon('magmite', PL.x + 400, 260));
        const o = Math.random; Math.random = () => rnd;
        try { killM(m); } finally { Math.random = o; }
      };
      killWith(0.15);                       // 15% roll ≫ 1% base → no relic, pity ticks up
      const pityAfterMiss = G.relicPity.ember_heart;
      G.relicPity.ember_heart = 175;        // deep dry streak → eff = 1% + 100×0.2% = 21%
      killWith(0.15);                       // 15% < 21% → relic drops
      const dropped = G.inventory.some(x => x && x.id === 'ember_heart');
      return { pityAfterMiss, dropped, pityAfterDrop: G.relicPity.ember_heart };
    });
    expect(r.pityAfterMiss).toBe(1);
    expect(r.dropped).toBe(true);
    expect(r.pityAfterDrop).toBe(0);
  });

  test('pity state persists through save/load', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.relicPity = { frozen_tear: 42 };
      saveGame();
      G.relicPity = {};
      applySave(loadSave());
      return G.relicPity.frozen_tear;
    });
    expect(r).toBe(42);
  });
});

test.describe('Act 2 bosses', () => {
  test('the Ember Tyrant volleys 3-way magma and kindles Magmites at half HP', async ({ game }) => {
    const r = await game.evaluate(() => {
      mons.length = 0; projs.length = 0; G.zone = 7; CZ = ZD[7]; T.resetPlayer();
      spawnBoss(7); const b = mons.find(m => m.boss); b.x = PL.x + 200; b.y = PL.y;
      b.a1T = 0; updateBossAbilities(b, 0.016, 200, 200);
      const volley = projs.filter(p => p.hostile && p.proj === 'fireball').length;
      b.hp = b.mhp * 0.4; updateBossAbilities(b, 0.016, 200, 200);
      return { volley, minions: mons.filter(m => m.t === 'magmite').length, split: b.splitDone };
    });
    expect(r.volley).toBe(3);
    expect(r.minions).toBe(2);
    expect(r.split).toBe(true);
  });

  test('the Frost Matriarch storms 5-way ice and her Grasp chills the player', async ({ game }) => {
    const r = await game.evaluate(() => {
      mons.length = 0; projs.length = 0; G.zone = 8; CZ = ZD[8]; T.resetPlayer();
      spawnBoss(8); const b = mons.find(m => m.boss); b.x = PL.x + 200; b.y = PL.y;
      b.a1T = 0; b.a2T = 1e9; updateBossAbilities(b, 0.016, 200, 200);
      const storm = projs.filter(p => p.hostile && p.slow).length;
      projs.length = 0; b.a1T = 1e9; b.a2T = 0; updateBossAbilities(b, 0.016, 200, 200);
      const grasp = projs.find(p => p.hostile);
      return { storm, playerSlow: grasp && grasp.playerSlow, fly: b.fly };
    });
    expect(r.storm).toBe(5);
    expect(r.playerSlow).toBe(true);
    expect(r.fly).toBe(true);
  });

  test('Malachar novas 7-way, cinder-steps to kited players, and looses his flock', async ({ game }) => {
    const r = await game.evaluate(() => {
      mons.length = 0; projs.length = 0; G.zone = 9; CZ = ZD[9]; T.resetPlayer();
      mons.length = 0; spawnBoss(9); const b = mons.find(m => m.boss); b.x = PL.x + 200; b.y = PL.y;
      b.a1T = 0; b.a2T = 1e9; updateBossAbilities(b, 0.016, 200, 200);
      const nova = projs.filter(p => p.hostile).length;
      const farX = PL.x + 400; b.x = farX; b.phaseT = 0; updateBossAbilities(b, 0.016, 400, 400);
      const stepped = Math.abs(b.x - PL.x) < 120;
      b.hp = b.mhp * 0.3; updateBossAbilities(b, 0.016, 100, 100);
      return { nova, stepped, flock: mons.filter(m => m.t === 'ashwing').length };
    });
    expect(r.nova).toBe(7);
    expect(r.stepped).toBe(true);
    expect(r.flock).toBe(2);
  });

  test('deep rift echoes reuse the Act 2 bosses but never the Hollow One', async ({ game }) => {
    const r = await game.evaluate(() => {
      const echoes = BOSS_DEFS.filter(b => !b.noEcho);
      return { last: echoes[echoes.length - 1].t, idolExcluded: !!BOSS_DEFS.find(b => b.t === 'hollow_idol').noEcho, count: echoes.length };
    });
    expect(r.last).toBe('ash_sage'); // the deepest echo — an armless idol Echo would be unkillable
    expect(r.idolExcluded).toBe(true);
    expect(r.count).toBe(8);
  });
});

test.describe('Act 2 environments', () => {
  test('zones 7–9 have their own themes, grades and music', async ({ game }) => {
    const r = await game.evaluate(() => ({
      themes: [7, 8, 9].map(z => zoneTheme(z)),
      grades: ['ember', 'glacier', 'ashen'].map(t => !!ZGRADE[t]),
      music: ZONE_MUSIC.length,
      portalCols: ZONE_PORTAL_COLORS.length,
    }));
    expect(r.themes).toEqual(['ember', 'glacier', 'ashen']);
    expect(r.grades).toEqual([true, true, true]);
    expect(r.music).toBe(11);
    expect(r.portalCols).toBe(11);
  });
});
