import './music.css';
import { createMusicWorld } from './music-world.js';

const time = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';
export function createMusicStage({ audio, onExit, onWorks }) {
  const dialog = document.createElement('dialog'); dialog.id = 'music-stage'; dialog.setAttribute('aria-labelledby', 'music-title');
  dialog.innerHTML = `<div class="music-shell">
    <header class="music-header"><div class="music-brand"><b>ah<span>.</span></b><div>SOUND ROOM<small>AFTERHOURS / STAGE 02</small></div></div><button class="music-exit" data-music="exit">返回主页 <span>↗</span></button></header>
    <div class="music-viewport"></div>
    <div class="music-intro"><span>02 / FIND THE FREQUENCY</span><h2 id="music-title">今晚，让声音<br>占据空间<span>.</span></h2><p>拖动环绕舞台 · 滚轮 / 双指缩放</p></div>
    <div class="music-tools" aria-label="舞台控制"><button data-music="camera">全景 <span>↻</span></button><button data-music="theme">紫电 <span>◌</span></button><button data-music="motion" aria-pressed="false">暂停灯光 <span>Ⅱ</span></button></div>
    <div class="music-caption"><span>ONE ROOM. ALL THE FREQUENCIES.</span><button data-music="works">音乐作品 <span>↗</span></button></div>
    <section class="music-player" aria-label="飘移音乐播放器">
      <div class="music-track"><div class="music-record" aria-hidden="true"><i></i></div><div><span>NOW ON DECK / 001</span><h3>飘移<small>周杰伦 / JAY CHOU</small></h3></div><span class="music-signal">READY TO PLAY</span></div>
      <div class="music-transport"><button class="music-play" data-music="play" aria-label="播放飘移">▶</button><div class="music-timeline"><div class="music-times"><span class="music-current">0:00</span><span class="music-status" role="status">准备打开声音…</span><span class="music-duration">0:00</span></div><input class="music-seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="歌曲进度" disabled></div><label class="music-volume"><span>音量</span><input type="range" min="0" max="1" step="0.01" value="0.7" aria-label="音乐音量"></label></div>
      <div class="music-player-foot"><span>LIVE AUDIO VISUALIZER</span><span>点击播放 / 暂停 · 拖动进度随时切入</span></div>
    </section>
    <div class="music-loading" role="status">正在点亮音乐台<span>SETTING THE STAGE FOR TONIGHT</span></div>
    <div class="music-error" hidden><strong>三维舞台暂时无法显示</strong><p>下方播放器仍可听歌和调整进度。</p><button data-music="retry">重新加载舞台 ↻</button></div>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector), seek = $('.music-seek');
  let world = null, open = false;
  function update() {
    const playing = audio.playing, media = audio.media, duration = media.duration;
    dialog.dataset.playing = String(playing);
    $('.music-play').textContent = playing ? 'Ⅱ' : '▶'; $('.music-play').setAttribute('aria-label', playing ? '暂停飘移' : '播放飘移');
    $('.music-duration').textContent = time(duration);
    seek.disabled = !Number.isFinite(duration); seek.max = Number.isFinite(duration) ? duration : 1;
    if (!audio.seeking) { seek.value = media.currentTime; $('.music-current').textContent = time(media.currentTime); }
    seek.style.setProperty('--progress', `${Number.isFinite(duration) ? Number(seek.value) / duration * 100 : 0}%`);
    seek.setAttribute('aria-valuetext', `${time(Number(seek.value))}，总时长 ${time(duration)}`);
    $('.music-status').textContent = audio.message || (audio.loading ? '正在缓冲…' : playing ? '正在播放 · 跟着节奏' : media.ended ? '这一曲结束，再听一次。' : '点击播放，打开声音。');
    $('.music-signal').textContent = playing ? '● LIVE SIGNAL' : 'READY TO PLAY';
    world?.refresh();
  }
  audio.subscribe(update);
  seek.addEventListener('input', () => { audio.setSeeking(true); $('.music-current').textContent = time(Number(seek.value)); seek.style.setProperty('--progress', `${Number(seek.value) / audio.media.duration * 100}%`); });
  seek.addEventListener('change', () => { audio.seek(Number(seek.value)); audio.setSeeking(false); update(); });
  // Release seek state if a drag is canceled by leaving the stage.
  seek.addEventListener('blur', () => { audio.setSeeking(false); update(); });
  $('.music-volume input').addEventListener('input', event => audio.setVolume(Number(event.target.value)));
  function motionLabel() {
    const moving = world?.moving ?? true, button = $('[data-music="motion"]');
    button.setAttribute('aria-pressed', String(!moving)); button.innerHTML = `${moving ? '暂停灯光' : '开启灯光'} <span>${moving ? 'Ⅱ' : '▶'}</span>`;
  }
  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-music]')?.dataset.music;
    if (action === 'exit') onExit();
    if (action === 'works') onWorks();
    if (action === 'play') audio.toggle();
    if (action === 'camera' && world) $('[data-music="camera"]').innerHTML = `${world.camera()} <span>↻</span>`;
    if (action === 'theme' && world) $('[data-music="theme"]').innerHTML = `${world.theme().split(' / ')[0]} <span>◌</span>`;
    if (action === 'motion' && world) { world.setMoving(!world.moving); motionLabel(); }
    if (action === 'retry') location.reload();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); onExit(); });
  dialog.addEventListener('keydown', event => {
    if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(event.target.tagName)) { event.preventDefault(); audio.toggle(); }
  });
  return {
    open() {
      open = true; dialog.showModal();
      try {
        if (!world) world = createMusicWorld({ mount: $('.music-viewport'), audio, onError() { $('.music-error').hidden = false; world?.stop(); } });
        world.start(); motionLabel();
      } catch (error) { console.error('Music stage failed:', error); $('.music-error').hidden = false; }
      $('.music-loading').hidden = true; update(); $('[data-music="exit"]').focus({ preventScroll: true });
    },
    close() { if (!open) return; open = false; audio.setSeeking(false); world?.stop(); dialog.close(); },
  };
}
