import test from 'node:test';
import assert from 'node:assert/strict';
import { createRhythmTracker, getDjPose } from './music-rhythm.js';
import { createDj } from './music-dj.js';

function drums(tracker, duration = 10, interval = .5) {
  const beats = [];
  for (let frame = 0; frame < duration * 60; frame++) {
    const time = frame / 60, bins = new Uint8Array(512), offset = time % interval;
    for (let i = 1; i < 64; i++) bins[i] = 20 + (offset < .06 ? i < 12 ? 190 : 90 : 0);
    const groove = tracker.sample({ frequency: bins, rms: .16, time, playing: true });
    if (groove.hit) beats.push({ time, groove });
  }
  return beats;
}

test('percussion attacks drive beats at the audio tempo', () => {
  const beats = drums(createRhythmTracker());
  assert.ok(beats.length >= 17 && beats.length <= 20, `Unexpected beat count: ${beats.length}`);
  for (const beat of beats) assert.ok(Math.min(beat.time % .5, .5 - beat.time % .5) < .035);
  assert.ok(Math.abs(beats.at(-1).groove.period - .5) < .03);
});

test('steady audio, silence, pause and seek do not invent percussion', () => {
  const tracker = createRhythmTracker(), frequency = new Uint8Array(512).fill(200);
  for (let frame = 0; frame < 180; frame++) assert.equal(tracker.sample({ frequency, rms: .16, time: frame / 60, playing: true }).hit, false);
  const paused = tracker.sample({ frequency, rms: .16, time: 3, playing: false });
  assert.equal(paused.drive, 0); assert.equal(paused.pulse, 0);
  assert.equal(tracker.sample({ frequency, rms: .16, time: 90, playing: true }).hit, false);
  const silent = tracker.sample({ frequency: new Uint8Array(512), rms: 0, time: 90.1, playing: true });
  assert.equal(silent.drive, 0); assert.equal(silent.hit, false);
});

test('a heavy beat produces a visible jump and alternating phrase gestures', () => {
  const beat = { age: .21, count: 4, strength: 1, phase: .42, drive: 1, pulse: .2 };
  const pose = getDjPose(beat);
  assert.ok(pose.hipY > 1); assert.ok(Math.abs(pose.twist) > .15);
  assert.notEqual(getDjPose({ ...beat, count: 0 }).recordLeft, pose.recordLeft);
  assert.ok(getDjPose({ ...beat, count: 16 }).hype > .8);
  assert.equal(getDjPose(beat, false).hipY, .83);
});

test('jointed hands stay above the deck while the DJ jumps and leans', () => {
  const dj = createDj();
  for (let frame = 0; frame < 120; frame++) dj.update({ age: .2, count: 4, strength: 1, phase: .4, drive: 1, pulse: .2 }, 1 / 60);
  const recordHand = dj.group.getObjectByName('dj-hand-right');
  assert.ok(Math.abs(recordHand.position.x - 1.09) < .08);
  assert.ok(Math.abs(recordHand.position.y - 1.115) < .08);
  assert.ok(recordHand.position.z > .75 && recordHand.position.z < 1.15);
  for (let frame = 0; frame < 120; frame++) dj.update({ age: .2, count: 16, strength: 1, phase: .4, drive: 1, pulse: .2 }, 1 / 60);
  assert.ok(dj.group.getObjectByName('dj-hand-right').position.y > 2.5);
  for (let frame = 0; frame < 120; frame++) dj.update(null, 1 / 60, false);
  assert.ok(Math.abs(dj.group.getObjectByName('dj-torso').position.y - .83) < .001);
  assert.ok(Math.abs(dj.group.getObjectByName('dj-head').rotation.x) < .001);
});
