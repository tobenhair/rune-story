// Phase 6 — set dressing: hero landmarks, the Riftheart backdrop, terrain-tinted footsteps,
// spell-tinted aura light, monster leaks. All cosmetic and additive.
const { test, expect } = require('./fixtures');

test('the Riftheart has its own backdrop distinct from the generic rift', async ({ game: page }) => {
  const r = await page.evaluate(() => ({
    hasFn: typeof drawRiftheartBG === 'function',
    hasLandmarks: typeof drawLandmarks === 'function',
    riftheartTheme: (loadZone(10), platTheme()),
  }));
  expect(r.hasFn).toBe(true);
  expect(r.hasLandmarks).toBe(true);
  expect(r.riftheartTheme).toBe('riftheart');
});

test('footstep motes are terrain-tinted and respect the particle system', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.reduceMotion = false; loadZone(8);                       // glacier
    const glacierTint = themeMote();
    parts.length = 0; footMote(300, 300);
    const got = parts.length > 0, snow = got && parts[parts.length - 1].c === glacierTint;
    loadZone(2); const forestTint = themeMote();               // forest
    return { snow, got, glacierTint, forestTint };
  });
  expect(r.got).toBe(true);
  expect(r.snow).toBe(true);
  expect(r.glacierTint).toBe('#eaf4ff');
  expect(r.forestTint).not.toBe('#eaf4ff');   // themes differ
});

test('casting tints the player aura toward the spell colour for 2s', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    auraT = 0; auraCol = null; G.mp = 999;
    const m = T.mon('slime', 260, 300, null); mons.length = 0; mons.push(m);
    PL.x = 200; PL.y = 300;
    fireAt(m, 0);   // Arcane Bolt (blue)
    return { auraT, auraCol };
  });
  expect(r.auraT).toBeGreaterThan(0);
  expect(r.auraCol).toBeTruthy();
});

test('every combat/arena zone draws its landmark pass without error', async ({ game: page }) => {
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.evaluate(() => {
    cv.width = 640; cv.height = 408; ctx2 = cv.getContext('2d');
    for (const z of [1, 2, 3, 4, 5, 7, 8, 9, 10]) { loadZone(z); PL.x = 900; camX = 500; gTime += 0.3; drawLandmarks(); }
  });
  expect(errs).toEqual([]);
});
