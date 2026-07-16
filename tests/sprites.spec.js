// Phase 2 — Faces of Aethon: every named hub NPC maps to its own registered sheet key
// (no shared silhouettes), and the player mage reflects equipped gear (staff head + robe trim).
const { test, expect } = require('./fixtures');

test('all 15 hub NPCs map to a unique, registered sheet', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const npcs = ZD[0].npcs;
    const sheets = npcs.map(n => n.sheet);
    const missing = sheets.filter(s => !SHS[s]);
    const uniq = new Set(sheets);
    return { count: npcs.length, sheets, missing, uniqueCount: uniq.size };
  });
  expect(r.count).toBe(15);
  expect(r.missing).toEqual([]);          // every sheet key exists in SHS
  expect(r.uniqueCount).toBe(15);         // no two NPCs share a sheet
});

test('the endgame trio and service NPCs each got a dedicated new sheet', async ({ game: page }) => {
  const map = await page.evaluate(() => {
    const m = {};
    ZD[0].npcs.forEach(n => { m[n.name] = n.sheet; });
    return m;
  });
  // these four used to all be the generic "sage" sheet
  expect(map['Sage Oriax']).toBe('oriax');
  expect(map['Seer Vesper']).toBe('vesper');
  expect(map['Riftwarden Kael']).toBe('kael');
  expect(map['Astralwright Nyx']).toBe('nyx');
  // and these shared "guard"/"elder"
  expect(map['Guard Tomlin']).toBe('tomlin');
  expect(map['Forgemaster Bren']).toBe('bren');
  expect(map['Scholar Aldric']).toBe('aldric');
});

test('equipping gear re-bakes the mage sheet so loot is visible', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    const beforeR = SHS.mR;
    // give the player a Legendary weapon + armor and equip them
    G.inventory[0] = { g: { slot: 'weapon', rar: 4, bn: 'Emberforged Scepter', n: 'Legendary Emberforged Scepter', mag: 40 }, qty: 1 };
    equipGear(0);
    const afterWeapon = SHS.mR;
    const vis = mageVisual();
    return { rebaked: beforeR !== afterWeapon, wt: vis.wt, wr: vis.wr };
  });
  expect(r.rebaked).toBe(true);           // sheet object was replaced by rebuildMage()
  expect(r.wt).toBe(4);                    // Emberforged Scepter is weapon base tier 4
  expect(r.wr).toBe(4);                    // Legendary rarity
});
