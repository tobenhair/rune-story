// The Riftheart raid (q23): Zal'Guroth, the Hollow One — a Zakum-style multi-part,
// three-stage encounter. The idol body is anchored and IMMUNE while its six arm
// part-bosses live; stage 2 exposes the core; stage 3 (40% HP) opens the third eye,
// speeds the cadence and regrows two arms. Raid-length enrage window (8 min).
const { test, expect } = require('./fixtures');

test.describe('The Riftheart raid — Zal\'Guroth', () => {
  test('q23 is the true finale: Oriax sends you through tp:10 after q22', async ({ game }) => {
    const q = await game.evaluate(() => { const q = QUESTS.find(x => x.id === 'q23'); return { giver: q.giver, rlvl: q.rlvl, prev: q.prev, tp: q.tp, task: q.tasks[0] }; });
    expect(q.giver).toBe('Sage Oriax');
    expect(q.rlvl).toBe(30);
    expect(q.prev).toBe('q22');
    expect(q.tp).toBe(10);
    expect(q.task).toEqual({ type: 'kill', tgt: 'hollow_idol', n: 1 });
  });

  test('loading the Riftheart spawns the anchored idol, impervious behind six arms', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10);
      const body = mons.find(m => m.t === 'hollow_idol'), arms = mons.filter(m => m.t === 'idol_arm');
      return {
        zone: G.zone, body: !!body, invuln: body.invuln, anchored: body.anchored, stage: body.stage,
        enrageAfter: body.enrageAfter, bscale: body.bscale,
        arms: arms.length, armsAreParts: arms.every(a => a.part && a.boss && a.anchored),
        armSheets: !!SHS.idolArm && !!SHS.hollowIdol,
      };
    });
    expect(r.zone).toBe(10);
    expect(r.body).toBe(true);
    expect(r.invuln).toBe(true);
    expect(r.anchored).toBe(true);
    expect(r.stage).toBe(1);
    expect(r.enrageAfter).toBe(480); // raid-length enrage window, not the 35s boss default
    expect(r.bscale).toBe(7);
    expect(r.arms).toBe(6);
    expect(r.armsAreParts).toBe(true);
    expect(r.armSheets).toBe(true);
  });

  test('the idol takes no damage while its arms endure', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10); T.resetPlayer();
      const body = mons.find(m => m.t === 'hollow_idol');
      projs.push({ x: body.x, y: body.y - 100, vx: 0, vy: 0, dmg: 5000, proj: 'bolt', c: '#fff', slow: false, life: 1, pw: 8, ph: 8 });
      update(0.016);
      return { hp: body.hp, mhp: body.mhp, consumed: projs.every(p => p.hostile) };
    });
    expect(r.hp).toBe(r.mhp);       // IMMUNE — not a scratch
    expect(r.consumed).toBe(true);  // the bolt splashes off it (only the idol's own volley remains)
  });

  test('auto-targeting ignores the immune body so casts go to the arms', async ({ game }) => {
    const t = await game.evaluate(() => {
      loadZone(10); T.resetPlayer();
      PL.x = 700; PL.y = 380; // hugging the idol: body is nearest, but immune
      const tgt = closest(900);
      return tgt && tgt.t;
    });
    expect(t).toBe('idol_arm');
  });

  test('shattering all six arms wakes the core — stage 2, vulnerable, no gear from parts', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10); T.resetPlayer(); G.equipment = { weapon: null, armor: null }; G.inventory = [];
      const body = mons.find(m => m.t === 'hollow_idol');
      const o = Math.random; Math.random = () => 0.99;
      try { mons.filter(m => m.t === 'idol_arm').forEach(a => killM(a)); } finally { Math.random = o; }
      const gearFromArms = !!(G.equipment.weapon || G.equipment.armor || G.inventory.some(x => x && x.g));
      updateBossAbilities(body, 0.016, 400, 400);
      return { stage: body.stage, invuln: body.invuln, gearFromArms, armsLeft: mons.filter(m => m.t === 'idol_arm').length };
    });
    expect(r.armsLeft).toBe(0);
    expect(r.stage).toBe(2);
    expect(r.invuln).toBe(false);
    expect(r.gearFromArms).toBe(false); // part-bosses pay XP/gold only
  });

  test('at 40% HP the third eye opens: stage 3, faster cadence, two arms regrow', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10); T.resetPlayer();
      const body = mons.find(m => m.t === 'hollow_idol');
      mons.filter(m => m.t === 'idol_arm').forEach(a => { a.hp = 0; killM(a); });
      updateBossAbilities(body, 0.016, 900, 900); // stage 1 → 2 (out of attack range: no projectiles)
      body.hp = Math.floor(body.mhp * 0.3);
      updateBossAbilities(body, 0.016, 900, 900); // 40% trigger
      return { stage: body.stage, regrown: mons.filter(m => m.t === 'idol_arm').length };
    });
    expect(r.stage).toBe(3);
    expect(r.regrown).toBe(2);
  });

  test('arms attack with role-specific projectiles, including gravity lobs', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10); T.resetPlayer(); projs.length = 0;
      const arms = mons.filter(m => m.t === 'idol_arm');
      const crusher = arms.find(a => a.armIdx % 3 === 0), gazer = arms.find(a => a.armIdx % 3 === 1), render = arms.find(a => a.armIdx % 3 === 2);
      crusher.a1T = 0; updateBossAbilities(crusher, 0.016, 300, 300);
      const lob = projs.find(p => p.grav);
      const vyBefore = lob.vy; update(0.1); const vyAfter = lob.vy;
      projs.length = 0; gazer.a1T = 0; updateBossAbilities(gazer, 0.016, 300, 300);
      const bolt = projs.length;
      projs.length = 0; render.a1T = 0; updateBossAbilities(render, 0.016, 300, 300);
      const fan = projs.length;
      return { lob: !!lob, falls: vyAfter > vyBefore, bolt, fan };
    });
    expect(r.lob).toBe(true);
    expect(r.falls).toBe(true); // gravity pulls the lobbed stone down
    expect(r.bolt).toBe(1);
    expect(r.fan).toBe(3);
  });

  test('the awakened core rains hollow meteors around the player', async ({ game }) => {
    const n = await game.evaluate(() => {
      loadZone(10); T.resetPlayer(); projs.length = 0;
      const body = mons.find(m => m.t === 'hollow_idol');
      mons.filter(m => m.t === 'idol_arm').forEach(a => killM(a));
      updateBossAbilities(body, 0.016, 900, 900); // wake (out of nova range)
      body.a1T = 1e9; body.a2T = 0;
      updateBossAbilities(body, 0.016, 900, 900);
      return projs.filter(p => p.hostile && p.grav && p.y < 60).length;
    });
    expect(n).toBe(4); // stage 2 meteor volley
  });

  test('the anchored core cannot be out-ranged: its Void Ring reaches the whole arena', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10); T.resetPlayer();
      PL.x = 100; PL.y = 380; // far-west platforms — the idol is anchored at x=760 (adx ~660)
      const body = mons.find(m => m.t === 'hollow_idol');
      mons.filter(m => m.t === 'idol_arm').forEach(a => killM(a));
      updateBossAbilities(body, 0.016, 900, 900); // wake -> stage 2
      body.a1T = 0; body.a2T = 1e9; // isolate the Void Ring from the meteor volley
      const adx = Math.abs(PL.x - body.x);
      updateBossAbilities(body, 0.016, PL.x - body.x, adx);
      return { adx, voidRing: projs.filter(p => p.hostile && !p.grav).length };
    });
    expect(r.adx).toBeGreaterThan(640); // used to fall outside the old gate
    expect(r.voidRing).toBe(8);          // the 8-way nova still fires at max range
  });

  test('slaying Zal\'Guroth clears the arena — the raid boss does not re-spawn', async ({ game }) => {
    const seen = await game.evaluate(() => {
      loadZone(10);
      bossTimers[10] = 320; // a ~10-min clear pushes the timer well past 300
      mons.filter(m => m.t === 'idol_arm').forEach(a => killM(a));
      killM(mons.find(m => m.t === 'hollow_idol'));
      let max = 0;
      for (let i = 0; i < 120; i++) { update(0.05); max = Math.max(max, mons.filter(m => m.boss).length); }
      return max;
    });
    expect(seen).toBe(0);
  });

  test('killing the idol pays a guaranteed Artifact and the raid achievement', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(10); T.resetPlayer(); G.equipment = { weapon: null, armor: null }; G.inventory = []; META.achievements = {};
      const body = mons.find(m => m.t === 'hollow_idol');
      killM(body);
      const all = [G.equipment.weapon, G.equipment.armor, ...G.inventory.map(x => x && x.g)].filter(Boolean);
      return { artifact: all.some(g => g.rar === 5), kills: G.kills.hollow_idol, achv: achvDone('hollowone') };
    });
    expect(r.artifact).toBe(true);
    expect(r.kills).toBe(1);
    expect(r.achv).toBe(true);
  });

  test('enrageMul honours per-boss thresholds (raid window, not the 35s default)', async ({ game }) => {
    const r = await game.evaluate(() => ({
      idolCalm: enrageMul({ boss: true, fightT: 120, enrageAfter: 480 }),
      idolLate: enrageMul({ boss: true, fightT: 490, enrageAfter: 480 }),
      normal: enrageMul({ boss: true, fightT: 120 }),
    }));
    expect(r.idolCalm).toBe(1);
    expect(r.idolLate).toBeGreaterThan(1);
    expect(r.normal).toBeGreaterThan(1);
  });
});
