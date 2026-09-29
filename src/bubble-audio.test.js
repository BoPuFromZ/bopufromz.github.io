import test from 'node:test';
import assert from 'node:assert/strict';
import { createBubbleAudio, scheduleCue } from './bubble-audio.js';
function fakeContext() {
  const ctx = { state: 'suspended', currentTime: 0, sampleRate: 8000, starts: [], stops: 0, destination: {} };
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), connect() {}, disconnect() {}, addEventListener() {}, start(time) { ctx.starts.push({ time, type: this.type || 'noise', frequency: this.frequency.value }); }, stop() { ctx.stops++; } });
  ctx.createGain = node; ctx.createOscillator = node; ctx.createBufferSource = node; ctx.createBiquadFilter = node;
  ctx.createDynamicsCompressor = () => ({ ...node(), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} });
  ctx.createBuffer = (_, length) => ({ getChannelData: () => new Float32Array(length) });
  ctx.resume = async () => { ctx.state = 'running'; }; ctx.suspend = async () => { ctx.state = 'suspended'; };
  return ctx;
}
test('background music waits for start, stops for pause and mute, resumes, and stops on exit', async () => {
  const ctx = fakeContext(), storage = new Map(), audio = createBubbleAudio({ contextFactory: () => ctx, storage: { getItem: key => storage.get(key), setItem: (key, v) => storage.set(key, v) } });
  try {
    audio.open(); assert.equal(ctx.starts.length, 0); assert.equal(audio.playing, false);
    await audio.startRound(); assert.equal(audio.playing, true); assert.ok(ctx.starts.length > 2);
    audio.setPlaying(false); assert.equal(audio.playing, false);
    const before = ctx.starts.length; audio.cue('unlock'); assert.ok(ctx.starts.length > before);
    audio.setPlaying(true); assert.equal(audio.playing, true);
    await audio.toggle(); assert.equal(audio.enabled, false); assert.equal(audio.playing, false); assert.equal(ctx.state, 'suspended');
    await audio.toggle(); assert.equal(audio.playing, true);
    audio.close(); assert.equal(audio.playing, false); assert.equal(ctx.state, 'suspended');
  } finally { audio.close(); }
});
test('a stored mute preference prevents sound until the user enables it', async () => {
  let prepared = false; const ctx = fakeContext(), audio = createBubbleAudio({ contextFactory: () => { prepared = true; return ctx; }, storage: { getItem: () => 'off', setItem() {} } });
  try { audio.open(); await audio.startRound(); assert.equal(prepared, false); assert.equal(audio.enabled, false); await audio.toggle(); assert.equal(prepared, true); assert.equal(audio.playing, true); }
  finally { audio.close(); }
});
test('collisions, rewards and the three pickups each schedule a distinct cue', () => {
  const cues = ['score','hurt','pop','death','unlock','heal','feast','bomb'];
  const patterns = cues.map(name => { const ctx = fakeContext(); scheduleCue(ctx, ctx.destination, name); assert.ok(ctx.starts.length > 0); return JSON.stringify(ctx.starts); });
  assert.equal(new Set(patterns).size, cues.length);
});
