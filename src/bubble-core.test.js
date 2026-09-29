import test from 'node:test';
import assert from 'node:assert/strict';
import { createBubbleGame, stepBubbleGame, resizeBubbleGame, createBag, unlockRewards, useReward, openGift } from './bubble-core.js';
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
