// Priority-2 core-loop changes from the feedback roadmap (backlog.md):
//   C1 — combat that demands movement: leaper / lobber / aura enemy behaviors (`beh`).
//   C2 — safe zone entrances: entry i-frames, a no-aggro radius around portals, and
//        arena bosses that stay dormant until the player first moves/casts.
//   C5 — relic-hunt rework: bad-luck pity now starts at 25 kills (was 75) with visible
//        progress messages, and the regular kill-quest counts were halved.
const { test, expect } = require('./fixtures');

test.describe('C1 — movement-demanding enemy behaviors', () => {
  test('an aura enemy damages a standing player but not one who kites out', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; PL.inv = 0; G.hp = 500; G.maxHp = 500;
      PL.x = 600; PL.y = 388; PL.vx = 0; PL.vy = 0;
      const g = mkMon('golem', 640, 388); g.spd = 0; g.vx = 0; mons.push(g); // inside auraR (~82)
      const before = G.hp;
      for (let i = 0; i < 8; i++) update(0.1);       // >0.5s inside the field → ticks
      const insideDmg = before - G.hp;
      // now kite far out of the aura and confirm it stops hurting
      PL.x = 900; G.hp = 500; const b2 = G.hp;
      for (let i = 0; i < 8; i++) update(0.1);
      const outsideDmg = b2 - G.hp;
      return { insideDmg, outsideDmg, beh: g.beh };
    });
    expect(r.beh).toBe('aura');
    expect(r.insideDmg).toBeGreaterThan(0);
    expect(r.outsideDmg).toBe(0);
  });

  test('a lobber fires a hostile gravity-arced projectile at range', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; PL.inv = 0; G.hp = 500; G.maxHp = 500;
      PL.x = 400; PL.y = 388; PL.vx = 0; PL.vy = 0;
      const s = mkMon('skeleton', 550, 388); s.spd = 0; s.vx = 0; mons.push(s);
      for (let i = 0; i < 16; i++) update(0.1);
      const lobs = projs.filter(p => p.grav && p.hostile);
      return { beh: s.beh, lobCount: lobs.length };
    });
    expect(r.beh).toBe('lob');
    expect(r.lobCount).toBeGreaterThan(0);
  });

  test('a leaper telegraphs a crouch then springs off the ground', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; PL.inv = 0; G.hp = 999; G.maxHp = 999;
      PL.x = 400; PL.y = 388; PL.vx = 0; PL.vy = 0;
      const gob = mkMon('goblin', 500, 388); gob.spd = 0; gob.vx = 0; gob.leapCd = 0; mons.push(gob);
      update(0.05); const windUp = gob.leapWind > 0; // crouch telegraph armed
      let minVy = 0, leaped = false;
      for (let i = 0; i < 14; i++) { update(0.05); if (gob.vy < minVy) minVy = gob.vy; if (gob.leaping > 0) leaped = true; }
      return { beh: gob.beh, windUp, minVy, leaped };
    });
    expect(r.beh).toBe('leap');
    expect(r.windUp).toBe(true);
    expect(r.leaped).toBe(true);
    expect(r.minVy).toBeLessThan(0); // launched upward
  });
});

test.describe('C4 — new enemy archetypes', () => {
  test('a shielded enemy shrugs off spells unless you dash through its ward', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; PL.x = 300; PL.y = 260;
      const mk = () => { const m = T.mon('wraith', 500, 260, null); m.hp = m.mhp = 5000; return m; };
      const hit = (dashing) => { const m = mk(); mons.length = 0; mons.push(m); PL.dashT = dashing ? 0.2 : 0; projs.length = 0;
        projs.push({ x: m.x, y: m.y, vx: 120, vy: 0, dmg: 100, proj: 'bolt', c: '#fff', life: 1, pw: 8, ph: 8 });
        update(0.02); return m.mhp - m.hp; };
      return { beh: mk().beh, warded: hit(false), dashed: hit(true) };
    });
    expect(r.beh).toBe('shield');
    expect(r.warded).toBeLessThan(40);      // ~0.18× while the ward holds
    expect(r.dashed).toBeGreaterThanOrEqual(90); // dashing through breaks it → full hit
  });

  test('a bomber lights a fuse and detonates, dying and damaging a close player', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; G.hp = 4000; G.maxHp = 4000;
      G.level = 50; G.xpNext = 1e9; // stop the kill's XP from leveling up + full-healing, which would mask the blast
      const a = T.mon('ashwing', 430, 300, null); a.spd = 0; a.vx = 0; mons.push(a);
      const before = G.hp; let gone = false;
      // pin the player next to the bomber so the blast-radius check is deterministic
      for (let i = 0; i < 90; i++) { PL.x = 400; PL.y = 300; PL.vx = 0; PL.vy = 0; PL.inv = 0; update(0.03); if (!mons.includes(a)) { gone = true; break; } }
      return { beh: a.beh, gone, took: before - G.hp };
    });
    expect(r.beh).toBe('bomb');
    expect(r.gone).toBe(true);          // detonated & removed itself
    expect(r.took).toBeGreaterThan(0);  // caught the blast standing next to it
  });
});

test.describe('C2 — safe zone entrances', () => {
  test('entering a zone grants ~1s i-frames and resets combat to not-started', async ({ game }) => {
    const r = await game.evaluate(() => { PL.inv = 0; combatStarted = true; loadZone(2); return { inv: PL.inv, started: combatStarted }; });
    expect(r.inv).toBeGreaterThanOrEqual(1.0);
    expect(r.started).toBe(false);
  });

  test('a portal safe-radius blocks aggro; stepping away lets the enemy strike', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; PL.inv = 0; G.hp = 300; G.maxHp = 300;
      const px = portals2[0].x;                     // zone-1 entrance portal
      PL.x = px; PL.y = 388; PL.vx = 0; PL.vy = 0;
      const m = mkMon('slime', px + 18, 388); m.spd = 0; m.vx = 0; mons.push(m); // in melee range
      const safeBefore = G.hp; for (let i = 0; i < 20; i++) { PL.inv = 0; update(0.08); }
      const safeDmg = safeBefore - G.hp;
      // walk out of the safe radius; now the same adjacent enemy can hit
      PL.x = 700; m.x = 718; G.hp = 300; const openBefore = G.hp;
      for (let i = 0; i < 20; i++) { PL.inv = 0; update(0.08); }
      const openDmg = openBefore - G.hp;
      return { safeDmg, openDmg };
    });
    expect(r.safeDmg).toBe(0);       // safe at the portal
    expect(r.openDmg).toBeGreaterThan(0); // exposed in the open
  });

  test('an arena boss stays dormant until the player acts, then engages', async ({ game }) => {
    const r = await game.evaluate(() => {
      loadZone(1); T.clear(); keys = {}; jp = {}; combatStarted = false;
      mons = mons.filter(m => !m.boss); spawnBoss(1);
      const boss = mons.find(m => m.boss); const x0 = boss.x;
      PL.x = boss.x - 120; PL.y = boss.y; PL.vx = 0; PL.vy = 0;
      for (let i = 0; i < 30; i++) { keys = {}; jp = {}; update(0.03); }
      const dormantMove = Math.abs(boss.x - x0), dormantFightT = boss.fightT || 0;
      combatStarted = true;                          // player has now moved/cast
      for (let i = 0; i < 10; i++) update(0.03);
      return { dormantMove, dormantFightT, engagedFightT: boss.fightT || 0 };
    });
    expect(r.dormantMove).toBeLessThan(2);   // held at its spawn
    expect(r.dormantFightT).toBe(0);         // no abilities ran while dormant
    expect(r.engagedFightT).toBeGreaterThan(0); // ability clock advances once engaged
  });
});

test.describe('C5 — relic-hunt pity rework', () => {
  test('bad-luck pity starts ramping at 25 dry kills (not 75)', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.inventory = []; G.relicPity = { rift_seed: 60 }; // past 25 → ramped; under old rules (75) still cold
      const m = mkMon('slime', 300, 260);
      const o = Math.random; Math.random = () => 0.5; try { killM(m); } finally { Math.random = o; }
      const has = (G.inventory || []).some(x => x && x.id === 'rift_seed');
      return { has, pity: G.relicPity.rift_seed || 0 };
    });
    expect(r.has).toBe(true);   // eff = 0.01 + (60-25)*0.02 = 0.71 > 0.5 → drops
    expect(r.pity).toBe(0);     // a drop resets the counter
  });

  test('a dry relic kill increments pity and stays cold below the threshold', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.inventory = []; G.relicPity = {};
      const m = mkMon('slime', 300, 260);
      const o = Math.random; Math.random = () => 0.5; try { killM(m); } finally { Math.random = o; } // rift_seed 0.01 → no drop
      return { has: (G.inventory || []).some(x => x && x.id === 'rift_seed'), pity: G.relicPity.rift_seed || 0 };
    });
    expect(r.has).toBe(false);
    expect(r.pity).toBe(1);
  });
});
