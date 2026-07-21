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

test('nothing auto-collects — gold and items alike wait for Z', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1); T.clear(); T.resetPlayer(); drops = []; G.gold = 0; G.inventory = [];
    PL.x = 500; PL.y = zGround; PL.vx = 0; PL.vy = 0;
    dropGold(500, zGround, 40); dropItem(500, zGround, 'slime_goo');
    drops.forEach(d => { d.x = 500; d.y = zGround - 2; d.landed = true; d.vy = 0; }); // settle by the player
    for (let i = 0; i < 20; i++) update(0.05);        // time passes — nothing auto-collects
    const autoGold = G.gold, autoItem = G.inventory.some(x => x && x.id === 'slime_goo');
    const onGround = drops.length;
    lootNearby();                                     // Z → grabs gold AND item in proximity
    const goldGot = G.gold, gotItem = G.inventory.some(x => x && x.id === 'slime_goo');
    return { autoGold, autoItem, onGround, goldGot, gotItem, cleared: drops.length };
  });
  expect(r.autoGold).toBe(0);      // gold no longer vacuums on its own
  expect(r.autoItem).toBe(false);  // nor items
  expect(r.onGround).toBeGreaterThan(0);
  expect(r.goldGot).toBe(40);      // Z swept up the coins
  expect(r.gotItem).toBe(true);    // …and the item
  expect(r.cleared).toBe(0);
});

test('Z only loots within reach; far drops are left behind', async ({ game: page }) => {
  const r = await page.evaluate(() => {
    loadZone(1); T.clear(); T.resetPlayer(); drops = []; G.inventory = []; G.gold = 0;
    PL.x = 500; PL.y = zGround;
    dropItem(510, zGround, 'slime_goo');   // in reach
    dropGold(505, zGround, 10);            // gold in reach → Z grabs it too
    dropItem(900, zGround, 'goblin_ear');  // far away → stays
    drops.forEach(d => { d.landed = true; d.vy = 0; }); // settle them in place
    lootNearby();
    return {
      near: G.inventory.some(x => x && x.id === 'slime_goo'),
      gold: G.gold,
      far: G.inventory.some(x => x && x.id === 'goblin_ear'),
      farLeft: drops.some(d => d.kind === 'item'),
    };
  });
  expect(r.near).toBe(true);      // nearby item looted
  expect(r.gold).toBe(10);        // nearby gold looted by Z as well
  expect(r.far).toBe(false);      // out-of-range item not looted
  expect(r.farLeft).toBe(true);   // …it stays on the floor
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
