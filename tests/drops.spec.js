// Ground loot (MapleStory-style): kills scatter physical drops. Gold magnets to the player and
// auto-collects; items/gear are grabbed with Z (lootNearby) while in proximity; drops auto-collect
// on zone exit. rare+ gear never despawns.
const { test, expect } = require('./fixtures');

test('a kill scatters gold/items on the ground instead of auto-looting', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1); T.clear(); T.resetPlayer(); drops = []; G.gold = 0; G.inventory = [];
    const m = mkMon('slime', PL.x + 400, zGround); m.gold = 50; // far from the player → no magnet
    const o = Math.random; Math.random = () => 0; // force every drop to roll
    try { killM(m); } finally { Math.random = o; }
    return {
      walletStayed: G.gold, invStayed: G.inventory.filter(Boolean).length,
      goldDrops: drops.filter(d => d.kind === 'gold').length,
      itemDrops: drops.filter(d => d.kind === 'item').length,
      gearDrops: drops.filter(d => d.kind === 'gear').length,
    };
  });
  expect(r.walletStayed).toBe(0);        // gold did NOT go straight to the wallet
  expect(r.invStayed).toBe(0);           // nor items to the bag
  expect(r.goldDrops).toBeGreaterThan(0);
  expect(r.itemDrops).toBeGreaterThan(0);
  expect(r.gearDrops).toBeGreaterThan(0);
});

test('gold auto-collects on proximity; items wait for Z', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1); T.clear(); T.resetPlayer(); drops = []; G.gold = 0; G.inventory = [];
    PL.x = 500; PL.y = zGround; PL.vx = 0; PL.vy = 0;
    dropGold(500, zGround, 40);
    for (let i = 0; i < 40; i++) update(0.05);       // coins fall, magnet in, auto-collect
    const goldGot = G.gold, goldLeft = drops.filter(d => d.kind === 'gold').length;
    drops = []; G.inventory = [];
    dropItem(506, zGround, 'slime_goo');
    for (let i = 0; i < 25; i++) update(0.05);        // an item does NOT auto-collect
    const autoItem = G.inventory.some(x => x && x.id === 'slime_goo');
    const onGround = drops.some(d => d.kind === 'item');
    lootNearby();                                     // Z → grabs it (in proximity)
    const afterZ = G.inventory.some(x => x && x.id === 'slime_goo');
    return { goldGot, goldLeft, autoItem, onGround, afterZ };
  });
  expect(r.goldGot).toBe(40);      // both coins vacuumed up
  expect(r.goldLeft).toBe(0);
  expect(r.autoItem).toBe(false);  // items never auto-collect
  expect(r.onGround).toBe(true);   // it sat on the floor
  expect(r.afterZ).toBe(true);     // Z looted it while nearby
});

test('Z only loots items within reach, and gold is left for the magnet', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1); T.clear(); T.resetPlayer(); drops = []; G.inventory = [];
    PL.x = 500; PL.y = zGround;
    dropItem(510, zGround, 'slime_goo');   // in reach
    dropItem(900, zGround, 'goblin_ear');  // far away
    dropGold(505, zGround, 10);            // gold ignored by Z
    drops.forEach(d => { d.landed = true; d.vy = 0; }); // settle them in place
    lootNearby();
    return {
      near: G.inventory.some(x => x && x.id === 'slime_goo'),
      far: G.inventory.some(x => x && x.id === 'goblin_ear'),
      goldLeft: drops.some(d => d.kind === 'gold'),
    };
  });
  expect(r.near).toBe(true);      // nearby item looted
  expect(r.far).toBe(false);      // out-of-range item left on the floor
  expect(r.goldLeft).toBe(true);  // Z doesn't touch gold
});

test('rare+ gear persists; common drops despawn; zone exit auto-collects everything', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1); drops = [];
    dropGear(0, 0, { slot: 'weapon', rar: 1, e: '⚔' }); // uncommon → despawns
    dropGear(0, 0, { slot: 'weapon', rar: 2, e: '⚔' }); // rare → persists
    const finite = drops[0].life < 1e6, infinite = drops[1].life > 1e6;
    // zone exit collects whatever is on the ground
    drops = []; G.gold = 0; G.inventory = [];
    dropGold(0, 0, 25); dropItem(0, 0, 'slime_goo');
    loadZone(2);
    return { finite, infinite, gold: G.gold, hasItem: G.inventory.some(x => x && x.id === 'slime_goo'), cleared: drops.length };
  });
  expect(r.finite).toBe(true);
  expect(r.infinite).toBe(true);
  expect(r.gold).toBe(25);        // gold swept up on the way out
  expect(r.hasItem).toBe(true);   // item too
  expect(r.cleared).toBe(0);      // the new zone starts with a clean floor
});
