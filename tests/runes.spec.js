const { test, expect } = require('./fixtures');

// Runes & sockets (Proposal 3): gear is drilled with sockets at the Forge, then runes slotted
// in for runtime stat bonuses. All bonuses are neutral when nothing is socketed.

test.describe('Runes & sockets', () => {
  test('runes are defined and injected into the item table', async ({ game }) => {
    const r = await game.evaluate(() => ({
      ids: Object.keys(RUNES),
      inItems: !!(ITEMS.rune_ruby && ITEMS.rune_ruby.rune),
      bulkSell: isBulkSellable({ id: 'rune_ruby', qty: 1 }),
    }));
    expect(r.ids).toEqual(['rune_ruby', 'rune_emerald', 'rune_topaz', 'rune_amethyst', 'rune_citrine', 'rune_onyx']);
    expect(r.inItems).toBe(true);
    expect(r.bulkSell).toBe(false); // runes are never sold by "sell all materials"
  });

  test('drilling a socket and slotting a rune adds and removes its bonus', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.gold = 5000;
      G.equipment = { weapon: { slot: 'weapon', rar: 2, n: 'W', mag: 10 }, armor: null };
      G.inventory = [{ id: 'rune_ruby', qty: 1 }];
      G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      const mag0 = eqMag();
      drillSocket('weapon');
      const sockets = G.equipment.weapon.sockets.length;
      socketRune('weapon', 0, 'rune_ruby');
      const mag1 = eqMag(), consumed = !G.inventory.some(x => x && x.id === 'rune_ruby');
      unsocketRune('weapon', 0);
      const mag2 = eqMag(), returned = G.inventory.some(x => x && x.id === 'rune_ruby');
      return { mag0, sockets, mag1, mag2, consumed, returned };
    });
    expect(r.mag0).toBe(10);
    expect(r.sockets).toBe(1);
    expect(r.mag1).toBe(17);     // +7 from Ruby
    expect(r.consumed).toBe(true);
    expect(r.mag2).toBe(10);     // bonus gone after unsocket
    expect(r.returned).toBe(true);
  });

  test('rune bonuses feed crit and the find multiplier', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: { slot: 'weapon', rar: 2, n: 'W', mag: 5, sockets: ['rune_topaz'] }, armor: { slot: 'armor', rar: 2, n: 'A', def: 3, hp: 10, sockets: ['rune_citrine'] } };
      const out = { crit: Math.round(runeCrit() * 100) / 100, find: Math.round(runeFind() * 100) / 100 };
      G.equipment = { weapon: null, armor: null };
      return out;
    });
    expect(r.crit).toBe(0.06);
    expect(r.find).toBe(1.12);
  });

  test('max sockets grows with the Grand Forge', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.city.forge = 0; const base = maxSockets();
      G.city.forge = 1; const lvl1 = maxSockets();
      G.city.forge = 0;
      return { base, lvl1 };
    });
    expect(r.base).toBe(2);
    expect(r.lvl1).toBe(3);
  });

  test('runes can be bought for gold at the Forge', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.gold = 1000; G.inventory = []; G.city = { sanctum: 0, forge: 0, apothecary: 0, guild: 0, vault: 0 };
      buyRune('rune_ruby');
      return { gold: G.gold, have: G.inventory.some(x => x && x.id === 'rune_ruby') };
    });
    expect(r.gold).toBe(700); // 1000 - 300
    expect(r.have).toBe(true);
  });

  test('runes in storage are socketable from the Forge (bag-overflow case)', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.equipment = { weapon: { slot: 'weapon', rar: 2, n: 'W', mag: 5, sockets: [null] }, armor: null };
      G.inventory = [];                       // rune sits only in storage, not the bag
      G.storage = [{ id: 'rune_ruby', qty: 1 }];
      const seen = countItemAll('rune_ruby');
      socketRune('weapon', 0, 'rune_ruby');
      return { seen, socketed: G.equipment.weapon.sockets[0], storageLeft: countItemAll('rune_ruby') };
    });
    expect(r.seen).toBe(1);                    // Forge sees the rune even though the bag is empty
    expect(r.socketed).toBe('rune_ruby');      // and can socket it
    expect(r.storageLeft).toBe(0);             // consumed from storage
  });
});

test.describe('Respec & school capstones', () => {
  test('respec refunds every spent point and reverts stat/spell unlocks', async ({ game }) => {
    const r = await game.evaluate(() => {
      G.skillPoints = 5; USK.clear(); G.maxMp = 80; G.maxHp = 100; G.spells = [true, false, false, true];
      learnSk('mf');  // +30 MP
      learnSk('vt');  // +60 HP
      learnSk('am');
      const mp = G.maxMp, hp = G.maxHp;
      respec();
      return { mp, hp, sp: G.skillPoints, mp2: G.maxMp, hp2: G.maxHp, usk: [...USK].length, fireball: G.spells[1] };
    });
    expect(r.mp).toBe(110); expect(r.hp).toBe(160);
    expect(r.sp).toBe(5);    // 5 - 3 spent + 3 refunded
    expect(r.mp2).toBe(80);  // mf bonus reverted
    expect(r.hp2).toBe(100); // vt bonus reverted
    expect(r.usk).toBe(0);
    expect(r.fireball).toBe(false);
  });

  test('the three school capstones exist and gate on their prerequisites', async ({ game }) => {
    const r = await game.evaluate(() => ['inferno', 'chain', 'glacier'].map(id => {
      const n = SKN.find(s => s.id === id);
      return { id, exists: !!n, req: n && n.req };
    }));
    expect(r).toEqual([
      { id: 'inferno', exists: true, req: 'py' },
      { id: 'chain', exists: true, req: 'as' },
      { id: 'glacier', exists: true, req: 'fr' },
    ]);
  });

  test('Inferno makes a Fireball hit apply a burn DoT', async ({ game }) => {
    const burn = await game.evaluate(() => {
      USK.clear(); USK.add('inferno'); G.equipment = { weapon: null, armor: null };
      const m = mkMon('slime', 200, 260, false); m.spd = 0; m.vx = 0; m.hp = 200; m.mhp = 200;
      mons.length = 0; mons.push(m);
      projs.length = 0; projs.push({ x: 200, y: 260, vx: 0, vy: 0, dmg: 30, proj: 'fireball', c: '#f00', life: 1, pw: 10, ph: 10 });
      PL.x = 200; PL.y = 260; PL.vx = 0; PL.vy = 0; PL.inv = 0;
      update(0.016);
      const b = m.burn || 0; USK.clear();
      return b;
    });
    expect(burn).toBeGreaterThan(0);
  });

  test('Chain Surge makes an Arcane Bolt arc to a second enemy', async ({ game }) => {
    const hp2 = await game.evaluate(() => {
      USK.clear(); USK.add('chain'); G.equipment = { weapon: null, armor: null };
      const m1 = mkMon('slime', 200, 260, false); m1.spd = 0; m1.vx = 0; m1.hp = 50; m1.mhp = 50;
      const m2 = mkMon('slime', 240, 260, false); m2.spd = 0; m2.vx = 0; m2.hp = 50; m2.mhp = 50;
      mons.length = 0; mons.push(m1, m2);
      projs.length = 0; projs.push({ x: 200, y: 260, vx: 0, vy: 0, dmg: 20, proj: 'bolt', c: '#00f', life: 1, pw: 8, ph: 8 });
      PL.x = 200; PL.y = 260; PL.vx = 0; PL.vy = 0; PL.inv = 0;
      update(0.016);
      const h = m2.hp; USK.clear();
      return h;
    });
    expect(hp2).toBeLessThan(50); // the bolt arced to the 2nd slime
  });
});
