import './bubble-game.css';
import { COLORS, REWARDS, rewardPresentation, createBubbleGame, resizeBubbleGame, stepBubbleGame, createBackpackSession, joystickVector, MAX_LIVES, FEAST_SECONDS, unlockRewards, useReward, openGift } from './bubble-core.js';
import { drawCharacter, drawPickup, drawBackground, avatarImage, skyImage, star, GIFT_SVG, DURIAN_SVG, MYSTERY_SVG } from './bubble-art.js';
import { createFireworks } from './bubble-fx.js';
import { createBubbleAudio } from './bubble-audio.js';

export function createBubbleGarden({ onExit, random = Math.random }) {
  const dialog = document.createElement('dialog'); dialog.id = 'bubble-garden'; dialog.setAttribute('aria-label', '游戏开发：七色泡泡花园');
  const art = { bubble: avatarImage('bubble', 4), frog: avatarImage('frog', 3), pig: avatarImage('pig', 0), mermaid: avatarImage('mermaid', 6), sky: skyImage() };
  const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C-5 10 3-4 12 6c9-10 17 4 0 15Z"/></svg>';
  const backpackIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5V3h8v2M5 7q7-5 14 0v14H5ZM5 11H3v8h2m14-8h2v8h-2M8 14h8v5H8ZM9 9h6"/></svg>';
  dialog.innerHTML = `<div class="bubble-shell" data-status="ready">
    <header class="bubble-header bubble-chrome"><div class="bubble-wordmark"><span class="bubble-logo"><i></i><i></i></span><div>BUBBLE GARDEN<small>AFTERHOURS / PLAYROOM 01</small></div></div><div class="bubble-header-actions"><button class="bubble-sound" data-action="sound" aria-label="开启游戏声音" aria-pressed="false">声音 <span>OFF</span></button><button class="bubble-bag-button" data-action="bag">${backpackIcon}<span>背包</span><b class="bag-count">0</b></button><button class="bubble-exit" data-action="exit">返回主页 ↗</button></div></header>
    <div class="bubble-layout bubble-chrome"><section class="bubble-board" aria-label="泡泡游戏场地"><div class="bubble-board-top"><span><i></i><b id="bubble-phase">等待开始</b></span><span id="bubble-color-name">开始后随机选择你的颜色</span><button data-action="pause" aria-label="暂停游戏" disabled>Ⅱ</button></div>
      <div class="bubble-arena"><canvas id="bubble-canvas" tabindex="0" aria-label="七色泡泡游戏。方向键或 WASD 移动，手机拖动或使用摇杆。同色加分，异色减分并损失生命。"></canvas>
        <div class="bubble-start"><div class="start-sticker"><img src="${art.bubble}" alt="微笑的天空蓝泡泡"/><span>LET'S PLAY!</span><i>✦</i></div><p class="bubble-eyebrow">SEVEN COLORS. ONE LITTLE ADVENTURE.</p><h1>同色相遇，<br>快乐<span>加分。</span></h1><p>吃掉同色泡泡，收集分数里的惊喜。<br>红心补血，彩虹星全色可吃，小心黑色炸弹。</p><button class="bubble-primary" data-action="start">开始游戏 <span>→</span></button><button class="bubble-text-button bubble-guest-start" data-action="guest">访客试玩 · 不保存奖励</button><small>3 条初始生命 · 5 个神秘奖励</small></div>
        <div class="bubble-feast-hud" role="status" hidden><span>✦ 全色可吃</span><b>8.0s</b><i><em></em></i></div><div class="bubble-joystick" aria-label="移动摇杆"><div class="joystick-ring" role="img" aria-label="拖动摇杆移动，小幅推动慢速，松手停下"><i></i><b>✦</b></div><span>轻推慢走 · 松手停</span></div>
        <div class="bubble-reward-toast" role="status" hidden><img alt=""/><div><small>NEW REWARD</small><strong></strong></div><button data-action="bag">去背包 ↗</button></div>
      </div><footer class="bubble-board-footer"><div class="bubble-palette" aria-label="七种颜色的色号">${COLORS.map((c, i) => `<span style="--bubble-color:${c.hex}" title="${i + 1} / ${c.name}">${i + 1}</span>`).join('')}</div><span class="bubble-desktop-hint">方向键 / WASD 移动 · ESC 暂停</span><span class="bubble-mobile-hint">右下摇杆移动 · Ⅱ 调灵敏度</span></footer>
    </section><aside class="bubble-sidebar" aria-label="计分板和奖励进度"><div class="bubble-score-card"><div class="score-heading"><span>SCORE / 本局得分</span><i>✦</i></div><strong id="bubble-score">00</strong><div class="bubble-lives" aria-label="剩余 3 条生命">${heart.repeat(MAX_LIVES)}</div><div class="bubble-small-stats"><span>本机最高 <b id="bubble-best">0</b></span><span>本局 <b id="bubble-time">00:00</b></span></div></div>
      <div class="bubble-next-reward"><div><span>下一个小惊喜</span><b id="bubble-next-label">10 分</b></div><strong id="bubble-next-name">奖励一</strong><div class="bubble-goal-meter"><i></i></div></div>
      <div class="bubble-roadmap"><div class="roadmap-heading"><span>THE LITTLE REWARDS</span><span>01—05</span></div>${REWARDS.map((r, i) => `<div class="bubble-milestone" data-reward="${r.id}"><span class="milestone-number">${String(i + 1).padStart(2, '0')}</span><span class="milestone-copy"><strong>${rewardPresentation({ unlocked: [] }, r).name}</strong><small>${r.score} 分解锁</small></span><b>○</b></div>`).join('')}</div>
      <div class="bubble-rules"><span>同色 <b>+1</b></span><span>异色 <b>−1</b> ${heart}</span><label><input id="bubble-numbers" type="checkbox" checked/> 色号辅助</label></div>
    </aside></div>
    <div class="bubble-bottom-note bubble-chrome"><span>01 / GAME DEVELOPMENT</span><span>STAY CURIOUS. PLAY A LITTLE.</span></div>
    <div class="bubble-layer" hidden>
      <section class="bubble-modal bubble-backpack" data-layer="bag" role="dialog" aria-modal="true" aria-labelledby="bag-title" hidden><div class="bubble-modal-top"><span>YOUR LITTLE COLLECTION</span><button data-action="close-layer" aria-label="关闭背包">✕</button></div><div class="bag-heading"><div><h2 id="bag-title">小小背包<span>.</span></h2><p>把每一次努力，装成一份惊喜。</p></div><span class="bag-count-heading">0 / 5</span></div><div class="bag-grid"></div><div class="bag-footer"><div class="bag-tools"><button data-action="original">使用原始泡泡</button><button data-action="guest">访客试玩</button><button class="bag-reset-button" data-action="reset-bag">重置背包</button></div><small class="bag-storage-note">奖励只保存在此浏览器，别人打开链接不会继承。</small></div></section>
      <section class="bubble-modal bubble-pause" data-layer="pause" role="dialog" aria-modal="true" aria-labelledby="bubble-pause-title" hidden><span class="bubble-eyebrow">A LITTLE BREATHER</span><div class="pause-avatar"><img src="${art.bubble}" alt="休息中的泡泡"/></div><h2 id="bubble-pause-title">休息一下，再出发。</h2><p>分数和生命都在原地等你。</p><div class="bubble-control-settings"><label for="bubble-sensitivity">摇杆灵敏度 <output for="bubble-sensitivity">100%</output></label><input id="bubble-sensitivity" type="range" min="0.65" max="1.35" step="0.05" value="1"/><small>向左更细腻，向右更灵敏。松手立即停止。</small></div><div class="bubble-pickup-guide"><span>♥ 红心：+1 生命，最多 5 条</span><span>✦ 彩虹星：8 秒内可吃所有颜色</span><span>● 黑色炸弹：立即结束本局</span></div><button class="bubble-primary" data-action="resume">继续游戏 <span>→</span></button><button class="bubble-secondary" data-action="bag">看看我的背包</button></section>
      <section class="bubble-modal bubble-reset" data-layer="reset" role="dialog" aria-modal="true" aria-labelledby="bubble-reset-title" hidden><span class="bubble-eyebrow">A FRESH LITTLE START</span><h2 id="bubble-reset-title">重新收集惊喜？</h2><p class="reset-summary"></p><button class="bubble-secondary" data-action="cancel-reset">保留背包</button><button class="bubble-primary" data-action="confirm-reset">确认重置背包 <span>↻</span></button></section>
      <section class="bubble-modal bubble-over" data-layer="over" role="dialog" aria-modal="true" aria-labelledby="bubble-over-title" hidden><span class="bubble-eyebrow">EVERY POP IS A NEW BEGINNING</span><h2 id="bubble-over-title">泡泡休息了，<br>快乐还在继续。</h2><div class="over-score"><strong>0</strong><span>本局得分</span></div><p class="over-summary"></p><button class="bubble-primary" data-action="start">再来一局 <span>→</span></button><button class="bubble-secondary" data-action="bag">打开我的背包</button><button class="bubble-text-button" data-action="exit">返回主页 ↗</button></section>
      <section class="bubble-celebration" data-layer="celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title" hidden><span>FIFTY LITTLE MOMENTS OF JOY</span><h2 id="celebrate-title">50 分！<br>这一刻，为你闪耀<span>✦</span></h2><p>你找到了最后一份小惊喜。</p><button class="bubble-primary" data-action="show-gift">查看我的礼盒 →</button></section>
      <section class="bubble-modal bubble-gift" data-layer="gift" role="dialog" aria-modal="true" aria-labelledby="gift-title" hidden><span class="bubble-eyebrow">A GIFT, JUST FOR YOU</span><h2 id="gift-title">点开这份小惊喜。</h2><button class="gift-open" data-action="open-gift" aria-label="打开 50 分奖励礼盒">${GIFT_SVG}</button><p>里面的礼物，会替你好好放进背包。</p><small>点击礼盒打开</small></section>
      <section class="bubble-modal bubble-coupon" data-layer="coupon" role="dialog" aria-modal="true" aria-labelledby="coupon-title" hidden><div class="bubble-modal-top"><span>REWARD / 05</span><button data-action="close-layer" aria-label="收好兑换券">✕</button></div><article class="durian-ticket"><div class="ticket-top"><span>AFTERHOURS</span><span>GIFT NO. 005</span></div>${DURIAN_SVG}<h2 id="coupon-title">找作者兑换一个榴莲</h2><div class="ticket-perforation"></div><div class="ticket-bottom"><span>ONE LITTLE ADVENTURE<br>ONE SWEET SURPRISE</span><div class="ticket-stamp">AH<br>✦</div></div></article><p class="coupon-stored">兑换券已放入背包，随时可以查看。</p><button class="bubble-primary" data-action="close-layer">收好这份惊喜 <span>→</span></button></section>
    </div>
    <canvas id="bubble-fireworks" aria-hidden="true" hidden></canvas>
    <div class="bubble-notice" role="status" hidden></div>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector), shell = $('.bubble-shell'), canvas = $('#bubble-canvas'), arena = $('.bubble-arena'), ctx = canvas.getContext('2d'), layerRoot = $('.bubble-layer');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const collection = createBackpackSession();
  let bag = collection.open(), sensitivity = 1, state = null, open = false, layer = null, returnLayer = null, width = 1, height = 1, frame = null, last = 0, time = 0, lastHUD = 0, particles = [], floaters = [], pointerTarget = null, joystick = { x: 0, y: 0 }, stickPointer = null, stickOrigin = null, arenaPointer = null, numbers = true;
  let rewardToastTimer, noticeTimer, overTimer, giftTimer, fireworks = null, fireTime = 0, fireActive = false, lastFocus = null;
  const audio = createBubbleAudio();
  try { const stored = Number(localStorage.getItem('afterhours.bubble-stick.v1')); if (Number.isFinite(stored) && stored >= .65 && stored <= 1.35) sensitivity = stored; } catch {}
  $('#bubble-sensitivity').value = sensitivity; $('.bubble-control-settings output').textContent = `${Math.round(sensitivity * 100)}%`;
  const keys = new Set();
  function notify(text) { $('.bubble-notice').textContent = text; $('.bubble-notice').hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('.bubble-notice').hidden = true; }, 2300); }
  function persist() { const saved = collection.save(); shell.dataset.bag = JSON.stringify(bag); shell.dataset.mode = collection.mode; $('.bag-storage-note').textContent = saved === 'guest' ? '访客奖励仅本次试玩有效；退出后恢复个人背包。' : saved === 'saved' ? '奖励只保存在此浏览器，别人打开链接不会继承。' : '浏览器暂不支持保存，奖励保留在本次会话。'; }
  function renderSound() { $('.bubble-sound span').textContent = audio.enabled ? 'ON' : 'OFF'; $('.bubble-sound').setAttribute('aria-pressed', String(audio.enabled)); $('.bubble-sound').setAttribute('aria-label', audio.enabled ? '关闭游戏音乐和音效' : '开启游戏音乐和音效'); shell.dataset.audio = JSON.stringify({ enabled: audio.enabled, playing: audio.playing, state: audio.contextState }); }
  async function toggleSound() {
    try { await audio.toggle(); renderSound(); if (audio.enabled) audio.cue('equip'); }
    catch { notify('当前浏览器暂时无法播放声音。'); }
  }
  function burst(x, y, color, amount = 18, broken = false) {
    for (let i = 0; i < amount; i++) { const a = random() * Math.PI * 2, speed = 30 + random() * (broken ? 135 : 80); particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: broken ? .9 : .6, age: 0, size: 2 + random() * 4, color: COLORS[color].hex, broken, angle: a }); }
  }
  function rewardToast(reward) {
    const el = $('.bubble-reward-toast'); el.querySelector('img').src = art[reward.id] || art.bubble; el.querySelector('strong').textContent = `解锁了 ${reward.name}`; el.hidden = false;
    clearTimeout(rewardToastTimer); rewardToastTimer = setTimeout(() => { el.hidden = true; }, 4300);
    audio.cue('unlock');
  }
  function updateInventoryUI() {
    const count = bag.unlocked.length + (bag.giftEarned ? 1 : 0);
    $('.bag-count').textContent = count; $('.bag-count-heading').textContent = `${count} / 5`;
    for (const reward of REWARDS) {
      const view = rewardPresentation(bag, reward), row = $(`[data-reward="${reward.id}"]`);
      row.classList.toggle('earned', view.owned); row.querySelector('b').textContent = view.owned ? '✓' : '○'; row.querySelector('strong').textContent = view.name;
    }
    $('.bag-grid').innerHTML = REWARDS.map(reward => {
      const view = rewardPresentation(bag, reward), owned = view.owned;
      const active = reward.type === 'skin' ? bag.skin === reward.id : reward.id === 'sky' && bag.background === 'sky';
      const picture = !owned ? MYSTERY_SVG : reward.id === 'gift' ? (bag.voucher ? DURIAN_SVG : GIFT_SVG) : `<img src="${art[reward.id]}" alt="${view.name}"/>`;
      const label = !owned ? `${reward.score} 分解锁` : reward.id === 'gift' ? bag.voucher ? '查看兑换券' : '打开礼盒' : reward.id === 'sky' ? active ? '还原夜色' : '使用背景' : active ? '正在使用 ✓' : '使用外观';
      return `<article class="bag-item ${owned ? 'owned' : 'locked'} ${active ? 'equipped' : ''}"><div class="bag-item-art">${picture}<span>${owned ? active ? 'IN USE' : 'UNLOCKED' : 'LOCKED'}</span></div><h3>${view.name}</h3><p>${view.subtitle}</p><button data-item="${reward.id}" ${!owned || (active && reward.type === 'skin') ? 'disabled' : ''}>${label}</button></article>`;
    }).join('');
    $('[data-action="original"]').disabled = bag.skin === 'bubble';
    shell.dataset.skin = bag.skin; shell.dataset.background = bag.background; shell.dataset.bag = JSON.stringify(bag);
    shell.dataset.mode = collection.mode;
    $('.bubble-wordmark small').textContent = collection.mode === 'guest' ? 'GUEST / 访客试玩 · 不保存奖励' : 'AFTERHOURS / PLAYROOM 01';
    $('.bag-heading p').textContent = collection.mode === 'guest' ? '本次试玩的小惊喜，不会改变个人背包。' : '把每一次努力，装成一份惊喜。';
    dialog.querySelectorAll('[data-action="guest"]').forEach(button => { button.textContent = collection.mode === 'guest' ? '返回个人模式' : button.classList.contains('bubble-guest-start') ? '访客试玩 · 不保存奖励' : '访客试玩'; });
    renderHUD();
  }
  function renderHUD() {
    const score = state?.score || 0, lives = state?.lives ?? 3;
    $('#bubble-score').textContent = score < 0 ? String(score) : String(score).padStart(2, '0'); $('#bubble-best').textContent = bag.bestScore;
    const seconds = Math.floor(state?.elapsed || 0); $('#bubble-time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const hearts = $('.bubble-lives'); hearts.setAttribute('aria-label', `剩余 ${lives} 条生命，上限 ${MAX_LIVES} 条`); [...hearts.children].forEach((el, i) => el.classList.toggle('lost', i >= lives));
    if (state) { const color = COLORS[state.player.color]; $('#bubble-color-name').innerHTML = `<i style="background:${color.hex}"></i>你的颜色 · ${state.player.color + 1} / ${color.name}`; }
    const next = REWARDS.find(r => r.id === 'gift' ? !bag.giftEarned : !bag.unlocked.includes(r.id));
    $('#bubble-next-label').textContent = next ? `${next.score} 分` : '已集齐'; $('#bubble-next-name').textContent = next ? rewardPresentation(bag, next).name : '五份惊喜，都属于你。';
    $('.bubble-goal-meter i').style.width = `${next ? Math.max(0, Math.min(100, score / next.score * 100)) : 100}%`;
    const feast = state?.feastRemaining || 0; $('.bubble-feast-hud').hidden = feast <= 0 || state?.status === 'over'; $('.bubble-feast-hud b').textContent = `${feast.toFixed(1)}s`; $('.bubble-feast-hud em').style.width = `${feast / FEAST_SECONDS * 100}%`;
    if (state) shell.dataset.game = JSON.stringify({ status: state.status, score, lives, peak: state.peak, elapsed: state.elapsed, feastRemaining: feast, deathReason: state.deathReason, player: state.player, pickups: state.pickups.map(p => ({ id: p.id, type: p.type, x: p.x, y: p.y, radius: p.radius })), bubbles: state.bubbles.map(b => ({ id: b.id, x: b.x, y: b.y, color: b.color, radius: b.radius })) });
    renderSound();
  }
  function clearInput() { keys.clear(); pointerTarget = null; arenaPointer = null; stickPointer = null; stickOrigin = null; joystick = { x: 0, y: 0 }; $('.joystick-ring b').style.transform = 'translate(0,0)'; $('.bubble-joystick').classList.remove('active'); }
  function focusLayer() { const active = $(`[data-layer="${layer}"]`); (active.querySelector('button:not(:disabled)') || active).focus({ preventScroll: true }); }
  function showLayer(name) {
    clearInput(); if (!layer) lastFocus = document.activeElement;
    if (name === 'bag' || name === 'coupon') { fireActive = false; fireworks?.clear(); $('#bubble-fireworks').hidden = true; shell.dataset.celebrating = 'false'; }
    layer = name; layerRoot.hidden = false; dialog.querySelectorAll('[data-layer]').forEach(el => el.hidden = el.dataset.layer !== name);
    audio.setPlaying(false); renderSound();
    dialog.querySelectorAll('.bubble-chrome').forEach(el => { el.inert = true; }); shell.dataset.paused = 'true';
    $('#bubble-phase').textContent = state?.status === 'over' ? '本局结束' : '暂时休息';
    if (name === 'bag') updateInventoryUI(); focusLayer(); $(`[data-layer="${name}"]`).scrollTop = 0;
  }
  function closeLayer() {
    if (layer === 'reset') { showLayer('bag'); return; }
    if (layer === 'coupon' && returnLayer === 'bag') { returnLayer = null; showLayer('bag'); return; }
    if (layer === 'gift') { showLayer('bag'); return; }
    if (layer === 'celebrate') { showGift(); return; }
    if (layer === 'over') return;
    layer = null; returnLayer = null; layerRoot.hidden = true; dialog.querySelectorAll('[data-layer]').forEach(el => el.hidden = true);
    dialog.querySelectorAll('.bubble-chrome').forEach(el => { el.inert = false; }); shell.dataset.paused = 'false'; clearInput(); last = performance.now();
    $('#bubble-phase').textContent = state ? state.status === 'over' ? '本局结束' : '正在冒险' : '等待开始';
    audio.setPlaying(state?.status === 'playing'); renderSound();
    if (state?.status === 'over') showOver(); else if (state) canvas.focus({ preventScroll: true }); else (lastFocus?.isConnected ? lastFocus : $('[data-action="start"]')).focus({ preventScroll: true });
  }
  function showOver() {
    $('.over-score strong').textContent = state.score; $('.over-summary').textContent = `${state.deathReason === 'bomb' ? '碰到了黑色炸弹，生命归零。再来一局吧！' : `本局最高 ${state.peak} 分。`} ${collection.mode === 'guest' ? '访客奖励在退出试玩前保留。' : '已解锁的奖励会继续留在背包。'}`; showLayer('over');
  }
  function resetReady() {
    clearTimeout(overTimer); clearTimeout(giftTimer); clearTimeout(rewardToastTimer);
    audio.setPlaying(false); fireworks?.clear(); fireActive = false; state = null; layer = null; returnLayer = null;
    particles = []; floaters = []; clearInput(); layerRoot.hidden = true;
    dialog.querySelectorAll('[data-layer]').forEach(el => el.hidden = true); dialog.querySelectorAll('.bubble-chrome').forEach(el => el.inert = false);
    shell.dataset.status = 'ready'; shell.dataset.paused = 'false'; shell.dataset.celebrating = 'false';
    $('.bubble-start').hidden = false; $('#bubble-phase').textContent = '等待开始'; $('#bubble-color-name').textContent = '开始后随机选择你的颜色';
    $('[data-action="pause"]').disabled = true; $('.bubble-reward-toast').hidden = true; $('#bubble-fireworks').hidden = true;
    delete shell.dataset.game; updateInventoryUI(); persist(); last = performance.now(); $('[data-action="start"]').focus({ preventScroll: true });
  }
  function start() {
    if (!open) return;
    clearTimeout(overTimer); clearTimeout(giftTimer); fireworks?.clear(); fireActive = false; $('#bubble-fireworks').hidden = true; shell.dataset.celebrating = 'false';
    layer = null; returnLayer = null; layerRoot.hidden = true; dialog.querySelectorAll('[data-layer]').forEach(el => el.hidden = true); dialog.querySelectorAll('.bubble-chrome').forEach(el => { el.inert = false; });
    state = createBubbleGame(width, height, random); particles = []; floaters = []; clearInput();
    shell.dataset.status = 'playing'; shell.dataset.paused = 'false'; $('.bubble-start').hidden = true; $('.bubble-reward-toast').hidden = true;
    $('[data-action="pause"]').disabled = false; $('#bubble-phase').textContent = '正在冒险'; last = performance.now(); renderHUD(); canvas.focus({ preventScroll: true }); void audio.startRound().then(renderSound).catch(() => notify('点击右上角声音按钮，开启音乐和音效。'));
  }
  function celebrate() {
    clearTimeout(overTimer); showLayer('celebrate'); $('#bubble-fireworks').hidden = false; fireActive = true; fireTime = 0;
    fireworks = createFireworks($('#bubble-fireworks'), reduced); shell.dataset.celebrating = 'true'; audio.cue('unlock');
  }
  function showGift() { returnLayer = null; showLayer('gift'); $('.gift-open').classList.remove('opening'); $('.gift-open').disabled = false; }
  function revealGift() {
    if (!openGift(bag)) return;
    persist(); updateInventoryUI(); $('.gift-open').disabled = true; $('.gift-open').classList.add('opening'); audio.cue('gift');
    clearTimeout(giftTimer); giftTimer = setTimeout(() => { if (open) { returnLayer = null; showLayer('coupon'); notify('榴莲兑换券已放进背包。'); } }, reduced ? 120 : 650);
  }
  function process(events) {
    for (const event of events) {
      if (event.type === 'eat' || event.type === 'hurt') {
        burst(event.x, event.y, event.color, event.type === 'eat' ? 16 : 22);
        floaters.push({ x: event.x, y: event.y - 12, text: event.type === 'eat' ? '+1' : '−1 ♥', color: event.type === 'eat' ? '#b6ffe6' : '#ffadc7', age: 0 });
        audio.cue('pop');
        if (event.type === 'eat') audio.cue('score'); else { audio.cue('hurt'); $('.bubble-board').classList.remove('hurt'); void $('.bubble-board').offsetWidth; $('.bubble-board').classList.add('hurt'); }
        const earned = unlockRewards(bag, event.score); persist();
        if (earned.length) { updateInventoryUI(); for (const reward of earned) if (reward.id === 'gift') celebrate(); else rewardToast(reward); }
      }
      if (['heal', 'feast', 'bomb'].includes(event.type)) {
        burst(event.x, event.y, event.color, event.type === 'bomb' ? 42 : 24, event.type === 'bomb'); audio.cue(event.type);
        floaters.push({ x: event.x, y: event.y - 14, text: event.type === 'heal' ? event.gained ? '+1 ♥' : '生命已满' : event.type === 'feast' ? '全色可吃 · 8 秒' : 'BOOM!', color: event.type === 'bomb' ? '#ffc197' : '#ffdfed', age: 0 });
      }
      if (event.type === 'over') {
        audio.setPlaying(false); audio.cue('death'); renderSound();
        burst(event.x, event.y, event.color, 44, true); shell.dataset.status = 'over'; clearInput(); $('[data-action="pause"]').disabled = true; $('#bubble-phase').textContent = '本局结束';
        clearTimeout(overTimer); overTimer = setTimeout(() => { if (open && !layer) showOver(); }, 900);
      }
    }
    renderHUD();
  }
  function input() {
    const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (pointerTarget) return { target: pointerTarget };
    return { x: dx || joystick.x, y: dy || joystick.y };
  }
  function render(dt) {
    drawBackground(ctx, width, height, bag.background, reduced ? 0 : time);
    if (state) {
      for (const bubble of state.bubbles) {
        ctx.save(); ctx.globalAlpha = Math.min(1, bubble.age / .3, Math.max(0, 40 - bubble.age));
        const grow = .7 + Math.min(1, bubble.age / .35) * .3;
        drawCharacter(ctx, bag.skin, bubble.color, bubble.x, bubble.y, bubble.radius * grow, time, { numbers }); ctx.restore();
      }
      for (const pickup of state.pickups) {
        ctx.save(); ctx.globalAlpha = Math.min(1, pickup.age / .55, Math.max(0, pickup.ttl - pickup.age));
        drawPickup(ctx, pickup.type, pickup.x, pickup.y, pickup.radius, reduced ? 0 : time); ctx.restore();
      }
      if (pointerTarget && !layer) { ctx.strokeStyle = bag.background === 'sky' ? '#3d789055' : '#b3deff55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pointerTarget.x, pointerTarget.y, 7, 0, Math.PI * 2); ctx.stroke(); }
      if (state.status !== 'over') drawCharacter(ctx, bag.skin, state.player.color, state.player.x, state.player.y, state.player.radius, time, { player: true, protection: state.protection, feast: state.feastRemaining > 0, numbers, lightBackground: bag.background === 'sky' });
    }
    for (const p of particles) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      if (p.broken) { ctx.translate(p.x, p.y); ctx.rotate(p.angle + p.age); ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(-p.size, -p.size); ctx.lineTo(p.size, 0); ctx.lineTo(-p.size * .5, p.size); ctx.closePath(); ctx.fill(); }
      else if (p.size > 4) star(ctx, p.x, p.y, p.size, p.color);
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    particles = particles.filter(p => p.age < p.life);
    for (const floater of floaters) { floater.age += dt; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - floater.age / .8); ctx.fillStyle = bag.background === 'sky' ? '#2d5a70' : floater.color; ctx.textAlign = 'center'; ctx.font = '700 17px monospace'; ctx.fillText(floater.text, floater.x, floater.y - floater.age * 28); ctx.restore(); }
    floaters = floaters.filter(f => f.age < .8);
  }
  function tick(now) {
    if (!open) return; frame = requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
    if (document.hidden) return;
    time += dt;
    if (state && !layer) { const events = stepBubbleGame(state, input(), dt); if (events.length) process(events); }
    render(dt);
    if (now - lastHUD > 120) { lastHUD = now; renderHUD(); }
    if (fireActive) {
      fireTime = fireworks.step(dt);
      if (fireTime > (reduced ? 3 : 4.8) && layer === 'celebrate') showGift();
      if (fireTime > 6) { fireActive = false; $('#bubble-fireworks').hidden = true; fireworks.clear(); shell.dataset.celebrating = 'false'; }
    }
  }
  function resize() {
    if (stickPointer !== null) clearInput();
    width = Math.max(180, arena.clientWidth); height = Math.max(150, arena.clientHeight);
    const dpr = Math.min(devicePixelRatio, 1.8); canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) resizeBubbleGame(state, width, height); fireworks?.resize(); render(0);
  }
  const observer = new ResizeObserver(() => { if (open) resize(); }); observer.observe(arena);
  dialog.addEventListener('click', event => {
    const item = event.target.closest('[data-item]');
    if (item && !item.disabled) {
      if (item.dataset.item === 'gift') { if (bag.voucher) { returnLayer = 'bag'; showLayer('coupon'); } else showGift(); }
      else if (useReward(bag, item.dataset.item)) { persist(); updateInventoryUI(); audio.cue('equip'); }
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'exit') onExit?.();
    if (action === 'start') start();
    if (action === 'bag') { returnLayer = null; showLayer('bag'); }
    if (action === 'close-layer' || action === 'resume') closeLayer();
    if (action === 'pause' && state?.status === 'playing') showLayer('pause');
    if (action === 'original') { useReward(bag, 'bubble'); persist(); updateInventoryUI(); }
    if (action === 'sound') toggleSound();
    if (action === 'guest') {
      bag = collection.mode === 'guest' ? collection.leaveGuest() : collection.enterGuest(); resetReady();
      notify(collection.mode === 'guest' ? '已进入访客试玩，个人背包已为你收好。' : '已恢复个人背包。');
    }
    if (action === 'reset-bag') {
      $('.reset-summary').textContent = collection.mode === 'guest' ? '清空本次访客试玩的奖励与外观，个人背包不受影响。最高成绩保留，然后从新的一局开始。' : '清空此浏览器中的全部奖励、兑换券、外观和背景。最高成绩保留，然后从新的一局开始。此操作无法撤销。';
      showLayer('reset');
    }
    if (action === 'cancel-reset') showLayer('bag');
    if (action === 'confirm-reset') { bag = collection.reset(); resetReady(); notify('背包已重置，重新收集五份惊喜吧。'); }
    if (action === 'show-gift') showGift();
    if (action === 'open-gift') revealGift();
  });
  $('#bubble-numbers').addEventListener('change', event => { numbers = event.target.checked; });
  $('#bubble-sensitivity').addEventListener('input', event => {
    sensitivity = Number(event.target.value); $('.bubble-control-settings output').textContent = `${Math.round(sensitivity * 100)}%`;
    try { localStorage.setItem('afterhours.bubble-stick.v1', String(sensitivity)); } catch {}
  });
  const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  dialog.addEventListener('keydown', event => {
    if (layer && event.key === 'Tab') {
      const buttons = [...$(`[data-layer="${layer}"]`).querySelectorAll('button:not(:disabled),input')].filter(el => !el.hidden);
      if (buttons.length) { const first = buttons[0], end = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); end.focus(); } else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); first.focus(); } }
      return;
    }
    const direction = keyMap[event.key] || keyMap[event.key.toLowerCase()];
    if (direction && !layer && state?.status === 'playing') { event.preventDefault(); keys.add(direction); }
    if (!event.repeat && event.key.toLowerCase() === 'p' && !layer && state?.status === 'playing') { event.preventDefault(); showLayer('pause'); }
  });
  dialog.addEventListener('keyup', event => { keys.delete(keyMap[event.key] || keyMap[event.key.toLowerCase()]); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (layer) closeLayer(); else if (state?.status === 'playing') showLayer('pause'); else onExit?.(); });
  function targetAt(event) { const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * height / bounds.height }; }
  function updateStick(event) {
    const dx = event.clientX - stickOrigin.x, dy = event.clientY - stickOrigin.y, length = Math.hypot(dx, dy), maximum = 32;
    const factor = length > maximum ? maximum / length : 1, x = dx * factor, y = dy * factor;
    joystick = joystickVector(dx, dy, maximum, sensitivity); $('.joystick-ring b').style.transform = `translate(${x}px,${y}px)`;
  }
  const stickRing = $('.joystick-ring');
  stickRing.addEventListener('pointerdown', event => {
    if (layer || state?.status !== 'playing' || stickPointer !== null || arenaPointer !== null) return;
    event.preventDefault(); stickPointer = event.pointerId; stickRing.setPointerCapture(event.pointerId); pointerTarget = null;
    // Anchor to the first thumb contact inside the fixed ring: no jump on an off-center press.
    stickOrigin = { x: event.clientX, y: event.clientY }; $('.bubble-joystick').classList.add('active'); updateStick(event);
  });
  stickRing.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) updateStick(event); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stickRing.addEventListener(type, event => { if (event.pointerId === stickPointer) clearInput(); });
  canvas.addEventListener('pointerdown', event => {
    if (layer || state?.status !== 'playing' || arenaPointer !== null || stickPointer !== null) return;
    event.preventDefault(); arenaPointer = event.pointerId; canvas.setPointerCapture(event.pointerId);
    pointerTarget = targetAt(event);
  });
  canvas.addEventListener('pointermove', event => { if (event.pointerId === arenaPointer) pointerTarget = targetAt(event); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => { if (event.pointerId === arenaPointer) clearInput(); });
  function suspend() { clearInput(); if (open && !layer && state?.status === 'playing') showLayer('pause'); }
  window.addEventListener('blur', suspend); document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  updateInventoryUI();
  return {
    open() { if (open) return; open = true; dialog.showModal(); audio.open(); bag = collection.open(); resetReady(); resize(); frame = requestAnimationFrame(tick); },
    close() { open = false; cancelAnimationFrame(frame); clearInput(); clearTimeout(rewardToastTimer); clearTimeout(noticeTimer); clearTimeout(overTimer); clearTimeout(giftTimer); persist(); bag = collection.leaveGuest(); fireActive = false; fireworks?.clear(); $('#bubble-fireworks').hidden = true; $('.bubble-notice').hidden = true; audio.close(); if (dialog.open) dialog.close(); },
  };
}
