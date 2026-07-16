// Phase 1 — Ground truth: themed platform terrain, portal gates, zone-name wipe.
// Verifies the offscreen platform-skin cache, its per-zone invalidation, the portal
// arrival flash, and the zone-card transition timer — all cosmetic, no gameplay math.
const { test, expect } = require('./fixtures');

test('platform skins render, cache per platform, and clear on zone change', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    cv.width = 640; cv.height = 408; ctx2 = cv.getContext('2d'); ctx2.imageSmoothingEnabled = false;
    loadZone(1);
    const beforeKeys = Object.keys(platSkinCache).length; // fresh zone → empty cache
    draw();
    const afterDraw = Object.keys(platSkinCache);
    const sample = platSkin(plats[0]);
    // key grammar is theme:x:w:h and the skin is a taller-than-platform offscreen canvas
    const keyOk = afterDraw.every(k => k.split(':').length === 4);
    const tallerThanPlat = sample.height > plats[0].h;
    loadZone(3); // switching zones must invalidate the cache
    const clearedThenRepainted = Object.keys(platSkinCache).length;
    draw();
    const cavernKeys = Object.keys(platSkinCache).length;
    return { beforeKeys, afterCount: afterDraw.length, keyOk, tallerThanPlat, clearedThenRepainted, cavernKeys };
  });
  expect(r.beforeKeys).toBe(0);
  expect(r.afterCount).toBeGreaterThan(0);
  expect(r.keyOk).toBe(true);
  expect(r.tallerThanPlat).toBe(true);
  expect(r.clearedThenRepainted).toBe(0);   // cache wiped on loadZone(3)
  expect(r.cavernKeys).toBeGreaterThan(0);
});

test('every zone has a platform theme and draws its terrain without error', async ({ game: page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const themes = await page.evaluate(() => {
    cv.width = 640; cv.height = 408; ctx2 = cv.getContext('2d'); ctx2.imageSmoothingEnabled = false;
    const seen = {};
    for (let z = 0; z <= 10; z++) { loadZone(z); seen[z] = platTheme(); gTime += 0.4; draw(); }
    return seen;
  });
  // zone 10 (Riftheart) gets its own flesh-stone theme distinct from the generic rift
  expect(themes[10]).toBe('riftheart');
  expect(themes[5]).toBe('rift');
  expect(themes[0]).toBe('city');
  expect(themes[8]).toBe('glacier');
  expect(consoleErrors).toEqual([]);
});

test('walking a portal fires the arrival bloom and a zone-name card', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    cv.width = 640; cv.height = 408; ctx2 = cv.getContext('2d'); ctx2.imageSmoothingEnabled = false;
    G.level = 40; // clear any level lock
    loadZone(1);
    portalFlashT = 0; zoneCardT = 0;
    const p = portals2.find(pp => pp.toZone === 2) || portals2[0];
    enterPortal(p);
    const flashSet = portalFlashT > 0;
    const cardSet = zoneCardT > 0;
    const cardVisible = document.getElementById('ztrans').classList.contains('show');
    // the timers drain via tick(); simulate a few frames of decay
    lt = performance.now(); tick(performance.now() + 700);
    return { flashSet, cardSet, cardVisible, zone: G.zone };
  });
  expect(r.zone).toBe(2);
  expect(r.flashSet).toBe(true);
  expect(r.cardSet).toBe(true);
  expect(r.cardVisible).toBe(true);
});
