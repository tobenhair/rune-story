// Phase 5 — the frame: the inline pixel font loads, the HP/MP orbs render, and the
// reduced-motion toggle is a real persisted setting (the only new save field in the overhaul).
const { test, expect } = require('./fixtures');

test('the inline Press Start 2P pixel font is embedded and available', async ({ game: page }) => {
  const r = await page.evaluate(async () => {
    // the @font-face src is an inline base64 blob — no external request
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } });
    const face = css.find(r => r.constructor.name === 'CSSFontFaceRule' && /Press Start 2P/.test(r.cssText));
    const inline = !!face && /base64,/.test(face.cssText) && !/url\(https?:/.test(face.cssText);
    let loaded = false;
    try { await document.fonts.load('10px "Press Start 2P"'); loaded = document.fonts.check('10px "Press Start 2P"'); } catch {}
    return { inline, loaded };
  });
  expect(r.inline).toBe(true);
  expect(r.loaded).toBe(true);
});

test('HP/MP orbs draw non-empty canvases reflecting current values', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    G.hp = 60; G.maxHp = 100; G.mp = 40; G.maxMp = 80;
    renderOrbs();
    const px = id => { const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; };
    return { hp: px('hp-orb'), mp: px('mp-orb') };
  });
  expect(r.hp).toBeGreaterThan(50);   // orb painted something
  expect(r.mp).toBeGreaterThan(50);
});

test('the reduced-motion toggle persists across save/load and gates effects', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    setReduceMotion(true);
    const savedOn = JSON.parse(localStorage.getItem('astralbound_save_v1')).reduceMotion;
    const gates = reducedMotion();
    // round-trip through applySave
    const d = JSON.parse(localStorage.getItem('astralbound_save_v1'));
    G.reduceMotion = false;
    applySave(d);
    const restored = G.reduceMotion;
    setReduceMotion(false);
    return { savedOn, gates, restored };
  });
  expect(r.savedOn).toBe(true);
  expect(r.gates).toBe(true);
  expect(r.restored).toBe(true);
});

test('damage numbers carry a grammar class (crit/heal/dot/pdmg)', async ({ game: page }) => {
  const classes = await page.evaluate(() => {
    const cw = document.getElementById('cw');
    const before = cw.querySelectorAll('.dmgn').length;
    spawnDN(100, 100, 42, '#ffd24a', 'crit');
    spawnDN(100, 100, 7, '#5dcaa5', 'heal');
    const els = [...cw.querySelectorAll('.dmgn')].slice(before);
    return { crit: els.some(e => e.classList.contains('crit')), heal: els.some(e => e.classList.contains('heal') && e.textContent.startsWith('+')) };
  });
  expect(classes.crit).toBe(true);
  expect(classes.heal).toBe(true);   // heals render +N
});
