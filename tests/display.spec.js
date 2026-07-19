// Priority-1 UX from the July 2026 feedback roadmap (see backlog.md):
//   A1 — responsive display: a fixed 16:9 internal resolution + fitCanvas() scaling +
//        a fullscreen toggle, so the game fills the window instead of letterboxing.
//   B1 — readable world-space labels: a dark backing pill (labelPill) and always-on
//        per-role glyphs above hub service NPCs.
//   B2 — quest tracker hierarchy: the active story quest pinned on top, available
//        quests collapsed into one "N new quests in Aethon City" line.
const { test, expect } = require('./fixtures');

test('A1 — the canvas boots at the fixed 16:9 internal resolution', async ({ game: page }) => {
  const r = await page.evaluate(() => ({ w: VIEW_W, h: VIEW_H, cvw: cv.width, cvh: cv.height,
    ar: +(VIEW_W / VIEW_H).toFixed(4) }));
  expect(r.w).toBe(854);
  expect(r.h).toBe(480);
  expect(r.cvw).toBe(854);
  expect(r.cvh).toBe(480);
  expect(r.ar).toBeCloseTo(16 / 9, 2);
});

test('A1 — fitCanvas scales the element to fit its container without changing the bitmap', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const box = document.getElementById('cw');
    // stub a known container size and re-fit
    Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => 1708 });
    Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 1200 });
    fitCanvas();
    const styleW = cv.style.width, styleH = cv.style.height;
    // width-limited: 1708/854 = 2.0 < 1200/480 = 2.5, so scale = 2.0 → 1708 x 960
    return { styleW, styleH, bitmapW: cv.width, bitmapH: cv.height };
  });
  expect(r.styleW).toBe('1708px');
  expect(r.styleH).toBe('960px');
  expect(r.bitmapW).toBe(854); // bitmap untouched — only the CSS box scales
  expect(r.bitmapH).toBe(480);
});

test('A1 — a fullscreen toggle exists and requests fullscreen on the shell', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    let requested = null;
    const gr = document.getElementById('gr');
    gr.requestFullscreen = function () { requested = this.id; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
    const hasBtn = !!document.querySelector('.hbtn[onclick*="toggleFullscreen"]');
    toggleFullscreen();
    return { fn: typeof toggleFullscreen, requested, hasBtn };
  });
  expect(r.fn).toBe('function');
  expect(r.requested).toBe('gr');
  expect(r.hasBtn).toBe(true);
});

test('B1 — labelPill paints a backing pill and centred text', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    cv.width = 200; cv.height = 60; ctx2 = cv.getContext('2d'); ctx2.imageSmoothingEnabled = false;
    ctx2.clearRect(0, 0, 200, 60);
    labelPill('Goblin', 100, 40, { size: 8, color: '#ffffff' });
    const d = ctx2.getImageData(0, 0, 200, 60).data;
    let painted = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) painted++;
    return { painted, fn: typeof labelPill };
  });
  expect(r.fn).toBe('function');
  expect(r.painted).toBeGreaterThan(50); // pill + glyphs actually drew
});

test('B1 — each hub service NPC maps to a role glyph; quest-only givers do not', async ({ game: page }) => {
  const r = await page.evaluate(() => ({
    forge: npcRoleIcon({ forge: true }),
    shop: npcRoleIcon({ shop: true }),
    codex: npcRoleIcon({ codex: true }),
    storage: npcRoleIcon({ storage: true }),
    board: npcRoleIcon({ board: true }),
    rift: npcRoleIcon({ rift: true }),
    asc: npcRoleIcon({ asc: true }),
    town: npcRoleIcon({ town: true }),
    questGiver: npcRoleIcon({ q: 'q1' }),
  }));
  expect(r.forge && r.shop && r.codex && r.storage && r.board && r.rift && r.asc && r.town).toBeTruthy();
  // distinct glyphs, and a pure quest-giver gets none (its !/? marker carries the meaning)
  expect(new Set([r.forge, r.shop, r.codex, r.storage, r.board, r.rift, r.asc, r.town]).size).toBe(8);
  expect(r.questGiver).toBeNull();
});

test('B2 — the tracker pins the active story quest and collapses available ones', async ({ game: page }) => {
  const html = await page.evaluate(() => {
    // fresh slate: one active story quest, the rest available/locked as the game sees them
    QUESTS.forEach(q => { delete G.questStates[q.id]; });
    G.level = 40; // clear level gates so several become "available"
    const story = QUESTS.find(q => !q.side && q.title);
    G.questStates[story.id] = 'active';
    renderQP();
    return { pinned: document.querySelector('.qtrack .qit') && document.querySelector('.qtrack .qit').textContent,
             head: !!document.querySelector('.qtrack .qtk-h'),
             collapsed: document.querySelector('.qavail') && document.querySelector('.qavail .qit').textContent,
             storyTitle: story.title };
  });
  expect(html.head).toBe(true);
  expect(html.pinned).toBe(html.storyTitle); // the active story quest is the pinned row
  expect(html.collapsed).toMatch(/\d+ new quest/); // available ones fold into one summary line
  expect(html.collapsed).toMatch(/Aethon City/);
});

test('B2 — completed quests collapse to a single count line', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    QUESTS.forEach(q => { delete G.questStates[q.id]; });
    G.questStates[QUESTS[0].id] = 'done';
    G.questStates[QUESTS[1].id] = 'done';
    G.level = 1;
    renderQP();
    const done = document.querySelectorAll('#ql .qi.done');
    return { rows: done.length, txt: done[0] && done[0].textContent };
  });
  expect(r.rows).toBe(1); // not one row per finished quest
  expect(r.txt).toMatch(/2 quests completed/);
});
