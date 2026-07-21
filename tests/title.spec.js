// Title / character screen: the warm animated welcome. The fixture boots past the title (via
// startGame), so these drive the title's building blocks directly — they must exist and paint
// without error, and the naming live-echo must update the card.
const { test, expect } = require('./fixtures');

test('the title backdrop and hero draw without error and paint a warm, non-black scene', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 240; c.height = 150;
    const ctx = c.getContext('2d');
    titleScene(ctx, c.width, c.height, 1.2);        // backdrop
    const hero = document.getElementById('preview-canvas');
    titleFlourish = 1.3; drawHero(hero, 0.016);      // hero + an active flourish
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0, warm = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
      if (d[i] > d[i + 2] + 15) warm++;              // red channel dominates blue → warm
    }
    return { lit, warm, total: d.length / 4, lines: TITLE_LINES.length, hasChime: typeof sfxTitleChime === 'function', hasTheme: typeof playTitle === 'function' };
  });
  expect(r.lit).toBeGreaterThan(r.total * 0.5);   // most of the scene is painted
  expect(r.warm).toBeGreaterThan(r.total * 0.2);  // and it skews warm, not cold blue
  expect(r.lines).toBeGreaterThan(1);             // rotating subtitle pool exists
  expect(r.hasChime).toBe(true);
  expect(r.hasTheme).toBe(true);
});

test('typing a name live-echoes into the character card', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const cin = document.getElementById('cin');
    cin.value = 'Lyra'; onNameInput();
    const named = { name: document.getElementById('cname2').textContent, desc: document.getElementById('cdesc').textContent.includes('Lyra') };
    cin.value = ''; onNameInput();
    const blank = document.getElementById('cname2').textContent;
    return { named, blank };
  });
  expect(r.named.name).toBe('Lyra');
  expect(r.named.desc).toBe(true);     // the description addresses the player by name
  expect(r.blank).toBe('Mage');        // clearing the field restores the default
});
