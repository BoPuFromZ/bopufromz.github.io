import './motor.css';
import { BODY_COLORS, WHEELS, LIGHT_COLORS, DEFAULT_CONFIG, loadCarConfig, saveCarConfig } from './car-options.js';
import { createMotorWorld } from './motor-world.js';
import { TRACK, formatTime } from './driving.js';

export function createMotorClub({ onExit, onConfig }) {
  const dialog = document.createElement('dialog'); dialog.id = 'motor-club'; dialog.setAttribute('aria-label', '复古车库与环形赛道');
  function wheelIcon(style) {
    const spokes = style.spokes ? Array.from({ length: style.spokes }, (_, i) => { const angle = i * Math.PI * 2 / style.spokes; return `<path d="M${24 + Math.sin(angle) * 4} ${24 + Math.cos(angle) * 4}L${24 + Math.sin(angle) * 16} ${24 + Math.cos(angle) * 16}"/>`; }).join('') : '<circle cx="24" cy="24" r="14" fill="currentColor" opacity=".65"/>';
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" stroke-width="5" opacity=".35"/><circle cx="24" cy="24" r="16"/>${spokes}<circle cx="24" cy="24" r="4" fill="currentColor"/></svg>`;
  }
  dialog.innerHTML = `<div class="motor-shell" data-mode="garage">
    <header class="motor-header"><div class="motor-wordmark"><span>ah<span>.</span></span><div>RETRO MOTOR CLUB<small id="motor-location">AFTERHOURS / CUSTOM BAY 04</small></div></div><div class="motor-header-actions"><button data-action="camera" aria-label="切换车辆观察视角">视角 ↻</button><button class="motor-exit" data-action="exit">返回主页 <span>↗</span></button></div></header>
    <div class="motor-viewport" id="motor-viewport"></div>
    <div class="motor-loading" role="status">正在打开车库<span>GOOD THINGS TAKE A MOMENT</span></div>
    <section class="motor-intro"><span class="motor-eyebrow">04 / THE CUSTOM BAY</span><h2>你的风格。<br>你的车库<span>.</span></h2><p>拖动环绕 · 双指或滚轮缩放<br>一辆复古小车，无数种可能。</p></section>
    <aside class="motor-console" aria-label="车辆改装面板"><div class="motor-console-heading"><span>BUILD / 001</span><span class="motor-save">本机已保存</span></div><h3>把热爱，改成你的样子。</h3>
      <div class="motor-tabs" role="tablist" aria-label="改装类别"><button role="tab" id="tab-wheels" aria-controls="tuning-wheels" aria-selected="true" data-tab="wheels">轮毂</button><button role="tab" id="tab-body" aria-controls="tuning-body" aria-selected="false" data-tab="body">车身</button><button role="tab" id="tab-lights" aria-controls="tuning-lights" aria-selected="false" data-tab="lights">车灯</button></div>
      <section class="motor-tuning-group" id="tuning-wheels" data-group="wheels" data-active="true" aria-labelledby="tab-wheels"><div class="tuning-title"><span>01 / 轮毂</span><b id="wheel-name"></b></div><div class="wheel-options">${WHEELS.map(w => `<button data-option="wheels" data-value="${w.id}" aria-label="轮毂：${w.name}" aria-pressed="false" style="--option-color:${w.hex}">${wheelIcon(w)}<strong>${w.name}</strong><small>${w.description}</small></button>`).join('')}</div></section>
      <section class="motor-tuning-group" id="tuning-body" data-group="body" data-active="false" aria-labelledby="tab-body"><div class="tuning-title"><span>02 / 车身颜色</span><b id="body-name"></b></div><div class="paint-options">${BODY_COLORS.map(c => `<button data-option="body" data-value="${c.id}" aria-label="车身颜色：${c.name}" aria-pressed="false" style="--swatch:${c.hex}"><i></i><span>${c.name}</span></button>`).join('')}</div></section>
      <section class="motor-tuning-group" id="tuning-lights" data-group="lights" data-active="false" aria-labelledby="tab-lights"><div class="tuning-title"><span>03 / 车灯颜色</span><b id="light-name"></b></div><div class="light-options">${LIGHT_COLORS.map(c => `<button data-option="lights" data-value="${c.id}" aria-label="车灯颜色：${c.name}" aria-pressed="false" style="--swatch:${c.hex}"><i></i><span>${c.name}</span></button>`).join('')}</div></section>
      <div class="motor-build-footer"><button class="motor-drive" data-action="drive">启动 · 去跑一圈 <span>↗</span></button><div><small>改装会随车进入赛道</small><button data-action="factory">恢复默认</button></div></div>
    </aside>
    <div class="motor-scene-caption"><span>AFTERHOURS / ORIGINAL HATCHBACK</span><span>KEEP IT PERSONAL.</span></div>
    <section class="race-hud" aria-label="驾驶仪表" hidden><div class="race-progress"><span>NIGHT CIRCUIT / 01</span><div><b id="race-checkpoints">0</b><small>/ 12 CHECKPOINTS</small></div><div class="race-progress-bar"><i></i></div></div><div class="race-clock"><small>本圈用时</small><strong id="race-time">00:00.00</strong><span id="race-best">本机最快 --:--.--</span></div><div class="race-map"><canvas id="race-map" width="180" height="180" aria-label="环形赛道小地图"></canvas></div><div class="race-speed"><strong id="race-speed">0</strong><span>KM/H</span><b id="race-gear">N</b></div><div class="race-actions"><button data-action="garage">返回改装</button><button data-action="restart">重置车辆</button><button data-action="pause" aria-label="暂停驾驶">暂停 Ⅱ</button></div><p class="race-guide">↑ 加速 · ↓ 刹车 / 倒车 · ← → 转向 <span>R 重置 · ESC 暂停</span></p><div class="race-impact" role="status" hidden>碰到护栏了 · 减速后调整方向</div>
      <div class="touch-controls" aria-label="手机驾驶方向按键"><div class="touch-steer"><button data-control="left" aria-label="向左转向">←<small>左转</small></button><button data-control="right" aria-label="向右转向">→<small>右转</small></button></div><div class="touch-pedals"><button data-control="up" aria-label="加速">↑<small>加速</small></button><button data-control="down" aria-label="刹车或倒车">↓<small>刹车</small></button></div></div>
    </section>
    <section class="motor-race-card motor-pause" aria-labelledby="race-pause-title" hidden><span>PIT STOP</span><h3 id="race-pause-title">停一下，再继续。</h3><p>沿路面箭头方向，通过 12 个检查点。<br>同时按住加速和转向即可过弯。</p><button class="motor-drive" data-action="resume">继续驾驶 <span>↗</span></button><button class="card-secondary" data-action="garage">返回改装车库</button></section>
    <section class="motor-race-card motor-result" aria-labelledby="race-result-title" hidden><span>LAP COMPLETE / 01</span><h3 id="race-result-title">这一圈，属于你。</h3><strong id="result-time">00:00.00</strong><p id="result-record"></p><button class="motor-drive" data-action="restart">再跑一圈 <span>↗</span></button><button class="card-secondary" data-action="garage">返回改装车库</button></section>
    <div class="motor-error" hidden><h3>暂时无法打开三维车库</h3><p>可以返回主页，重新进入车库。</p><button class="motor-drive" data-action="exit">返回主页 ↗</button></div>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector), shell = $('.motor-shell'), mount = $('#motor-viewport');
  let world = null, config = loadCarConfig(), mode = 'garage', paused = false, finished = false, impactTimer, telemetry = null;
  const heldKeys = new Set(), pointers = new Map();
  let best = null; try { const stored = Number(localStorage.getItem('afterhours.circuit.best.v1')); if (Number.isFinite(stored) && stored > 0) best = stored; } catch { /* Private browsing can disable persistence. */ }
  function syncConfig() {
    dialog.querySelectorAll('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(config[button.dataset.option] === button.dataset.value)));
    $('#wheel-name').textContent = WHEELS.find(w => w.id === config.wheels).name;
    $('#body-name').textContent = BODY_COLORS.find(c => c.id === config.body).name;
    $('#light-name').textContent = LIGHT_COLORS.find(c => c.id === config.lights).name;
    const saved = saveCarConfig(config); $('.motor-save').textContent = saved ? '本机已保存' : '当前会话';
    shell.dataset.config = JSON.stringify(config); world?.setConfig(config); onConfig?.(config);
  }
  function inputState() {
    const input = {}; for (const direction of ['up', 'down', 'left', 'right']) input[direction] = heldKeys.has(direction) || [...pointers.values()].includes(direction);
    world?.setInput(input);
    dialog.querySelectorAll('[data-control]').forEach(b => b.classList.toggle('pressed', !!input[b.dataset.control]));
  }
  function clearInput() { heldKeys.clear(); pointers.clear(); inputState(); }
  function drawMap(state) {
    const ctx = $('#race-map').getContext('2d'); ctx.clearRect(0, 0, 180, 180);
    ctx.strokeStyle = '#456057'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(90, 90, 62, 0, Math.PI * 2); ctx.stroke();
    for (let i = 1; i <= TRACK.checkpoints; i++) { const angle = i * Math.PI * 2 / TRACK.checkpoints; ctx.fillStyle = i < state.nextCheckpoint ? '#d4ee8c' : '#81938c'; ctx.beginPath(); ctx.arc(90 + Math.cos(angle) * 62, 90 + Math.sin(angle) * 62, 2.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffb46e'; ctx.fillRect(149, 86, 7, 8);
    ctx.fillStyle = '#ecefdf'; ctx.save(); ctx.translate(90 + state.x / TRACK.radius * 62, 90 + state.z / TRACK.radius * 62); ctx.rotate(state.heading); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function updateHUD(state) {
    telemetry = state; $('#race-speed').textContent = Math.round(Math.abs(state.speed) * 3.6);
    $('#race-gear').textContent = state.speed < -.1 ? 'R' : state.speed < .1 ? 'N' : String(Math.min(4, 1 + Math.floor(state.speed / 8)));
    $('#race-checkpoints').textContent = Math.min(12, state.nextCheckpoint - 1);
    $('#race-time').textContent = formatTime(state.elapsed); $('#race-best').textContent = `本机最快 ${best ? formatTime(best) : '--:--.--'}`;
    $('.race-progress-bar i').style.width = `${Math.min(100, state.progress / (Math.PI * 2) * 100)}%`;
    shell.dataset.driveState = JSON.stringify({ x: state.x, z: state.z, speed: state.speed, heading: state.heading, checkpoints: state.nextCheckpoint - 1, elapsed: state.elapsed, finished: state.finished, collisions: state.collisions });
    drawMap(state);
  }
  function setPaused(value) {
    if (mode !== 'race' || finished) return;
    paused = value; shell.dataset.paused = String(paused); clearInput(); world?.setPaused(value);
    $('.motor-pause').hidden = !paused; $('[data-action="pause"]').textContent = paused ? '继续 ▷' : '暂停 Ⅱ';
    if (paused) $('[data-action="resume"]').focus(); else mount.querySelector('canvas')?.focus({ preventScroll: true });
  }
  function changeMode(next) {
    clearInput(); mode = next; paused = false; finished = false; shell.dataset.mode = next; shell.dataset.paused = 'false';
    $('.race-hud').hidden = next !== 'race'; $('.motor-pause').hidden = true; $('.motor-result').hidden = true; $('.race-impact').hidden = true;
    $('#motor-location').textContent = next === 'race' ? 'AFTERHOURS / NIGHT CIRCUIT 01' : 'AFTERHOURS / CUSTOM BAY 04';
    $('[data-action="pause"]').textContent = '暂停 Ⅱ'; world?.setMode(next); mount.querySelector('canvas')?.focus({ preventScroll: true });
  }
  function restart() { clearInput(); paused = false; finished = false; shell.dataset.paused = 'false'; $('.motor-pause').hidden = true; $('.motor-result').hidden = true; $('.race-impact').hidden = true; $('[data-action="pause"]').textContent = '暂停 Ⅱ'; world?.resetRace(); mount.querySelector('canvas')?.focus({ preventScroll: true }); }
  function finish(state) {
    finished = true; clearInput(); const record = !best || state.lastLap < best;
    if (record) { best = state.lastLap; try { localStorage.setItem('afterhours.circuit.best.v1', String(best)); } catch { /* Session record remains available. */ } }
    updateHUD(state); $('#result-time').textContent = formatTime(state.lastLap);
    $('#result-record').textContent = record ? '新的本机最快记录。下一圈，继续突破。' : `本机最快 ${formatTime(best)} · 再试一次，找到你的节奏。`;
    $('.motor-result').hidden = false; $('.motor-result [data-action="restart"]').focus();
  }
  function boot() {
    $('.motor-loading').hidden = false; $('.motor-error').hidden = true;
    try {
      world = createMotorWorld({ mount, config, onTelemetry: updateHUD, onFinish: finish,
        onCollision() { $('.race-impact').hidden = false; clearTimeout(impactTimer); impactTimer = setTimeout(() => { $('.race-impact').hidden = true; }, 1800); },
        onError() { clearInput(); $('.motor-error').hidden = false; },
      });
      const observer = new MutationObserver(() => { if (mount.dataset.ready === 'true') { $('.motor-loading').hidden = true; observer.disconnect(); } });
      observer.observe(mount, { attributes: true, attributeFilter: ['data-ready'] });
      world.readinessObserver = observer;
    } catch (error) { console.error('Motor club failed:', error); $('.motor-loading').hidden = true; $('.motor-error').hidden = false; }
  }
  dialog.addEventListener('click', event => {
    const option = event.target.closest('[data-option]'); if (option) { config = { ...config, [option.dataset.option]: option.dataset.value }; syncConfig(); }
    const tab = event.target.closest('[data-tab]'); if (tab) { dialog.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === tab))); dialog.querySelectorAll('[data-group]').forEach(g => g.dataset.active = String(g.dataset.group === tab.dataset.tab)); }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'exit') onExit?.();
    if (action === 'camera') world?.cycleCamera();
    if (action === 'factory') { config = { ...DEFAULT_CONFIG }; syncConfig(); }
    if (action === 'drive' && world) changeMode('race');
    if (action === 'garage') changeMode('garage');
    if (action === 'pause') setPaused(!paused);
    if (action === 'resume') setPaused(false);
    if (action === 'restart') restart();
  });
  $('.motor-tabs').addEventListener('keydown', event => {
    const tabs = [...dialog.querySelectorAll('[data-tab]')], index = tabs.indexOf(event.target);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  function keydown(event) {
    if (!dialog.open || mode !== 'race') return;
    if (keys[event.key]) { event.preventDefault(); if (!paused && !finished) { heldKeys.add(keys[event.key]); inputState(); } }
    if (!event.repeat && event.key.toLowerCase() === 'r') { event.preventDefault(); restart(); }
    if (!event.repeat && event.key.toLowerCase() === 'p') { event.preventDefault(); setPaused(!paused); }
  }
  function keyup(event) { if (!dialog.open || !keys[event.key]) return; heldKeys.delete(keys[event.key]); inputState(); }
  dialog.addEventListener('keydown', keydown); dialog.addEventListener('keyup', keyup);
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (mode === 'race' && !finished) setPaused(!paused); else if (mode === 'race') changeMode('garage'); else onExit?.(); });
  dialog.querySelectorAll('[data-control]').forEach(button => {
    button.addEventListener('pointerdown', event => { if (paused || finished || mode !== 'race') return; event.preventDefault(); pointers.set(event.pointerId, button.dataset.control); button.setPointerCapture(event.pointerId); inputState(); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { pointers.delete(event.pointerId); inputState(); });
    button.addEventListener('contextmenu', event => event.preventDefault());
  });
  function suspend() { clearInput(); if (dialog.open && mode === 'race' && !paused && !finished) setPaused(true); }
  window.addEventListener('blur', suspend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  syncConfig();
  return {
    open() { if (dialog.open) return; dialog.showModal(); mode = 'garage'; shell.dataset.mode = 'garage'; $('.race-hud').hidden = true; $('.motor-pause').hidden = true; $('.motor-result').hidden = true; config = loadCarConfig(); syncConfig(); boot(); $('[data-action="drive"]').focus({ preventScroll: true }); },
    close() { clearInput(); clearTimeout(impactTimer); world?.readinessObserver?.disconnect(); world?.dispose(); world = null; if (dialog.open) dialog.close(); },
  };
}
