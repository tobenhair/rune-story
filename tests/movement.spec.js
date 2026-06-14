const { test, expect } = require('./fixtures');

test.describe('Movement & dodge dash', () => {
  test('dash triggers a burst with i-frames and a cooldown', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 0; CZ = ZD[0];
      jp = { shift: true }; update(0.016);
      return { dashT: PL.dashT, dashCd: PL.dashCd, inv: PL.inv, vx: PL.vx };
    });
    expect(r.dashT).toBeGreaterThan(0);
    expect(r.dashCd).toBeGreaterThan(0);
    expect(r.inv).toBeGreaterThanOrEqual(0.24); // i-frames active (after one dt decrement)
    expect(Math.abs(r.vx)).toBeGreaterThan(400);
  });

  test('the dash moves the player horizontally', async ({ game }) => {
    const dx = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 0; CZ = ZD[0];
      const x0 = PL.x; jp = { shift: true }; update(0.016); jp = {};
      for (let k = 0; k < 12; k++) update(0.016);
      return PL.x - x0;
    });
    expect(dx).toBeGreaterThan(40);
  });

  test('the dash respects its cooldown', async ({ game }) => {
    const retrigger = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 0; CZ = ZD[0];
      jp = { shift: true }; update(0.016); jp = {};
      PL.dashT = 0; // dash ended but cooldown still running
      jp = { shift: true }; update(0.016);
      return PL.dashT; // should stay 0 — no new dash while on cooldown
    });
    expect(retrigger).toBe(0);
  });

  test('i-frames block both contact and projectile damage', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 1; CZ = ZD[1]; G.hp = 500; G.maxHp = 500;
      // Contact: with i-frames up, an overlapping monster deals no damage
      mons.push(mkMon('goblin', PL.x, PL.y)); PL.inv = 0.3; update(0.05);
      const contactSafe = G.hp === 500;
      // Projectile: a hostile orb overlapping the player is ignored during i-frames
      T.clear(); G.hp = 500; PL.inv = 0.3;
      projs.push({ x: PL.x, y: PL.y, vx: 0, vy: 0, dmg: 40, proj: 'curseOrb', c: '#f00', hostile: true, life: 1, pw: 8, ph: 8 });
      update(0.016);
      const projSafe = G.hp === 500;
      // Control: with no i-frames, the same projectile lands
      T.clear(); G.hp = 500; PL.inv = 0;
      projs.push({ x: PL.x, y: PL.y, vx: 0, vy: 0, dmg: 40, proj: 'curseOrb', c: '#f00', hostile: true, life: 1, pw: 8, ph: 8 });
      update(0.016);
      const tookDmg = G.hp < 500;
      return { contactSafe, projSafe, tookDmg };
    });
    expect(r.contactSafe).toBe(true);
    expect(r.projSafe).toBe(true);
    expect(r.tookDmg).toBe(true);
  });

  test('dash state resets on respawn and zone load', async ({ game }) => {
    const r = await game.evaluate(() => {
      PL.dashT = 5; PL.dashCd = 5; PL.trail = [1, 2, 3]; respawn();
      const afterRespawn = { dashT: PL.dashT, dashCd: PL.dashCd, trail: PL.trail.length };
      PL.dashT = 5; PL.dashCd = 5; PL.trail = [1, 2, 3]; loadZone(0);
      const afterLoad = { dashT: PL.dashT, dashCd: PL.dashCd, trail: PL.trail.length };
      return { afterRespawn, afterLoad };
    });
    expect(r.afterRespawn).toEqual({ dashT: 0, dashCd: 0, trail: 0 });
    expect(r.afterLoad).toEqual({ dashT: 0, dashCd: 0, trail: 0 });
  });

  test('jumping from the ground produces upward velocity', async ({ game }) => {
    const vy = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 0; CZ = ZD[0]; PL.gnd = true;
      jp = { ' ': true }; update(0.016);
      return PL.vy;
    });
    expect(vy).toBeLessThan(0); // moving up
  });

  test('falling into the pit costs HP', async ({ game }) => {
    const r = await game.evaluate(() => {
      T.clear(); T.resetPlayer(); G.zone = 1; CZ = ZD[1]; G.hp = 100; G.maxHp = 100;
      PL.y = 460; jp = {}; update(0.016);
      return G.hp;
    });
    expect(r).toBe(85); // -15 on fall
  });
});
