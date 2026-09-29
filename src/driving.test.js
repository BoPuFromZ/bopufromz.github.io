import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACK, createDriveState, advanceDrive, steeringLimit, wrapAngle, formatTime } from './driving.js';
import { sanitizeConfig } from './car-options.js';

function run(state, input, seconds) { for (let t = 0; t < seconds; t += 1 / 120) advanceDrive(state, input, 1 / 120); return state; }
test('throttle, braking, reverse and steering respond to controls', () => {
  const state = run(createDriveState(), { up: true }, .8);
  assert.ok(state.speed > 5);
  const heading = state.heading;
  run(state, { up: true, left: true }, .2);
  assert.ok(wrapAngle(state.heading - heading) < 0);
  run(state, { down: true }, 1.5);
  assert.ok(state.speed < 0);
});
test('guardrails keep the car on the road and slow impacts', () => {
  const state = createDriveState(); state.heading = 0;
  run(state, { up: true }, 5);
  assert.ok(Math.hypot(state.x, state.z) <= TRACK.radius + TRACK.halfWidth - TRACK.carRadius + 1e-8);
  assert.ok(state.collisions > 0);
  assert.ok(state.speed < 15);
  const inner = createDriveState(); inner.heading = Math.PI;
  run(inner, { up: true }, 5);
  assert.ok(Math.hypot(inner.x, inner.z) >= TRACK.radius - TRACK.halfWidth + TRACK.carRadius - 1e-8);
});
test('a driven full circuit passes ordered checkpoints and records a lap', () => {
  const state = createDriveState();
  for (let t = 0; t < 35 && !state.finished; t += 1 / 120) {
    const theta = Math.atan2(state.z, state.x), radius = Math.hypot(state.x, state.z);
    const desiredHeading = theta + Math.PI / 2 + (radius - TRACK.radius) * .08;
    const desiredSteer = Math.atan(2.5 / TRACK.radius) + wrapAngle(desiredHeading - state.heading) * .6;
    advanceDrive(state, { up: true, steer: desiredSteer / steeringLimit(state.speed) }, 1 / 120);
  }
  assert.equal(state.finished, true); assert.equal(state.laps, 1);
  assert.equal(state.nextCheckpoint, 13); assert.ok(state.lastLap > 8);
  assert.equal(state.speed, 0); assert.equal(state.collisions, 0);
});
test('reverse laps and finish-line wiggles cannot create a completed lap', () => {
  const reverse = createDriveState(); reverse.heading = -Math.PI / 2;
  run(reverse, { up: true, left: true }, 10);
  assert.equal(reverse.finished, false);
  const wiggle = createDriveState();
  for (let i = 0; i < 30; i++) { run(wiggle, { up: true }, .12); run(wiggle, { down: true }, .25); }
  assert.equal(wiggle.laps, 0);
});
test('reset, simultaneous pedal input and invalid stored configuration are safe', () => {
  const state = createDriveState(); state.speed = 12;
  run(state, { up: true, down: true }, .4); assert.ok(state.speed < 1);
  assert.deepEqual(sanitizeConfig({ body: 'wrong', wheels: {}, lights: null }), { body: 'amber', wheels: 'classic', lights: 'warm' });
  assert.equal(createDriveState().elapsed, 0);
  assert.equal(formatTime(72.345), '01:12.34');
});
