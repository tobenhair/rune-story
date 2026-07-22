// Vertical world: tall climbable combat zones (camY vertical camera + ladders) and the limited
// attack cone that makes height matter. All cosmetic-adjacent gameplay: short zones (hub/arenas)
// keep the classic single-screen framing, so a never-scrolled game is unchanged.
const { test, expect } = require('./fixtures');

test('combat zones are tall with ladders; hub and arenas stay short', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const combat = [1, 2, 3, 4, 7, 8].map(z => ({
      z, h: ZD[z].h, ground: ZD[z].ground, ladders: (ZD[z].ladders || []).length,
    }));
    const shortZ = [0, 5, 6, 9, 10].map(z => ({ z, h: ZD[z].h, ladders: (ZD[z].ladders || []).length }));
    return { combat, shortZ };
  });
  // every combat zone declares a tall world, a low ground line, and a full run of ladders
  for (const c of r.combat) {
    expect(c.h).toBeGreaterThan(900);
    expect(c.ground).toBeGreaterThan(700);
    expect(c.ladders).toBe(8);
  }
  // hub + arenas declare no tall world and no ladders → they frame exactly as before
  for (const s of r.shortZ) {
    expect(s.h == null).toBe(true);
    expect(s.ladders).toBe(0);
  }
});

test('the vertical camera follows in a tall zone and stays pinned in a short one', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1);                                   // tall zone
    const maxTall = camYMax();
    // near the ground the camera scrolls down; near the top it scrolls back up
    PL.x = 400; PL.y = zGround - 40; for (let i = 0; i < 40; i++) update(0.05);
    const low = camY;
    PL.y = 200; for (let i = 0; i < 40; i++) update(0.05);
    const high = camY;
    loadZone(0);                                   // hub (short) — no vertical scroll
    const maxShort = camYMax();
    PL.y = zGround; for (let i = 0; i < 20; i++) update(0.05);
    const hubCam = camY;
    return { maxTall, low, high, maxShort, hubCam };
  });
  expect(r.maxTall).toBeGreaterThan(0);   // a tall zone has vertical camera range
  expect(r.low).toBeGreaterThan(r.high);  // camera is lower (bigger camY) when the player is low
  expect(r.maxShort).toBe(0);             // a short zone has no range …
  expect(r.hubCam).toBe(0);               // … so the camera never leaves the top
});

test('a ladder lets the player climb up against gravity, and dismounting stops the climb', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1);
    const lad = CZ.ladders[0];
    // stand on the ladder, mid-span
    PL.x = lad.x; PL.y = (lad.y1 + lad.y2) / 2; PL.vx = 0; PL.vy = 0; PL.climbing = false;
    keys = {}; jp = {};
    const y0 = PL.y;
    keys = { arrowup: true };
    for (let i = 0; i < 20; i++) update(0.05);
    const climbedY = PL.y, climbing = PL.climbing;
    // step off sideways → the ladder releases and gravity resumes
    keys = { arrowright: true };
    for (let i = 0; i < 10; i++) update(0.05);
    const afterOff = PL.climbing;
    return { y0, climbedY, climbing, afterOff };
  });
  expect(r.climbing).toBe(true);          // grabbed the ladder
  expect(r.climbedY).toBeLessThan(r.y0);  // moved upward (smaller y) despite gravity
  expect(r.afterOff).toBe(false);         // walking off dismounts
});

test('spells only auto-target foes within the horizontal aim cone (bosses excepted)', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    T.clear(); T.resetPlayer(); PL.x = 500; PL.y = 500;
    const above = mkMon('slime', 508, 300);   // nearly straight up → out of cone
    const side = mkMon('slime', 700, 505);    // horizontal, farther → in cone
    mons.push(above, side);
    const picked = closest(400);
    const pickedSide = picked === side;
    const aboveIn = inAimCone(above), sideIn = inAimCone(side);
    // a boss overhead is always acquirable despite the cone
    T.clear(); const boss = mkMon('slime', 508, 300); boss.boss = true; mons.push(boss);
    const bossPicked = closest(400) === boss;
    return { pickedSide, aboveIn, sideIn, bossPicked };
  });
  expect(r.aboveIn).toBe(false);
  expect(r.sideIn).toBe(true);
  expect(r.pickedSide).toBe(true);   // the closer overhead foe is skipped for the in-cone one
  expect(r.bossPicked).toBe(true);   // bosses ignore the cone
});

test('fireAt clamps a non-boss shot into the cone but lets a boss shot aim freely', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    T.clear(); T.resetPlayer(); PL.x = 500; PL.y = 500; G.mp = 999; projs.length = 0; cds[0] = 0;
    fireAt({ x: 520, y: 100 }, 0);              // steeply upward, non-boss
    const p = projs[0];
    const trashAng = Math.abs(Math.atan2(p.vy, Math.abs(p.vx)));
    projs.length = 0; cds[0] = 0; G.mp = 999;
    fireAt({ x: 520, y: 100, boss: true }, 0);  // same steep shot, but a boss
    const b = projs[0];
    const bossAng = Math.abs(Math.atan2(b.vy, Math.abs(b.vx)));
    return { trashAng, bossAng, cone: AIM_CONE };
  });
  expect(r.trashAng).toBeLessThanOrEqual(r.cone + 1e-6);  // clamped to the cone
  expect(r.bossAng).toBeGreaterThan(r.cone);              // boss shot keeps its steep angle
});

test('a point-blank foe is always targetable/aimable despite the cone', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    T.clear(); T.resetPlayer(); PL.x = 500; PL.y = 500;
    // A foe pressed right against the player reads as ~90° off horizontal (chest origin vs. its
    // feet), so without the point-blank exemption the cone would reject it entirely.
    const pointBlank = mkMon('slime', 502, 500);
    mons.push(pointBlank);
    const inCone = inAimCone(pointBlank);
    const picked = closest(400) === pointBlank;
    G.mp = 999; projs.length = 0; cds[0] = 0;
    fireAt(pointBlank, 0);            // steeply-offset but close → aims straight at it, no clamp
    const p = projs[0];
    const ang = Math.abs(Math.atan2(p.vy, Math.abs(p.vx)));
    return { inCone, picked, ang, cone: AIM_CONE };
  });
  expect(r.inCone).toBe(true);           // exempt from the cone
  expect(r.picked).toBe(true);           // auto-target acquires it
  expect(r.ang).toBeGreaterThan(r.cone); // and the shot aims straight up at it, unclamped
});
