import test from 'node:test';
import assert from 'node:assert/strict';
import { BAG_KEY, REWARDS, rewardPresentation, createBubbleGame, stepBubbleGame, resizeBubbleGame, createBag, createBackpackSession, joystickVector, MAX_LIVES, FEAST_SECONDS, unlockRewards, useReward, openGift } from './bubble-core.js';
function target(state, color = state.player.color) { state.bubbles.push({ id: state.nextId++, x: state.player.x, y: state.player.y, color, radius: 20, vx: 0, vy: 0, age: 1, phase: 0 }); }
test('start with an empty arena, one random player and three lives; spawn safely', () => {
  const state = createBubbleGame(800, 500, () => .99);
  assert.equal(state.bubbles.length, 0); assert.equal(state.player.color, 6); assert.equal(state.lives, 3);
  for (let i = 0; i < 20; i++) stepBubbleGame(state, {}, .05);
  assert.ok(state.bubbles.length > 0);
  assert.ok(state.bubbles.every(b => Math.hypot(b.x - state.player.x, b.y - state.player.y) > state.player.radius + b.radius));
});
test('same color is consumed once and scores; another color costs a point and a life', () => {
  const state = createBubbleGame(800, 500, () => 0);
  target(state); let events = stepBubbleGame(state, {}, .01);
  assert.equal(state.score, 1); assert.equal(state.lives, 3); assert.equal(events[0].type, 'eat');
  stepBubbleGame(state, {}, .01); assert.equal(state.score, 1);
  target(state, 1); events = stepBubbleGame(state, {}, .01);
  assert.equal(state.score, 0); assert.equal(state.lives, 2); assert.equal(events[0].type, 'hurt');
});
test('one collision cluster cannot remove all lives, but three separate hits end the round', () => {
  const state = createBubbleGame(800, 500, () => 0);
  for (let i = 0; i < 4; i++) target(state, 1);
  stepBubbleGame(state, {}, .01); assert.equal(state.lives, 2);
  stepBubbleGame(state, {}, .01); assert.equal(state.lives, 2);
  state.bubbles = [];
  for (let hit = 0; hit < 2; hit++) { for (let i = 0; i < 28; i++) stepBubbleGame(state, {}, .05); target(state, 1); stepBubbleGame(state, {}, .01); state.bubbles = []; }
  assert.equal(state.lives, 0); assert.equal(state.status, 'over');
  const score = state.score; target(state); stepBubbleGame(state, {}, .05); assert.equal(state.score, score);
});
test('movement is bounded, diagonals are normalized, and touch movement cannot teleport', () => {
  const a = createBubbleGame(800, 500, () => 0), b = createBubbleGame(800, 500, () => 0);
  stepBubbleGame(a, { x: 1 }, .05); stepBubbleGame(b, { x: 1, y: 1 }, .05);
  assert.ok(Math.abs(Math.hypot(b.player.x - 400, b.player.y - 250) - (a.player.x - 400)) < .001);
  const before = b.player.x; stepBubbleGame(b, { target: { x: 800, y: 500 } }, .05); assert.ok(b.player.x - before < 14);
  const near = { x: b.player.x + 5, y: b.player.y };
  stepBubbleGame(b, { target: near }, .05); assert.equal(b.player.x, near.x);
  stepBubbleGame(b, { target: near }, .05); assert.equal(b.player.x, near.x); // no oscillation around a nearby drag target
  for (let i = 0; i < 100; i++) stepBubbleGame(a, { x: 1 }, .05);
  assert.ok(a.player.x <= 800 - a.player.radius);
  resizeBubbleGame(a, 320, 440); assert.ok(a.player.x <= 320 - a.player.radius);
});
test('all five milestones unlock once and survive loss of points or a new round', () => {
  const bag = createBag(); let earned = [];
  for (let score = 1; score <= 50; score++) earned.push(...unlockRewards(bag, score));
  assert.deepEqual(earned.map(r => r.id), ['frog', 'pig', 'sky', 'mermaid', 'gift']);
  assert.deepEqual(unlockRewards(bag, 50), []); unlockRewards(bag, -3);
  assert.equal(bag.unlocked.length, 4); assert.equal(bag.giftEarned, true); assert.equal(bag.bestScore, 50);
  assert.deepEqual(createBag(JSON.parse(JSON.stringify(bag))), bag);
});
test('skins and sky can combine, rewards are reusable, and the gift becomes a retained voucher', () => {
  const bag = createBag(); assert.equal(useReward(bag, 'frog'), false); assert.equal(openGift(bag), false);
  unlockRewards(bag, 50); assert.equal(bag.voucher, false);
  useReward(bag, 'frog'); useReward(bag, 'sky'); assert.equal(bag.skin, 'frog'); assert.equal(bag.background, 'sky');
  useReward(bag, 'mermaid'); assert.equal(bag.background, 'sky'); useReward(bag, 'bubble'); assert.equal(bag.skin, 'bubble');
  assert.equal(openGift(bag), true); assert.equal(bag.voucher, true); assert.equal(openGift(bag), true);
  const restored = createBag(bag); assert.equal(restored.voucher, true); assert.equal(restored.unlocked.length, 4);
  assert.equal(createBag({ skin: 'mermaid', background: 'sky', unlocked: ['invalid'] }).skin, 'bubble');
});
test('locked rewards never reveal names or art, and the last gift hides its voucher until opened', () => {
  const bag = createBag();
  assert.deepEqual(REWARDS.map(r => rewardPresentation(bag, r).name), ['奖励一','奖励二','奖励三','奖励四','奖励五']);
  for (const reward of REWARDS) { const view = rewardPresentation(bag, reward); assert.equal(view.art, 'mystery'); assert.equal(view.owned, false); assert.ok(!JSON.stringify(view).includes(reward.name)); }
  unlockRewards(bag, 10); assert.equal(rewardPresentation(bag, REWARDS[0]).art, 'frog'); assert.equal(rewardPresentation(bag, REWARDS[1]).name, '奖励二');
  unlockRewards(bag, 50); assert.equal(rewardPresentation(bag, REWARDS[4]).name, '神秘礼盒');
  openGift(bag); assert.equal(rewardPresentation(bag, REWARDS[4]).name, '榴莲兑换券');
});
test('same-color targets appear promptly even when randomness picks another color', () => {
  const state = createBubbleGame(800, 500, () => .99);
  for (let i = 0; i < 13; i++) stepBubbleGame(state, {}, .05);
  assert.ok(state.bubbles.some(b => b.color === state.player.color));
  state.bubbles = []; state.spawnIn = 10; state.matchIn = 1.4;
  for (let i = 0; i < 29; i++) stepBubbleGame(state, {}, .05);
  assert.ok(state.bubbles.some(b => b.color === state.player.color));
});
test('a field full of other colors cannot starve scoring targets or overflow the capacity', () => {
  const state = createBubbleGame(320, 440, () => .99);
  for (let i = 0; i < 15; i++) state.bubbles.push({ id: state.nextId++, x: 280, y: 40, radius: 13, color: 1, vx: 0, vy: 0, age: 1 + i, phase: 0 });
  state.matchIn = 0; stepBubbleGame(state, {}, .01);
  assert.equal(state.bubbles.length, 15); assert.ok(state.bubbles.some(b => b.color === state.player.color));
  assert.ok(!state.bubbles.some(b => b.id === 15));
});
test('weighted spawning keeps all seven colors and offers far more than one target in seven', () => {
  let seed = 65; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const state = createBubbleGame(800, 500, random), seen = new Map(); state.protection = 999;
  state.itemSpawnIn = Infinity;
  for (let i = 0; i < 2400; i++) { stepBubbleGame(state, {}, .05); for (const b of state.bubbles) seen.set(b.id, b.color); state.bubbles = []; }
  const colors = [...seen.values()], matching = colors.filter(c => c === state.player.color).length;
  assert.equal(new Set(colors).size, 7); assert.ok(colors.length > 100); assert.ok(matching / colors.length > .35);
});
function memoryStorage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; }
test('each browser owns its collection; guest rewards cannot change the saved personal collection', () => {
  const storage = memoryStorage(), personal = createBackpackSession({ storage }); personal.open();
  unlockRewards(personal.bag, 50); openGift(personal.bag); useReward(personal.bag, 'mermaid'); useReward(personal.bag, 'sky'); personal.save();
  const stored = storage.getItem(BAG_KEY);
  const otherBrowser = createBackpackSession({ storage: memoryStorage() }); assert.deepEqual(otherBrowser.open(), createBag());
  const returning = createBackpackSession({ storage }); assert.equal(returning.open().voucher, true);
  personal.enterGuest(); assert.equal(personal.mode, 'guest'); assert.deepEqual(personal.bag, createBag());
  unlockRewards(personal.bag, 20); useReward(personal.bag, 'frog'); assert.equal(personal.save(), 'guest'); assert.equal(storage.getItem(BAG_KEY), stored);
  personal.reset(); assert.equal(personal.bag.unlocked.length, 0); assert.equal(storage.getItem(BAG_KEY), stored);
  personal.leaveGuest(); assert.equal(personal.mode, 'personal'); assert.equal(personal.bag.skin, 'mermaid'); assert.equal(personal.bag.voucher, true); assert.equal(personal.bag.background, 'sky');
});
test('an explicit reset clears rewards, voucher and cosmetics, while retaining the best score', () => {
  const storage = memoryStorage(), session = createBackpackSession({ storage }); session.open();
  unlockRewards(session.bag, 50); openGift(session.bag); useReward(session.bag, 'pig'); useReward(session.bag, 'sky'); session.save();
  assert.deepEqual(session.reset(), createBag({ bestScore: 50 }));
  assert.deepEqual(createBackpackSession({ storage }).open(), createBag({ bestScore: 50 }));
});
test('blocked browser storage still preserves the personal collection when returning from guest mode', () => {
  const session = createBackpackSession({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  session.open(); unlockRewards(session.bag, 10); assert.equal(session.save(), 'memory');
  session.enterGuest(); unlockRewards(session.bag, 40); session.leaveGuest(); assert.deepEqual(session.bag.unlocked, ['frog']);
});
test('fast joystick responds at full speed after a tiny push; fine mode has a short responsive stroke', () => {
  assert.deepEqual(joystickVector(1, 1), { x: 0, y: 0 });
  const fine = joystickVector(10, 0, 18, 'fine'), fast = joystickVector(3, 0), diagonal = joystickVector(100, 100);
  assert.ok(fine.x > .5 && fine.x < .7); assert.equal(fine.y, 0); assert.equal(fast.x, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9); assert.equal(diagonal.x, diagonal.y);
  assert.equal(joystickVector(18, 0, 18, 'fine').x, 1);
  assert.equal(joystickVector(0, -3).y, -1);
  assert.deepEqual(joystickVector(NaN, 2), { x: 0, y: 0 });
});
test('touch speed settings affect movement without increasing diagonal speed or teleporting', () => {
  const normal = quietGame(), quick = quietGame(), diagonal = quietGame();
  stepBubbleGame(normal, { x: 1 }, .05); stepBubbleGame(quick, { x: 1, speedScale: 1.6 }, .05); stepBubbleGame(diagonal, { x: 1, y: 1, speedScale: 1.6 }, .05);
  assert.ok(Math.abs((quick.player.x - 400) / (normal.player.x - 400) - 1.6) < 1e-8);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - 400, diagonal.player.y - 250) - (quick.player.x - 400)) < 1e-8);
  assert.ok(quick.player.x - 400 <= 22);
});
test('reward three unlocks sky and ocean together; reward four unlocks mermaid and fairy together', () => {
  const bag = createBag();
  assert.equal(useReward(bag, 'ocean'), false); assert.equal(useReward(bag, 'fairy'), false);
  unlockRewards(bag, 30); assert.equal(useReward(bag, 'ocean'), true); assert.equal(bag.background, 'ocean'); assert.equal(useReward(bag, 'fairy'), false);
  useReward(bag, 'sky'); useReward(bag, 'sky'); assert.equal(bag.background, 'sky');
  unlockRewards(bag, 40); useReward(bag, 'fairy'); assert.equal(bag.skin, 'fairy'); assert.equal(bag.background, 'sky');
  useReward(bag, 'ocean'); useReward(bag, 'mermaid'); assert.equal(bag.background, 'ocean'); assert.equal(bag.skin, 'mermaid');
  assert.deepEqual(bag.unlocked, ['frog', 'pig', 'sky', 'mermaid']);
  useReward(bag, 'night'); assert.equal(bag.background, 'night'); assert.equal(bag.skin, 'mermaid');
});
test('existing unlocked bags gain new choices without losing scores, rewards or the voucher', () => {
  const old = createBag({ unlocked: ['frog', 'pig', 'sky', 'mermaid'], skin: 'mermaid', background: 'sky', voucher: true, bestScore: 50 });
  assert.equal(useReward(old, 'fairy'), true); assert.equal(useReward(old, 'ocean'), true);
  const restored = createBag(JSON.parse(JSON.stringify(old))); assert.equal(restored.skin, 'fairy'); assert.equal(restored.background, 'ocean'); assert.equal(restored.voucher, true); assert.equal(restored.bestScore, 50);
  const locked = createBag({ skin: 'fairy', background: 'ocean', unlocked: ['fairy', 'ocean'] }); assert.equal(locked.skin, 'bubble'); assert.equal(locked.background, 'night');
});
function pickup(state, type, overrides = {}) {
  const item = { id: state.nextId++, type, x: state.player.x, y: state.player.y, radius: 20, vx: 0, vy: 0, age: 1, ttl: 18, ...overrides }; state.pickups.push(item); return item;
}
function quietGame() { const state = createBubbleGame(800, 500, () => 0); state.spawnIn = Infinity; state.matchIn = Infinity; state.itemSpawnIn = Infinity; return state; }
test('red hearts heal once, never exceed five lives and do not change the score', () => {
  const state = quietGame(); state.lives = 1; pickup(state, 'heart');
  let events = stepBubbleGame(state, {}, .01); assert.equal(state.lives, 2); assert.equal(events[0].type, 'heal'); assert.equal(events[0].gained, true); assert.equal(state.pickups.length, 0);
  stepBubbleGame(state, {}, .01); assert.equal(state.lives, 2);
  state.lives = MAX_LIVES; pickup(state, 'heart'); events = stepBubbleGame(state, {}, .01);
  assert.equal(state.lives, MAX_LIVES); assert.equal(state.score, 0); assert.equal(events[0].gained, false);
});
test('rainbow stars make all seven colors edible for eight seconds, then original collisions return', () => {
  const state = quietGame(); pickup(state, 'feast'); target(state, 1);
  let events = stepBubbleGame(state, {}, .01); assert.equal(events[0].type, 'feast'); assert.equal(state.feastRemaining, FEAST_SECONDS); assert.equal(state.score, 1); assert.equal(state.lives, 3);
  for (let color = 0; color < 7; color++) target(state, color);
  stepBubbleGame(state, {}, .01); assert.equal(state.score, 8); assert.equal(state.lives, 3);
  pickup(state, 'feast'); stepBubbleGame(state, {}, .01); assert.equal(state.feastRemaining, FEAST_SECONDS); // refresh, not unbounded stacking
  for (let i = 0; i < 161; i++) stepBubbleGame(state, {}, .05);
  assert.equal(state.feastRemaining, 0); target(state, 1); stepBubbleGame(state, {}, .01); assert.equal(state.lives, 2); assert.equal(state.score, 7);
});
test('black bombs end the round even with protection, feast, a simultaneous heart and scoring bubble', () => {
  const state = quietGame(); state.score = 24; state.protection = 100; state.feastRemaining = 8;
  pickup(state, 'heart'); pickup(state, 'feast'); pickup(state, 'bomb'); target(state);
  const events = stepBubbleGame(state, {}, .01); assert.equal(state.lives, 0); assert.equal(state.status, 'over'); assert.equal(state.deathReason, 'bomb'); assert.equal(state.score, 24);
  assert.deepEqual(events.map(e => e.type), ['bomb', 'over']); assert.equal(events[1].reason, 'bomb');
  const remaining = state.feastRemaining; stepBubbleGame(state, {}, .05); assert.equal(state.feastRemaining, remaining); assert.equal(state.score, 24);
});
test('pickups spawn safely, drift, expire, respect their cap and resize with the arena', () => {
  for (const [roll, type] of [[.1, 'heart'], [.6, 'feast'], [.95, 'bomb']]) {
    const state = quietGame(), values = [roll, .03, .03, .2, .1]; state.random = () => values.length ? values.shift() : .1; state.itemSpawnIn = 0;
    stepBubbleGame(state, {}, .01); assert.equal(state.pickups.length, 1); const item = state.pickups[0]; assert.equal(item.type, type);
    assert.ok(Math.hypot(item.x - state.player.x, item.y - state.player.y) > item.radius + state.player.radius + 70);
    const x = item.x; state.itemSpawnIn = Infinity; stepBubbleGame(state, {}, .05); assert.notEqual(item.x, x);
    resizeBubbleGame(state, 320, 440); assert.ok(item.x >= item.radius && item.x <= 320 - item.radius); assert.ok(item.y >= item.radius && item.y <= 440 - item.radius);
    item.age = item.ttl - .005; stepBubbleGame(state, {}, .01); assert.equal(state.pickups.length, 0);
  }
  const state = quietGame(); for (let i = 0; i < 3; i++) pickup(state, 'heart', { x: 30 + i * 60, y: 40 });
  state.itemSpawnIn = 0; stepBubbleGame(state, {}, .01); assert.equal(state.pickups.length, 3);
});
test('new pickups have a warning grace period before collisions become active', () => {
  const state = quietGame(); pickup(state, 'bomb', { age: 0 });
  for (let i = 0; i < 10; i++) stepBubbleGame(state, {}, .05); assert.equal(state.status, 'playing');
  stepBubbleGame(state, {}, .05); stepBubbleGame(state, {}, .05); assert.equal(state.status, 'over');
});
