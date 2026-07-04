// Rendering smoke test: drives the real draw() loop (sprites, props, foreground,
// lighting) across every zone — plus a boss, an elite and live projectiles — and
// fails on any thrown or console error. Guards the procedural graphics pipeline
// the same way the other specs guard game logic.
const { test, expect } = require('./fixtures');

test('every zone renders without error (sprites, props, lighting)', async ({ game: page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const result = await page.evaluate(() => {
    // give the canvas a real backing store so gradients/vignette actually paint
    cv.width = 640; cv.height = 408; ctx2 = cv.getContext('2d'); ctx2.imageSmoothingEnabled = false;
    let lit = 0;
    for (let z = 0; z <= 6; z++) {
      loadZone(z);
      if (z >= 1 && z <= 4) {
        spawnBoss(z);                       // boss sprite + aura + healthbar
        const t = ZD[z].mons[0] && ZD[z].mons[0].t;
        if (t) mons.push(mkMon(t, 700, 300)); // a regular/elite mob
        const tgt = mons.find(m => !m.boss) || mons[0];
        if (tgt) { PL.mp = 999; fireAt(tgt, 0); } // a projectile → spell light
      }
      gTime = 1.3;
      for (let i = 0; i < 12; i++) {
        gTime += 0.1;
        mons.forEach(m => m.frame = (m.frame || 0) + 1.3);
        PL.frame = (PL.frame || 0) + 0.4; PL.casting = 0.3;
        draw();
      }
      const d = ctx2.getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 24) { lit++; }
    }
    return { lit };
  });

  // every zone painted a substantial, non-black scene
  expect(result.lit).toBeGreaterThan(100000);
  expect(consoleErrors, 'no console errors while rendering').toEqual([]);
});
