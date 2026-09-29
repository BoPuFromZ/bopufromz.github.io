export const COLORS = [
  { id: 'rose', name: '珊瑚红', hex: '#ff7994', dark: '#b83d66' },
  { id: 'orange', name: '蜜橘橙', hex: '#ffa76b', dark: '#bc6331' },
  { id: 'yellow', name: '柠檬黄', hex: '#f4dc78', dark: '#ac8a2d' },
  { id: 'green', name: '薄荷绿', hex: '#80d9ad', dark: '#348267' },
  { id: 'blue', name: '天空蓝', hex: '#80c9f5', dark: '#4179b2' },
  { id: 'indigo', name: '靛蓝', hex: '#979bf1', dark: '#5a55ad' },
  { id: 'violet', name: '葡萄紫', hex: '#cf9ae9', dark: '#9155ae' },
];
export const REWARDS = [
  { id: 'frog', score: 10, name: '七色小青蛙', type: 'skin', subtitle: '蹦进一场彩色冒险', skin: 'frog' },
  { id: 'pig', score: 20, name: '七色小猪猪', type: 'skin', subtitle: '把快乐装进小鼻子', skin: 'pig' },
  { id: 'sky', score: 30, name: '蓝天白云', type: 'background', subtitle: '换一片晴朗的天空' },
  { id: 'mermaid', score: 40, name: '七色小美人鱼', type: 'skin', subtitle: '让每一次游动都闪亮', skin: 'mermaid' },
  { id: 'gift', score: 50, name: '榴莲兑换券', type: 'voucher', subtitle: '藏在礼盒里的小惊喜' },
];
export const BAG_KEY = 'afterhours.bubble-garden.v1';
export function rewardPresentation(bag, reward) {
  const owned = reward.id === 'gift' ? bag.giftEarned : bag.unlocked.includes(reward.id);
  if (!owned) return { owned: false, name: `奖励${['一', '二', '三', '四', '五'][REWARDS.indexOf(reward)]}`, subtitle: `达到 ${reward.score} 分，揭晓这份惊喜`, art: 'mystery' };
  if (reward.id === 'gift' && !bag.voucher) return { owned: true, name: '神秘礼盒', subtitle: '点开礼盒，揭晓最后一份惊喜', art: 'gift' };
  return { owned: true, name: reward.name, subtitle: reward.subtitle, art: reward.id === 'gift' ? 'voucher' : reward.id };
}
export function createBag(value = {}) {
  value = value && typeof value === 'object' ? value : {};
  const unlocked = REWARDS.slice(0, 4).filter(r => Array.isArray(value.unlocked) && value.unlocked.includes(r.id)).map(r => r.id);
  const skin = ['frog', 'pig', 'mermaid'].includes(value.skin) && unlocked.includes(value.skin) ? value.skin : 'bubble';
  return { version: 1, unlocked, skin, background: value.background === 'sky' && unlocked.includes('sky') ? 'sky' : 'night',
    giftEarned: value.giftEarned === true || value.voucher === true, voucher: value.voucher === true,
    bestScore: Number.isFinite(value.bestScore) ? Math.max(0, Math.min(100000, Math.floor(value.bestScore))) : 0 };
}
export function loadBag(fallback = {}) { try { return createBag(JSON.parse(localStorage.getItem(BAG_KEY)) || fallback); } catch { return createBag(fallback); } }
export function saveBag(bag) { try { localStorage.setItem(BAG_KEY, JSON.stringify(createBag(bag))); return true; } catch { return false; } }
// A guest collection lives only in memory; it can never overwrite the personal bag.
export function createBackpackSession({ storage } = {}) {
  try { storage ??= globalThis.localStorage; } catch {}
  let bag = createBag(), personal = createBag(), mode = 'personal';
  function read() { try { return createBag(JSON.parse(storage?.getItem(BAG_KEY)) || personal); } catch { return createBag(personal); } }
  function save() {
    if (mode === 'guest') return 'guest';
    personal = createBag(bag);
    try { if (!storage) return 'memory'; storage.setItem(BAG_KEY, JSON.stringify(personal)); return 'saved'; } catch { return 'memory'; }
  }
  return {
    get bag() { return bag; }, get mode() { return mode; },
    open() { if (mode === 'personal') bag = read(); return bag; }, save,
    enterGuest() { if (mode !== 'guest') { save(); mode = 'guest'; bag = createBag(); } return bag; },
    leaveGuest() { if (mode === 'guest') { mode = 'personal'; bag = read(); } return bag; },
    reset() { bag = createBag({ bestScore: bag.bestScore }); save(); return bag; },
  };
}
export function joystickVector(dx, dy, travel = 32, sensitivity = 1) {
  if (![dx, dy, travel, sensitivity].every(Number.isFinite) || travel <= 0) return { x: 0, y: 0 };
  const length = Math.hypot(dx, dy), radial = Math.min(1, length / travel);
  if (radial <= .12) return { x: 0, y: 0 };
  const amount = Math.min(1, Math.pow((radial - .12) / .88, 1.4) * Math.max(.65, Math.min(1.35, sensitivity)));
  return { x: dx / length * amount, y: dy / length * amount };
}
export const MAX_LIVES = 5;
export const FEAST_SECONDS = 8;
export function unlockRewards(bag, score) {
  if (!Number.isFinite(score)) return [];
  bag.bestScore = Math.max(bag.bestScore, Math.floor(score));
  const earned = [];
  for (const reward of REWARDS) {
    if (score < reward.score) continue;
    if (reward.id === 'gift') { if (!bag.giftEarned) { bag.giftEarned = true; earned.push(reward); } }
    else if (!bag.unlocked.includes(reward.id)) { bag.unlocked.push(reward.id); earned.push(reward); }
  }
  return earned;
}
export function useReward(bag, id) {
  if (id === 'bubble') { bag.skin = 'bubble'; return true; }
  if (!bag.unlocked.includes(id)) return false;
  if (id === 'sky') bag.background = bag.background === 'sky' ? 'night' : 'sky';
  else if (['frog', 'pig', 'mermaid'].includes(id)) bag.skin = id;
  else return false;
  return true;
}
export function openGift(bag) { if (!bag.giftEarned) return false; bag.voucher = true; return true; }

export function createBubbleGame(width, height, random = Math.random) {
  const radius = Math.max(15, Math.min(25, Math.min(width, height) * .045));
  return { width, height, random, status: 'playing', score: 0, lives: 3, peak: 0, elapsed: 0, spawnIn: .32, matchIn: .6, nextId: 1,
    protection: 0, feastRemaining: 0, itemSpawnIn: 6 + random() * 2, pickups: [], bubbles: [], player: { x: width / 2, y: height / 2, radius, color: Math.floor(random() * 7) % 7 }, events: [] };
}
export function resizeBubbleGame(state, width, height) {
  const sx = width / state.width, sy = height / state.height;
  const radius = Math.max(15, Math.min(25, Math.min(width, height) * .045));
  for (const entity of [state.player, ...state.bubbles, ...state.pickups]) {
    entity.x = Math.max(radius, Math.min(width - radius, entity.x * sx)); entity.y = Math.max(radius, Math.min(height - radius, entity.y * sy));
    entity.radius = entity === state.player ? radius : entity.type ? radius * .9 : radius * .84;
  }
  state.width = width; state.height = height;
  state.player.x = Math.max(radius, Math.min(width - radius, state.player.x)); state.player.y = Math.max(radius, Math.min(height - radius, state.player.y));
}
function spawnPickup(state) {
  const { random, width, height, player } = state, roll = random(), type = roll < .52 ? 'heart' : roll < .8 ? 'feast' : 'bomb', radius = player.radius * .9;
  let x, y, safe = false;
  for (let i = 0; i < 20; i++) {
    x = radius + 12 + random() * (width - radius * 2 - 24); y = radius + 12 + random() * (height - radius * 2 - 24);
    if (Math.hypot(x - player.x, y - player.y) > player.radius + radius + Math.min(type === 'bomb' ? 110 : 70, Math.min(width, height) * .2)
      && state.pickups.every(p => Math.hypot(x - p.x, y - p.y) > radius * 3)) { safe = true; break; }
  }
  if (!safe) return; // Never put a bomb under the player, even in a cramped arena.
  const angle = random() * Math.PI * 2, speed = 9 + random() * 8;
  state.pickups.push({ id: state.nextId++, type, x, y, radius, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, ttl: type === 'bomb' ? 12 : 18 });
}
function moveEntity(entity, state, dt) {
  entity.age += dt; entity.x += entity.vx * dt; entity.y += entity.vy * dt;
  for (const [axis, velocity, size] of [['x', 'vx', state.width], ['y', 'vy', state.height]]) {
    if (entity[axis] < entity.radius || entity[axis] > size - entity.radius) { entity[velocity] *= -1; entity[axis] = Math.max(entity.radius, Math.min(size - entity.radius, entity[axis])); }
  }
}
function spawnBubble(state, forcedColor) {
  const { random, width, height, player } = state, radius = player.radius * .84;
  let x = 0, y = 0, safe = false;
  for (let i = 0; i < 12; i++) {
    x = radius + 10 + random() * (width - radius * 2 - 20); y = radius + 10 + random() * (height - radius * 2 - 20);
    if (Math.hypot(x - player.x, y - player.y) > player.radius + radius + Math.min(80, width * .12)) { safe = true; break; }
  }
  if (!safe) {
    x = player.x < width / 2 ? width - radius - 12 : radius + 12;
    y = player.y < height / 2 ? height - radius - 12 : radius + 12;
  }
  const angle = random() * Math.PI * 2, speed = 13 + random() * 21;
  // More frequent targets, while all six other colors still appear randomly.
  const color = forcedColor ?? (random() < .45 ? player.color : (player.color + 1 + Math.floor(random() * 6)) % 7);
  const bubble = { id: state.nextId++, x, y, radius, color,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, phase: random() * Math.PI * 2 };
  state.bubbles.push(bubble); return bubble;
}
export function stepBubbleGame(state, input = {}, dt = 0) {
  state.events = [];
  if (state.status !== 'playing' || !Number.isFinite(dt)) return state.events;
  dt = Math.max(0, Math.min(dt, .05)); if (!dt) return state.events;
  state.elapsed += dt; state.protection = Math.max(0, state.protection - dt);
  state.feastRemaining = Math.max(0, state.feastRemaining - dt);
  let dx = Number.isFinite(input.x) ? input.x : 0, dy = Number.isFinite(input.y) ? input.y : 0;
  const player = state.player;
  const speed = Math.max(175, Math.min(275, state.width * .4));
  if (input.target && Number.isFinite(input.target.x) && Number.isFinite(input.target.y)) {
    dx = input.target.x - player.x; dy = input.target.y - player.y;
    const length = Math.hypot(dx, dy);
    if (length > 3) { const amount = Math.min(1, length / (speed * dt)); dx = dx / length * amount; dy = dy / length * amount; }
    else { dx = 0; dy = 0; }
  }
  const norm = Math.hypot(dx, dy); if (norm > 1) { dx /= norm; dy /= norm; }
  player.x = Math.max(player.radius, Math.min(state.width - player.radius, player.x + dx * speed * dt));
  player.y = Math.max(player.radius, Math.min(state.height - player.radius, player.y + dy * speed * dt));
  state.itemSpawnIn -= dt;
  if (state.itemSpawnIn <= 0) { if (state.pickups.length < 3) spawnPickup(state); state.itemSpawnIn = 6 + state.random() * 4; }
  for (const pickup of state.pickups) moveEntity(pickup, state, dt);
  state.pickups = state.pickups.filter(p => p.age < p.ttl);
  const contacts = state.pickups.filter(p => p.age >= .55 && Math.hypot(p.x - player.x, p.y - player.y) < (p.radius + player.radius) * .84);
  const bomb = contacts.find(p => p.type === 'bomb');
  if (bomb) {
    bomb.eaten = true; state.lives = 0; state.status = 'over'; state.deathReason = 'bomb';
    state.pickups = state.pickups.filter(p => !p.eaten);
    state.events.push({ type: 'bomb', x: bomb.x, y: bomb.y, color: player.color }, { type: 'over', reason: 'bomb', x: player.x, y: player.y, color: player.color });
    return state.events;
  }
  for (const pickup of contacts) {
    pickup.eaten = true;
    if (pickup.type === 'heart') { const gained = state.lives < MAX_LIVES; state.lives = Math.min(MAX_LIVES, state.lives + 1); state.events.push({ type: 'heal', gained, x: pickup.x, y: pickup.y, color: 0 }); }
    else if (pickup.type === 'feast') { state.feastRemaining = FEAST_SECONDS; state.events.push({ type: 'feast', x: pickup.x, y: pickup.y, color: player.color }); }
  }
  state.pickups = state.pickups.filter(p => !p.eaten);
  state.spawnIn -= dt;
  state.matchIn -= dt;
  const capacity = Math.max(15, Math.min(32, Math.floor(state.width * state.height / 14000)));
  if (state.spawnIn <= 0) {
    if (state.bubbles.length < capacity && spawnBubble(state).color === player.color) state.matchIn = 1.4;
    state.spawnIn = .42 + state.random() * .12;
  }
  if (state.matchIn <= 0) {
    const targets = state.bubbles.filter(b => b.color === player.color).length;
    if (targets < Math.max(2, Math.floor(capacity * .15))) {
      if (state.bubbles.length >= capacity) {
        const oldestOther = state.bubbles.filter(b => b.color !== player.color).reduce((oldest, b) => !oldest || b.age > oldest.age ? b : oldest, null);
        if (oldestOther) state.bubbles.splice(state.bubbles.indexOf(oldestOther), 1);
      }
      if (state.bubbles.length < capacity) spawnBubble(state, player.color);
    }
    state.matchIn = 1.4;
  }
  for (const bubble of state.bubbles) {
    bubble.age += dt;
    bubble.x += (bubble.vx + Math.sin(bubble.age * .7 + bubble.phase) * 4) * dt;
    bubble.y += (bubble.vy + Math.cos(bubble.age * .6 + bubble.phase) * 4) * dt;
    if (bubble.x < bubble.radius || bubble.x > state.width - bubble.radius) { bubble.vx *= -1; bubble.x = Math.max(bubble.radius, Math.min(state.width - bubble.radius, bubble.x)); }
    if (bubble.y < bubble.radius || bubble.y > state.height - bubble.radius) { bubble.vy *= -1; bubble.y = Math.max(bubble.radius, Math.min(state.height - bubble.radius, bubble.y)); }
    if (bubble.age < .3 || Math.hypot(bubble.x - player.x, bubble.y - player.y) > (bubble.radius + player.radius) * .84) continue;
    const position = { x: bubble.x, y: bubble.y, color: bubble.color };
    if (bubble.color === player.color || state.feastRemaining > 0) {
      bubble.eaten = true; state.score++; state.peak = Math.max(state.peak, state.score);
      state.events.push({ type: 'eat', score: state.score, ...position });
    } else if (state.protection <= 0) {
      bubble.eaten = true; state.score--; state.lives--; state.protection = 1.3;
      state.events.push({ type: 'hurt', score: state.score, ...position });
      if (state.lives === 0) { state.status = 'over'; state.events.push({ type: 'over', x: player.x, y: player.y, color: player.color }); break; }
    }
  }
  state.bubbles = state.bubbles.filter(b => !b.eaten && b.age < 40);
  return state.events;
}
