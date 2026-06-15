const { test, expect } = require('./fixtures');

test.describe('Quests', () => {
  test('all 15 quests are well-formed and form a single prev-chain', async ({ game }) => {
    const r = await game.evaluate(() => {
      const givers = new Set(['Elder Mira', 'Guard Tomlin', 'Ranger Sylva', 'Sage Oriax', 'Scholar Aldric', 'Seer Vesper']);
      const byId = Object.fromEntries(QUESTS.map(q => [q.id, q]));
      const problems = [];
      QUESTS.forEach(q => {
        if (!/^q\d+$/.test(q.id)) problems.push('id ' + q.id);
        if (!givers.has(q.giver)) problems.push('giver ' + q.id);
        if (typeof q.rlvl !== 'number') problems.push('rlvl ' + q.id);
        if (!Array.isArray(q.tasks) || !q.tasks.length) problems.push('tasks ' + q.id);
        if (!q.rew) problems.push('rew ' + q.id);
        if (q.prev !== null && !byId[q.prev]) problems.push('prev ' + q.id);
      });
      // Exactly one root, and following the chain reaches every quest exactly once.
      const roots = QUESTS.filter(q => q.prev === null);
      let len = 0, cur = roots[0], seen = new Set();
      while (cur && !seen.has(cur.id)) { seen.add(cur.id); len++; cur = QUESTS.find(q => q.prev === cur.id); }
      return { count: QUESTS.length, problems, roots: roots.length, chainLen: len };
    });
    expect(r.count).toBe(15);
    expect(r.problems).toEqual([]);
    expect(r.roots).toBe(1);
    expect(r.chainLen).toBe(15);
  });

  test('the chain is ordered by ascending zone (low-level zones first)', async ({ game }) => {
    const zonesInOrder = await game.evaluate(() => {
      // Map each quest to the zone of its kill/relic target, then read them in chain order.
      const monZone = { slime: 1, goblin: 1, slime_sov: 1, bat: 2, goblin_chief: 2, golem: 3, crystal_lich: 3, skeleton: 4, wraith: 4, fallen_oracle: 4, hollow_oracle: 5 };
      const relicZone = { rift_seed: 1, wither_heart: 2, resonant_core: 3, rift_sigil: 4 };
      const zoneOf = q => { const t = q.tasks[0]; return t.type === 'kill' ? monZone[t.tgt] : relicZone[t.item]; };
      const order = [];
      let cur = QUESTS.find(q => q.prev === null);
      while (cur) { order.push(zoneOf(cur)); cur = QUESTS.find(q => q.prev === cur.id); }
      return order;
    });
    // Zones must never decrease as the chain advances.
    for (let i = 1; i < zonesInOrder.length; i++) expect(zonesInOrder[i]).toBeGreaterThanOrEqual(zonesInOrder[i - 1]);
    expect(zonesInOrder[0]).toBe(1);
    expect(zonesInOrder[zonesInOrder.length - 1]).toBe(5);
  });

  test('every combat zone has a 1% rare-hunt and a boss-kill quest', async ({ game }) => {
    const r = await game.evaluate(() => {
      const relics = ['rift_seed', 'wither_heart', 'resonant_core', 'rift_sigil'];
      const bosses = ['slime_sov', 'goblin_chief', 'crystal_lich', 'fallen_oracle'];
      const collects = QUESTS.flatMap(q => q.tasks.filter(t => t.type === 'col').map(t => t.item));
      const kills = QUESTS.flatMap(q => q.tasks.filter(t => t.type === 'kill').map(t => t.tgt));
      return {
        relicsCovered: relics.every(r => collects.includes(r)),
        bossesCovered: bosses.every(b => kills.includes(b)),
        finalBoss: kills.includes('hollow_oracle'),
      };
    });
    expect(r.relicsCovered).toBe(true);
    expect(r.bossesCovered).toBe(true);
    expect(r.finalBoss).toBe(true);
  });

  test('npcQuest resolves the right quest per giver as the story advances', async ({ game }) => {
    const r = await game.evaluate(() => {
      ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].forEach(id => G.questStates[id] = 'done');
      G.level = 8;
      const mira = npcQuest({ name: 'Elder Mira' }).id;       // next available → q7
      G.questStates['q7'] = 'done';
      const tomlin = npcQuest({ name: 'Guard Tomlin' }).id;   // q8 now available
      G.questStates['q7'] = 'active';
      const miraActive = npcQuest({ name: 'Elder Mira' }).id; // prefers active → q7
      return { mira, tomlin, miraActive };
    });
    expect(r.mira).toBe('q7');
    expect(r.tomlin).toBe('q8');
    expect(r.miraActive).toBe('q7');
  });

  test('accepting and completing q1 grants its rewards', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = {}; G.questProg = {}; G.kills = {}; G.inventory = []; G.gold = 0; G.equipment = { weapon: null, armor: null };
      acceptQ('q1');
      const accepted = G.questStates.q1 === 'active';
      // Progress is tracked per-quest from acceptance: credit 15 slime kills + 2 slime_goo loots.
      G.questProg.q1.kills.slime = 15; G.questProg.q1.items.slime_goo = 2;
      const ready = isQDone('q1');
      turnInQ('q1');
      return { accepted, ready, done: G.questStates.q1 === 'done', gold: G.gold, armor: G.equipment.armor && G.equipment.armor.n };
    });
    expect(r.accepted).toBe(true);
    expect(r.ready).toBe(true);
    expect(r.done).toBe(true);
    expect(r.gold).toBe(15);
    expect(r.armor).toBe('Apprentice Robe'); // q1 reward item
  });

  test('accepting a quest resets its counters — prior lifetime kills/loot do not count', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = {}; G.questProg = {}; G.level = 1;
      G.kills = { slime: 99 }; G.inventory = [{ id: 'slime_goo', qty: 50 }]; // lots of prior progress
      acceptQ('q1');
      const progAtAccept = qProg('q1');
      const doneAtAccept = isQDone('q1');
      questCredit('kill', 'slime'); questCredit('col', 'slime_goo'); // +1 each, after accepting
      return { progAtAccept, doneAtAccept, killAfter: G.questProg.q1.kills.slime, itemAfter: G.questProg.q1.items.slime_goo };
    });
    expect(r.doneAtAccept).toBe(false);     // 99 lifetime kills / 50 goo are ignored
    expect(r.progAtAccept).toContain('0/15');
    expect(r.progAtAccept).toContain('0/2');
    expect(r.killAfter).toBe(1);
    expect(r.itemAfter).toBe(1);
  });

  test('killing and looting credit active quests (counters advance from zero)', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.questStates = { q1: 'active' }; G.questProg = { q1: { kills: {}, items: {} } };
      T.clear(); T.resetPlayer(); G.zone = 1; CZ = ZD[1]; G.hp = 999; G.maxHp = 999;
      const m = mkMon('slime', PL.x + 500, 260);
      const o = Math.random; Math.random = () => 0.99; try { killM(m); } finally { Math.random = o; } // 0.99 → no loot drop during kill
      const killCredit = G.questProg.q1.kills.slime || 0;
      addItem('slime_goo');
      return { killCredit, lootCredit: G.questProg.q1.items.slime_goo || 0 };
    });
    expect(r.killCredit).toBe(1);
    expect(r.lootCredit).toBe(1);
  });

  test('regular-monster kill quests demand 5× kills for 2× XP', async ({ game }) => {
    const r = await game.evaluate(() => {
      const expectKills = { q1: 15, q2: 20, q3: 25, q4: 15, q5: 25, q6: 20 };
      const expectXp = { q1: 120, q2: 180, q3: 300, q4: 600, q5: 900, q6: 1100 };
      const out = {};
      for (const id in expectKills) { const q = QUESTS.find(x => x.id === id), k = q.tasks.find(t => t.type === 'kill'); out[id] = { n: k.n, xp: q.rew.xp }; }
      return { out, expectKills, expectXp };
    });
    for (const id in r.expectKills) {
      expect(r.out[id].n, id + ' kill count').toBe(r.expectKills[id]);
      expect(r.out[id].xp, id + ' xp reward').toBe(r.expectXp[id]);
    }
  });

  test('q14 turn-in hands out the guaranteed Legendary staff', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: null, armor: null }; G.questStates = { q14: 'active' }; G.questProg = { q14: { kills: { fallen_oracle: 1 }, items: {} } };
      const ready = isQDone('q14');
      turnInQ('q14');
      const w = G.equipment.weapon;
      return { ready, name: w && w.n, rar: w && w.rar };
    });
    expect(r.ready).toBe(true);
    expect(r.name).toBe('Staff of the Sealed Door');
    expect(r.rar).toBe(4); // Legendary
  });

  test('q15 is the level-25 finale that teleports into the Rift', async ({ game }) => {
    const meta = await game.evaluate(() => { const q = QUESTS.find(x => x.id === 'q15'); return { rlvl: q.rlvl, tp: q.tp, prev: q.prev, task: q.tasks[0] }; });
    expect(meta.rlvl).toBe(25);
    expect(meta.tp).toBe(5);
    expect(meta.prev).toBe('q14');
    expect(meta.task).toEqual({ type: 'kill', tgt: 'hollow_oracle', n: 1 });

    const r = await game.evaluate(() => {
      QUESTS.slice(0, 14).forEach(q => G.questStates[q.id] = 'done');
      G.level = 25; mons.length = 0;
      acceptQ('q15');
      return { zone: G.zone, boss: mons.some(m => m.boss && m.t === 'hollow_oracle') };
    });
    expect(r.zone).toBe(5);
    expect(r.boss).toBe(true);
  });

  test('qProg / monName render kill targets by display name', async ({ game }) => {
    const r = await game.evaluate(() => ({
      slime: monName('slime'), boss: monName('slime_sov'),
      prog: (G.questStates.q8 = 'active', qProg('q8')),
    }));
    expect(r.slime).toBe('Slime');
    expect(r.boss).toBe('Slime Sovereign');
    expect(r.prog).toContain('Slime Sovereign');
  });

  test('rare-relic collection quests name the monster that drops the item', async ({ game }) => {
    const r = await game.evaluate(() => {
      const src = { wither_heart: 'Cave Bat', resonant_core: 'Crystal Golem', rift_sigil: 'Skeleton Archer', rift_seed: 'Slime' };
      const probe = {};
      // q7/q9/q11/q13 are the per-zone relic hunts (single col task)
      ['q7', 'q9', 'q11', 'q13'].forEach(id => { G.questStates[id] = 'active'; probe[id] = qProg(id); });
      return { probe, source: itemSource('wither_heart'), sourceCommon: itemSource('crystal_shard'), sourceNone: itemSource('nope') };
    });
    expect(r.source).toBe('Cave Bat');
    expect(r.sourceCommon).toBe('Crystal Golem'); // works for common materials too
    expect(r.sourceNone).toBeNull();
    expect(r.probe.q7).toContain('drops from Slime');
    expect(r.probe.q9).toContain('drops from Cave Bat');
    expect(r.probe.q11).toContain('drops from Crystal Golem');
    expect(r.probe.q13).toContain('drops from Skeleton Archer');
  });
});
