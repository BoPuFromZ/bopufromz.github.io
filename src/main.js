import { profile, sections } from './content.js';
import { createMusicAudio } from './music-audio.js';

const $ = selector => document.querySelector(selector);
const iconPaths = {
  game: '<path d="M8 7h8l4 2 2 10-3 2-5-5h-4l-5 5-3-2L4 9Z"/><path d="M6 12h5m-2.5-2.5v5"/><circle cx="16" cy="11" r=".7"/><circle cx="18" cy="14" r=".7"/>',
  music: '<path d="M8 18V6l12-3v12M8 9l12-3"/><ellipse cx="5" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="15" rx="3" ry="2"/>',
  animation: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m10 8 6 4-6 4ZM3 7h3M3 12h3M3 17h3M18 7h3M18 12h3M18 17h3"/>',
  car: '<path d="m3 10 2-6h14l2 6v9H3Zm0 0h18M7 19v2m10-2v2"/><path d="M7 7h10M8 15h8"/><circle cx="6.5" cy="13" r="1"/><circle cx="17.5" cy="13" r="1"/>',
  fitness: '<path d="M8 12h8M3 7v10m4-12v14m10-14v14m4-12v10M1 9v6m22-6v6"/>',
  reset: '<path d="M4 9a8 8 0 1 1 1 9M4 3v6h6"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  motion: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4ZM16 8q4 4 0 8M19 5q7 7 0 14"/>',
  muted: '<path d="M4 9h4l5-4v14l-5-4H4ZM17 9l5 6m0-6-5 6"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  spark: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.spark}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
for (const [id, name] of [['reset-view', 'reset'], ['light-toggle', 'light'], ['motion-toggle', 'motion'], ['sound-toggle', 'muted'], ['fullscreen-toggle', 'fullscreen']]) $('#' + id).innerHTML = icon(name);

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function safeUrl(value) { if (!value) return ''; try { const url = new URL(value, location.origin); return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
const panel = $('#content-panel');
let garage = null, activePanel = null, previousFocus = null, ownsHistory = false, toastTimer, muted = true, audio = null, audioGain = null;
let motion = !matchMedia('(prefers-reduced-motion:reduce)').matches, day = false;
let motorClub = null, carActive = false, carOwnsHistory = false, carOpening = 0, carPreviousFocus = null;
let musicStage = null, musicAudio = null, musicActive = false, musicOwnsHistory = false, musicOpening = 0, musicPreviousFocus = null;
let bubbleGarden = null, gameActive = false, gameOwnsHistory = false, gameOpening = 0, gamePreviousFocus = null;
const validPanels = new Set([...Object.keys(sections), 'musicworks', 'about', 'contact', 'collection', 'help']);

function updateAmbience() { if (audioGain) audioGain.gain.setTargetAtTime(document.hidden || muted || musicActive || gameActive ? 0 : .16, audio.currentTime, .2); }
async function openGame({ updateHistory = true } = {}) {
  if (gameActive) return;
  closeMusic({ updateHistory: false }); closeCar({ updateHistory: false }); closePanel({ updateHistory: false });
  gamePreviousFocus = document.activeElement; gameActive = true;
  const token = ++gameOpening; garage?.setActive(false); document.body.style.overflow = 'hidden'; updateAmbience();
  if (updateHistory) { history.pushState({ garagePanel: 'game' }, '', '#game'); gameOwnsHistory = true; }
  toast('正在打开七色泡泡花园…');
  try {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    if (!bubbleGarden) {
      const { createBubbleGarden } = await import('./bubble-game.js');
      if (token !== gameOpening) return;
      bubbleGarden = createBubbleGarden({ onExit: () => closeGame() });
    }
    if (token === gameOpening) { bubbleGarden.open(); $('#toast').hidden = true; }
  } catch (error) { console.error('Could not enter bubble garden:', error); closeGame(); toast('暂时无法打开泡泡花园，请重新试一次。'); }
}
function closeGame({ updateHistory = true } = {}) {
  if (!gameActive) return;
  ++gameOpening; gameActive = false; bubbleGarden?.close(); document.body.style.overflow = '';
  garage?.setActive(!panel.open && !carActive && !musicActive); updateAmbience();
  if (updateHistory) { if (gameOwnsHistory) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
  gameOwnsHistory = false; if (gamePreviousFocus?.isConnected) gamePreviousFocus.focus({ preventScroll: true });
}
async function openMusic({ updateHistory = true } = {}) {
  if (musicActive) return;
  closeGame({ updateHistory: false }); closeCar({ updateHistory: false }); closePanel({ updateHistory: false });
  musicPreviousFocus = document.activeElement; musicActive = true;
  const token = ++musicOpening;
  garage?.setActive(false); document.body.style.overflow = 'hidden'; updateAmbience();
  musicAudio ||= createMusicAudio(); musicAudio.open();
  if (updateHistory) { history.pushState({ garagePanel: 'music' }, '', '#music'); musicOwnsHistory = true; }
  toast('正在点亮音乐台…');
  try {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    if (!musicStage) {
      const { createMusicStage } = await import('./music.js');
      if (token !== musicOpening) return;
      musicStage = createMusicStage({ audio: musicAudio, onExit: () => closeMusic(), onWorks: () => openPanel('musicworks') });
    }
    if (token === musicOpening) { musicStage.open(); $('#toast').hidden = true; }
  } catch (error) { console.error('Could not enter music stage:', error); closeMusic(); toast('暂时无法打开音乐台，请重新试一次。'); }
}
function closeMusic({ updateHistory = true } = {}) {
  if (!musicActive) return;
  ++musicOpening; musicActive = false; musicAudio?.close(); musicStage?.close();
  document.body.style.overflow = ''; garage?.setActive(!panel.open && !carActive && !gameActive); updateAmbience();
  if (updateHistory) { if (musicOwnsHistory) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
  musicOwnsHistory = false; if (musicPreviousFocus?.isConnected) musicPreviousFocus.focus({ preventScroll: true });
}

async function openCar({ updateHistory = true } = {}) {
  if (carActive) return;
  closeGame({ updateHistory: false });
  closeMusic({ updateHistory: false });
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  closePanel({ updateHistory: false });
  carPreviousFocus = document.activeElement; carActive = true;
  const token = ++carOpening; garage?.setActive(false); document.body.style.overflow = 'hidden';
  if (updateHistory) { history.pushState({ garagePanel: 'car' }, '', '#car'); carOwnsHistory = true; }
  toast('正在打开复古车库…');
  try {
    if (!motorClub) {
      const { createMotorClub } = await import('./motor.js');
      if (token !== carOpening) return;
      motorClub = createMotorClub({ onExit: () => closeCar(), onConfig: value => garage?.setCarConfig(value) });
    }
    if (token === carOpening) { motorClub.open(); $('#toast').hidden = true; }
  } catch (error) { console.error('Could not enter garage:', error); closeCar(); toast('暂时无法进入复古车库，请重新试一次。'); }
}
function closeCar({ updateHistory = true } = {}) {
  if (!carActive) return;
  ++carOpening; carActive = false; motorClub?.close(); document.body.style.overflow = ''; garage?.setActive(!panel.open && !musicActive && !gameActive);
  if (updateHistory) { if (carOwnsHistory) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
  carOwnsHistory = false; if (carPreviousFocus?.isConnected) carPreviousFocus.focus({ preventScroll: true });
}

function heading(title, english, name = 'spark') { return `<div class="panel-heading"><div><h2 id="panel-title">${escape(title)}</h2><p>${escape(english)}</p></div><span class="panel-icon">${icon(name)}</span></div>`; }
function worksMarkup(section) {
  if (!section.works.length) return `<div class="empty-gallery"><span class="empty-coordinate">RESERVED FOR WHAT'S NEXT</span>${icon('spark')}<strong>留给下一次灵感。</strong><p>作品准备好后，会出现在这里。</p></div>`;
  return section.works.map(work => {
    const url = safeUrl(work.url), image = safeUrl(work.image);
    return `<article class="work-card">${image ? `<img src="${escape(image)}" alt="${escape(work.title)}" loading="lazy">` : ''}<div class="work-text"><div class="work-meta">${[work.year, work.status, work.role].filter(Boolean).map(v => `<span>${escape(v)}</span>`).join('')}</div><h3>${escape(work.title)}</h3><p>${escape(work.summary)}</p>${url ? `<a class="work-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(work.linkLabel || '查看作品')} ↗</a>` : ''}</div></article>`;
  }).join('');
}
function sectionMarkup(id) {
  const s = sections[id];
  return heading(s.title, s.english, id) + `<p class="panel-lead">${escape(s.subtitle)}</p>` + (s.description ? `<p class="panel-description">${escape(s.description)}</p>` : '') + (s.tools.length ? `<div class="tags">${s.tools.map(t => `<span>${escape(t)}</span>`).join('')}</div>` : '') + (s.stats ? `<div class="stats-grid">${s.stats.map(stat => `<div class="stat"><strong>${escape(stat.value)}</strong>${stat.unit ? `<span class="unit">${escape(stat.unit)}</span>` : ''}<p>${escape(stat.label)}</p></div>`).join('')}</div><article class="training-record"><h3>${escape(s.record.title)}</h3><p>${escape(s.record.text)}</p></article>` : '') + worksMarkup(s);
}
function render(id) {
  const section = sections[id === 'musicworks' ? 'music' : id];
  panel.style.setProperty('--accent', section?.color || '#d4ee8c');
  $('#panel-kicker').textContent = section ? `${section.number} / ${section.english}` : `AFTERHOURS / ${id.toUpperCase()}`;
  let html;
  if (section) html = sectionMarkup(id === 'musicworks' ? 'music' : id);
  else if (id === 'about') html = heading(profile.name || '关于这个车库', 'ONE PERSON. MANY POSSIBILITIES.') + `<div class="about-wordmark">AFTER HOURS<span style="color:#ffb46e">.</span></div><p class="panel-lead">灵感不打烊。<br>这里收藏五种热爱，也留着许多新的可能。</p>${profile.introduction ? `<p class="panel-description">${escape(profile.introduction)}</p>` : '<div class="about-blank" aria-label="个人介绍留白"></div>'}<div class="about-lanes">${Object.values(sections).map(s => `<span>${escape(s.title)}</span>`).join('')}</div>${profile.location ? `<p class="panel-description">${escape(profile.location)}</p>` : ''}`;
  else if (id === 'collection') html = heading('作品索引', 'FIVE DIRECTIONS. KEEP EXPLORING.') + `<p class="panel-lead">选择一个方向，看看正在发生的事。</p><div class="index-grid">${Object.entries(sections).map(([key, s]) => `<button class="index-card" data-panel="${key}" style="--accent:${s.color}"><span class="index-num">${s.number}</span><span class="index-arrow">↗</span><h3>${escape(s.title)}</h3><p>${escape(s.english)}</p></button>`).join('')}</div>`;
  else if (id === 'contact') html = heading('来聊聊', 'GOOD IDEAS START WITH A HELLO.') + `<p class="panel-lead">关于游戏、声音、影像，<br>或者聊聊你正在做的有趣的事。</p>` + [{ label: 'GITHUB', url: profile.github, name: profile.github?.split('/').filter(Boolean).pop() }, ...(profile.email ? [{ label: 'EMAIL', url: `mailto:${profile.email}`, name: profile.email }] : []), ...profile.links].filter(l => safeUrl(l.url)).map(l => `<a class="contact-link" href="${escape(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer"><span><small>${escape(l.label)}</small><strong>${escape(l.name || l.url)}</strong></span><span>↗</span></a>`).join('');
  else html = heading('探索指南', 'TAKE A LOOK AROUND.') + `<p class="panel-lead">按自己的节奏，探索这个小世界。</p><dl class="help-grid"><dt>拖动 / 单指</dt><dd>围绕车库旋转视角。</dd><dt>滚轮 / 双指</dt><dd>拉近或拉远，看看物件的细节。</dd><dt>点击物件</dt><dd>打开对应的游戏、音乐、动画、汽车或训练内容。</dd><dt>底部导航</dt><dd>直接进入五个内容区。</dd><dt>方向键</dt><dd>旋转视角，Home 恢复初始视角。</dd><dt>ESC</dt><dd>关闭内容面板，回到车库。</dd><dt>右侧工具</dt><dd>重置、切换灯光、暂停动画、开启环境声和全屏。</dd></dl>`;
  $('#panel-body').innerHTML = html;
  $('#panel-body').scrollTop = 0; panel.scrollTop = 0;
}

async function openPanel(id, { updateHistory = true } = {}) {
  if (!validPanels.has(id) || (activePanel === id && panel.open)) return;
  if (id === 'car') return openCar({ updateHistory });
  if (id === 'music') return openMusic({ updateHistory });
  if (id === 'game') return openGame({ updateHistory });
  closeGame({ updateHistory: false });
  closeMusic({ updateHistory: false });
  closeCar({ updateHistory: false });
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  const wasOpen = panel.open;
  if (!wasOpen) previousFocus = document.activeElement;
  activePanel = id; render(id);
  document.querySelectorAll('.destinations [data-panel]').forEach(el => el.setAttribute('aria-current', String(el.dataset.panel === id)));
  if (!wasOpen) { panel.showModal(); garage?.setActive(false); document.body.style.overflow = 'hidden'; }
  if (updateHistory) { if (wasOpen) history.replaceState({ garagePanel: id }, '', `#${id}`); else { history.pushState({ garagePanel: id }, '', `#${id}`); ownsHistory = true; } }
  $('#close-panel').focus({ preventScroll: true });
}
function closePanel({ updateHistory = true } = {}) {
  if (!panel.open) return;
  panel.close(); activePanel = null; document.body.style.overflow = ''; garage?.setActive(!gameActive && !carActive && !musicActive);
  document.querySelectorAll('.destinations [data-panel]').forEach(el => el.removeAttribute('aria-current'));
  if (updateHistory) { if (ownsHistory) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
  ownsHistory = false; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
}
document.addEventListener('click', e => { const button = e.target.closest('[data-panel]'); if (button && !button.classList.contains('hotspot')) openPanel(button.dataset.panel); });
$('#close-panel').addEventListener('click', () => closePanel());
$('#back-garage').addEventListener('click', () => closePanel());
panel.addEventListener('cancel', e => { e.preventDefault(); closePanel(); });
panel.addEventListener('click', e => { if (e.target === panel) { const r = panel.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closePanel(); } });
window.addEventListener('popstate', () => { const id = location.hash.slice(1); if (validPanels.has(id)) openPanel(id, { updateHistory: false }); else { closeGame({ updateHistory: false }); closeMusic({ updateHistory: false }); closeCar({ updateHistory: false }); closePanel({ updateHistory: false }); } });
$('.brand').addEventListener('click', e => { e.preventDefault(); closeGame(); closeMusic(); closeCar(); closePanel(); garage?.reset(); });
$('#help-button').addEventListener('click', () => openPanel('help'));

function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2600); }
$('#reset-view').addEventListener('click', () => { garage?.reset(); toast('回到最初的视角。'); });
$('#explore-button').addEventListener('click', () => { $('#scene-area').scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'center' }); garage?.explore(); $('#scene-host canvas')?.focus({ preventScroll: true }); toast('点击车库里的物件，发现五种热爱。'); });
$('#light-toggle').addEventListener('click', () => { day = !day; garage?.setDay(day); $('#light-toggle').setAttribute('aria-pressed', String(day)); $('#light-toggle').setAttribute('aria-label', day ? '切换至夜间灯光' : '切换至日间灯光'); $('#scene-label').textContent = day ? 'A NEW DAY, A NEW POSSIBILITY.' : 'AFTER HOURS, BEFORE TOMORROW.'; toast(day ? '白昼模式 · 让细节更清楚。' : '夜间模式 · 灵感不打烊。'); });
function motionState() { $('#motion-toggle').setAttribute('aria-pressed', String(!motion)); $('#motion-toggle').setAttribute('aria-label', motion ? '暂停场景动画' : '开启场景动画'); $('#motion-toggle').innerHTML = icon(motion ? 'motion' : 'play'); }
motionState();
$('#motion-toggle').addEventListener('click', () => { motion = !motion; garage?.setMotion(motion); motionState(); toast(motion ? '场景动画已开启。' : '场景动画已暂停。'); });
$('#fullscreen-toggle').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#scene-area').requestFullscreen(); } catch { toast('当前浏览器无法全屏，仍可拖动和缩放。'); } });
document.addEventListener('fullscreenchange', () => { $('#fullscreen-toggle').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '全屏探索'); });

// Optional ambience is synthesized locally; no user's music or external audio is invented.
async function toggleSound() {
  try {
    if (!audio) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw new Error('Unavailable');
      audio = new Audio(); audioGain = audio.createGain(); audioGain.gain.value = 0; audioGain.connect(audio.destination);
      const buffer = audio.createBuffer(1, audio.sampleRate * 6, audio.sampleRate); const data = buffer.getChannelData(0); let last = 0;
      for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * .035) / 1.035; data[i] = last; }
      const noise = audio.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const lowpass = audio.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 500; noise.connect(lowpass); lowpass.connect(audioGain); noise.start();
      for (const frequency of [55, 82.41]) { const oscillator = audio.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; const g = audio.createGain(); g.gain.value = .05; oscillator.connect(g); g.connect(audioGain); oscillator.start(); }
    }
    muted = !muted; await audio.resume(); updateAmbience();
    $('#sound-toggle').setAttribute('aria-pressed', String(!muted)); $('#sound-toggle').setAttribute('aria-label', muted ? '开启车库环境声音' : '关闭车库环境声音'); $('#sound-toggle').innerHTML = icon(muted ? 'muted' : 'sound'); toast(muted ? '环境声音已关闭。' : '环境声音已开启 · 轻轻听。');
  } catch { toast('当前浏览器无法播放环境声音。'); }
}
$('#sound-toggle').addEventListener('click', toggleSound);
document.addEventListener('visibilitychange', updateAmbience);

$('#year').textContent = new Date().getFullYear();
function tick() { $('#local-time').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }); }
tick(); setInterval(tick, 30000);
function sceneError(error) { $('#scene-loading').hidden = true; $('#scene-error').hidden = false; console.error('Garage scene failed:', error); }
$('#retry-scene').addEventListener('click', () => location.reload());
$('#scene-host').addEventListener('scene-error', () => sceneError('WebGL context lost'));
try {
  const { createGarage } = await import('./scene.js');
  garage = createGarage({ mount: $('#scene-host'), hotspots: $('#hotspots'), reduced: !motion, onOpen: openPanel,
    onReady() { $('#scene-loading').classList.add('loaded'); setTimeout(() => { $('#scene-loading').hidden = true; }, 650); document.body.dataset.sceneReady = 'true'; if (panel.open || carActive || musicActive || gameActive) garage?.setActive(false); },
    onHover(id) { const tooltip = $('#scene-tooltip'); tooltip.hidden = !id; if (id) tooltip.textContent = `点击探索 ${sections[id].title} ↗`; },
  });
} catch (error) { sceneError(error); }
const initialPanel = location.hash.slice(1); if (validPanels.has(initialPanel)) openPanel(initialPanel, { updateHistory: false });
