// Shared Playwright fixture: boots AstralBound (index.html) in headless Chromium
// and hands tests a page whose game globals (G, PL, mons, QUESTS, mkMon, …) are
// driveable via page.evaluate. The RAF loop is cancelled so tests step the game
// deterministically. Any uncaught page error fails the test.
const base = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const GAME_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

const test = base.test.extend({
  game: async ({ page }, use) => {
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
    await page.goto(GAME_URL);
    // Fresh browser → no save → startGame() boots straight into the world.
    await page.evaluate(() => {
      startGame();
      cancelAnimationFrame(raf); // take manual control of time
      // In-page test helpers (live on window for later evaluate calls)
      window.T = {
        // Run fn with Math.random returning the given sequence (then 0.5).
        withRandom(seq, fn) {
          const orig = Math.random; let i = 0;
          Math.random = () => (i < seq.length ? seq[i++] : 0.5);
          try { return fn(); } finally { Math.random = orig; }
        },
        clear() { mons.length = 0; projs.length = 0; jp = {}; },
        // Place the player somewhere safe and reset transient combat state.
        resetPlayer() { PL.x = 200; PL.y = 260; PL.vx = 0; PL.vy = 0; PL.inv = 0; PL.dashT = 0; PL.dashCd = 0; PL.trail = []; },
        // mkMon forcing a specific elite affix (or non-elite when affix is null).
        mon(type, x, y, affix) {
          const idx = affix == null ? -1 : ['frenzied', 'vampiric', 'explosive', 'armored'].indexOf(affix);
          const seq = affix == null ? [0.5, 0.5, 0.9, 0.5] : [0.0, (idx + 0.5) / 4, 0.9, 0.5];
          return this.withRandom(seq, () => mkMon(type, x, y));
        },
      };
    });
    await use(page);
    base.expect(pageErrors, 'no uncaught page errors during test').toEqual([]);
  },
});

module.exports = { test, expect: base.expect, GAME_URL };
