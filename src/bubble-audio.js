// A locally composed music-box loop and distinct Web Audio cues. No downloads.
export const MUSIC_STEP = 60 / 108 / 2;
const MELODY = [
  72,76,79,76,81,79,76,0, 74,77,81,77,79,77,74,0,
  72,76,79,84,83,79,76,0, 74,79,83,81,79,76,74,0,
  76,79,84,79,81,79,76,72, 77,81,84,81,86,84,81,0,
  76,79,84,83,81,79,76,74, 74,77,79,83,79,76,72,0,
];
const BASS = [48,50,48,55,45,53,48,55];
const midi = note => 440 * 2 ** ((note - 69) / 12);
const SOUND_KEY = 'afterhours.bubble-sound.v1';
const noiseCache = new WeakMap();
function voice(ctx, destination, frequency, when, duration, volume, type = 'sine', endFrequency, track) {
  const oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, when);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
  gain.gain.setValueAtTime(.0001, when); gain.gain.linearRampToValueAtTime(volume, when + .007);
  gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
  oscillator.connect(gain); gain.connect(destination); track?.(oscillator, gain);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(when); oscillator.stop(when + duration + .015);
}
function noise(ctx, destination, when, duration, volume, cutoff, track) {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .35), ctx.sampleRate);
    const samples = buffer.getChannelData(0); let seed = 239;
    for (let i = 0; i < samples.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
    noiseCache.set(ctx, buffer);
  }
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, when); gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
  source.connect(filter); filter.connect(gain); gain.connect(destination); track?.(source, filter, gain);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start(when); source.stop(when + duration + .01);
}
function bell(ctx, destination, note, when, duration, volume, track) {
  voice(ctx, destination, midi(note), when, duration, volume, 'sine', null, track);
  voice(ctx, destination, midi(note) * 2.01, when, duration * .45, volume * .18, 'sine', null, track);
}
export function scheduleMusicStep(ctx, destination, index, when, track) {
  const step = index % MELODY.length, note = MELODY[step];
  if (note) bell(ctx, destination, note, when, .31, .095, track);
  if (step % 4 === 0) voice(ctx, destination, midi(BASS[Math.floor(step / 8)]), when, .4, .085, 'triangle', null, track);
  if (step % 2 === 1) noise(ctx, destination, when, .035, .011, 4800, track);
}
export function scheduleCue(ctx, destination, name, when = ctx.currentTime, track) {
  const notes = (values, spacing, duration, volume) => values.forEach((n, i) => bell(ctx, destination, n, when + spacing * i, duration, volume, track));
  if (name === 'score') notes([79,84], .07, .17, .16);
  else if (name === 'pop') {
    voice(ctx, destination, 580, when, .075, .11, 'sine', 130, track);
    noise(ctx, destination, when + .012, .045, .08, 2100, track);
  } else if (name === 'hurt') {
    voice(ctx, destination, 255, when, .19, .15, 'triangle', 105, track);
    notes([57,53], .09, .16, .09);
  } else if (name === 'death') {
    noise(ctx, destination, when, .17, .10, 2400, track);
    notes([72,69,65,60], .17, .29, .14);
  } else if (name === 'unlock') {
    notes([72,76,79,84], .095, .32, .16);
    [76,79,84].forEach(n => bell(ctx, destination, n, when + .47, .55, .085, track));
  } else if (name === 'gift') notes([79,84,88,91], .11, .5, .13);
  else if (name === 'start') notes([72,76,79], .08, .21, .12);
  else if (name === 'equip') notes([76,81], .075, .18, .10);
}
export function createBubbleAudio({ contextFactory, storage } = {}) {
  let enabled = true, active = false, playing = false, ctx, master, musicBus, effectsBus, timer, nextStep = 0, step = 0;
  const musicVoices = new Set(), effectVoices = new Set(), lastCue = new Map();
  try { storage ||= globalThis.localStorage; enabled = storage?.getItem(SOUND_KEY) !== 'off'; } catch {}
  const clearNodes = set => { for (const node of set) { try { node.stop(); } catch {} try { node.disconnect(); } catch {} } set.clear(); };
  const track = set => (...nodes) => { const source = nodes[0]; set.add(source); source.addEventListener?.('ended', () => set.delete(source), { once: true }); };
  function prepare() {
    if (ctx) return;
    const Factory = globalThis.AudioContext || globalThis.webkitAudioContext;
    ctx = contextFactory ? contextFactory() : new Factory();
    master = ctx.createGain(); musicBus = ctx.createGain(); effectsBus = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.knee.value = 20; limiter.ratio.value = 5; limiter.attack.value = .003; limiter.release.value = .2;
    master.gain.value = .62; musicBus.gain.value = .6; effectsBus.gain.value = .85;
    musicBus.connect(master); effectsBus.connect(master); master.connect(limiter); limiter.connect(ctx.destination);
  }
  function stopMusic() { clearInterval(timer); timer = null; clearNodes(musicVoices); }
  function pump() {
    if (!active || !enabled || !playing || ctx?.state !== 'running') { stopMusic(); return; }
    if (nextStep < ctx.currentTime) nextStep = ctx.currentTime + .02;
    while (nextStep < ctx.currentTime + .16) { scheduleMusicStep(ctx, musicBus, step++, nextStep, track(musicVoices)); nextStep += MUSIC_STEP; }
  }
  function syncMusic() {
    if (!active || !enabled || !playing || ctx?.state !== 'running') { stopMusic(); return; }
    if (!timer) { nextStep = ctx.currentTime + .02; pump(); timer = setInterval(pump, 50); }
  }
  async function activate() {
    if (!active || !enabled) return;
    prepare(); await ctx.resume(); syncMusic();
  }
  return {
    get enabled() { return enabled; },
    get playing() { return !!(active && enabled && playing && ctx?.state === 'running' && timer); },
    get contextState() { return ctx?.state || 'idle'; },
    open() { active = true; playing = false; },
    async startRound() { playing = true; step = 0; stopMusic(); await activate(); if (active && enabled && playing) scheduleCue(ctx, effectsBus, 'start', ctx.currentTime + .01, track(effectVoices)); },
    setPlaying(value) { playing = value; syncMusic(); },
    async toggle() {
      enabled = !enabled; try { storage?.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch {}
      if (enabled) await activate();
      else { stopMusic(); clearNodes(effectVoices); await ctx?.suspend(); }
      return enabled;
    },
    cue(name) {
      if (!active || !enabled || ctx?.state !== 'running') return;
      const now = ctx.currentTime;
      if (['score','pop','hurt'].includes(name) && now - (lastCue.get(name) ?? -1) < .055) return;
      lastCue.set(name, now); scheduleCue(ctx, effectsBus, name, now + .005, track(effectVoices));
    },
    close() { active = false; playing = false; stopMusic(); clearNodes(effectVoices); lastCue.clear(); void ctx?.suspend().catch(() => {}); },
  };
}
