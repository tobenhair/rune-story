const { test, expect } = require('./fixtures');

test.describe('Quests', () => {
  test('all 15 quests are well-formed and sequentially chained', async ({ game }) => {
    const r = await game.evaluate(() => {
      const givers = new Set(['Elder Mira', 'Guard Tomlin', 'Ranger Sylva', 'Sage Oriax', 'Scholar Aldric', 'Seer Vesper']);
      const problems = [];
      QUESTS.forEach((q, i) => {
        if (q.id !== 'q' + (i + 1)) problems.push('id ' + q.id);
        if (!givers.has(q.giver)) problems.push('giver ' + q.giver);
        if (typeof q.rlvl !== 'number') problems.push('rlvl ' + q.id);
        if (!Array.isArray(q.tasks) || !q.tasks.length) problems.push('tasks ' + q.id);
        if (!q.rew) problems.push('rew ' + q.id);
        const wantPrev = i === 0 ? null : 'q' + i;
        if (q.prev !== wantPrev) problems.push('prev ' + q.id);
      });
      return { count: QUESTS.length, problems };
    });
    expect(r.count).toBe(15);
    expect(r.problems).toEqual([]);
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
      G.questStates = {}; G.kills = {}; G.inventory = []; G.gold = 0; G.equipment = { weapon: null, armor: null };
      acceptQ('q1');
      const accepted = G.questStates.q1 === 'active';
      G.kills.slime = 3; G.inventory = [{ id: 'slime_goo', qty: 2 }];
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

  test('q14 turn-in hands out the guaranteed Legendary staff', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: null, armor: null }; G.questStates = { q14: 'active' }; G.kills = { fallen_oracle: 1 };
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
});
