import './fitness.css';
import { createFitnessWorld } from './fitness-world.js';
import { DEADLIFT_STEPS } from './fitness-motion.js';

export function createFitnessStage({ onExit, onRecords }) {
  const dialog = document.createElement('dialog'); dialog.id = 'fitness-stage'; dialog.setAttribute('aria-labelledby', 'fitness-title');
  dialog.innerHTML = `<div class="fitness-shell">
    <header class="fitness-header"><div class="fitness-brand"><b>ah<span>.</span></b><div>TRAINING BAY<small>AFTERHOURS / ROOM 05</small></div></div><button data-fitness="exit">返回主页 <span>↗</span></button></header>
    <div id="fitness-viewport"></div>
    <div class="fitness-intro"><span>05 / ONE MORE REP</span><h2 id="fitness-title">训练区<span>.</span></h2><div class="fitness-load"><strong>200<small>KG</small></strong><p>硬拉台 / DEADLIFT PLATFORM</p></div></div>
    <section class="fitness-panel" aria-label="硬拉动作步骤">
      <div class="fitness-panel-kicker"><span>DEADLIFT / STEP BY STEP</span><span id="fitness-count">01 / 05</span></div>
      <div class="fitness-status" role="status" aria-live="polite" aria-atomic="true"><span id="fitness-phase">下一步</span><h3 id="fitness-status">站位</h3><p id="fitness-detail">小人走到杠铃前，完成站位。</p></div>
      <ol class="fitness-steps">${DEADLIFT_STEPS.map((step, i) => `<li data-step="${i + 1}"><span class="fitness-step-number">0${i + 1}</span><span class="fitness-step-title">${step.title}</span><span class="fitness-step-short">${step.short}</span><i aria-hidden="true"></i></li>`).join('')}</ol>
      <div class="fitness-progress" role="progressbar" aria-label="当前动作进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <button id="fitness-next" data-fitness="next"><span>执行步骤 01</span><b>→</b></button>
      <div class="fitness-actions"><button data-fitness="reset">重新开始 ↻</button><button data-fitness="camera">切换视角 ◉</button><button data-fitness="records">训练记录 ↗</button></div>
      <p class="fitness-panel-note">每次点击完成一个动作 · 拖动查看不同角度</p>
    </section>
    <div class="fitness-caption">STAY CONSISTENT. KEEP SHOWING UP.</div>
    <div class="fitness-loading" role="status">正在打开硬拉台<span>GET READY FOR THE NEXT REP</span></div>
    <div class="fitness-error" hidden><strong>三维训练区暂时无法显示</strong><button data-fitness="retry">重新加载 ↻</button></div>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector), viewport = $('#fitness-viewport'), next = $('#fitness-next');
  let world = null, observer = null;
  function update(state) {
    dialog.dataset.state = JSON.stringify(state);
    const done = state.completed === DEADLIFT_STEPS.length, index = state.running ? state.step - 1 : state.completed, step = DEADLIFT_STEPS[index];
    $('#fitness-count').textContent = `${String(Math.min(index + 1, 5)).padStart(2, '0')} / 05`;
    $('#fitness-phase').textContent = done ? '本次演示完成' : state.running ? '动作进行中' : '下一步';
    $('#fitness-status').textContent = done ? '完成 · 杠铃已放下' : step.title;
    $('#fitness-detail').textContent = done ? '五个步骤完成。点击下方按钮，从站位重新演示。' : step.detail;
    next.disabled = state.running; next.querySelector('span').textContent = done ? '重新演示' : state.running ? '动作进行中…' : `执行步骤 ${String(index + 1).padStart(2, '0')}`;
    const progress = done ? 100 : state.running ? Math.round(state.progress * 100) : 0;
    $('.fitness-progress').style.setProperty('--fitness-progress', `${progress}%`); $('.fitness-progress').setAttribute('aria-valuenow', progress);
    dialog.querySelectorAll('[data-step]').forEach(item => {
      const number = Number(item.dataset.step), completed = number <= state.completed, current = !done && number === index + 1;
      item.classList.toggle('is-complete', completed); item.classList.toggle('is-current', current);
      if (current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      item.querySelector('i').textContent = completed ? '✓' : current ? '•' : '';
    });
  }
  function boot() {
    $('.fitness-error').hidden = true; $('.fitness-loading').hidden = false; next.disabled = true;
    try {
      world = createFitnessWorld({ mount: viewport, onState: update, onError() { $('.fitness-error').hidden = false; next.disabled = true; } });
      observer = new MutationObserver(() => { if (viewport.dataset.ready) { $('.fitness-loading').hidden = true; observer.disconnect(); } });
      observer.observe(viewport, { attributes: true, attributeFilter: ['data-ready'] });
    } catch (error) { console.error('Fitness scene failed:', error); $('.fitness-loading').hidden = true; $('.fitness-error').hidden = false; next.disabled = true; }
  }
  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-fitness]')?.dataset.fitness;
    if (action === 'exit') onExit();
    if (action === 'records') onRecords();
    if (action === 'next' && world) { if (JSON.parse(dialog.dataset.state).completed === 5) world.reset(); else world.startStep(); }
    if (action === 'reset') world?.reset();
    if (action === 'camera') world?.cycleCamera();
    if (action === 'retry') location.reload();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); onExit(); });
  return {
    open() { dialog.showModal(); boot(); next.focus({ preventScroll: true }); },
    close() { observer?.disconnect(); world?.dispose(); world = null; dialog.close(); },
  };
}
