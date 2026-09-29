import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR, BODY, DEADLIFT_STEPS, createDeadliftState, beginDeadliftStep, advanceDeadlift, sampleDeadliftPose, solveJoint } from './fitness-motion.js';
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test('five deliberate button presses advance exactly one step each', () => {
  const state = createDeadliftState();
  for (let step = 1; step <= 5; step++) {
    assert.equal(beginDeadliftStep(state), true); assert.equal(state.step, step);
    assert.equal(beginDeadliftStep(state), false);
    while (state.running) advanceDeadlift(state, 1 / 60);
    assert.equal(state.completed, step);
  }
  assert.equal(beginDeadliftStep(state), false);
  assert.equal(DEADLIFT_STEPS[3].title, '蹬地发力拉起杠铃');
  assert.deepEqual(createDeadliftState(), { completed: 0, step: 0, elapsed: 0, progress: 0, running: false });
});
test('bar weighs 200 kg and stays on the platform before the pull', () => {
  assert.equal(BAR.shaftWeight + 2 * BAR.platesPerSide.reduce((a, b) => a + b, 0), 200);
  for (let step = 0; step <= 3; step++) for (let t = 0; t <= 1; t += .05) assert.equal(sampleDeadliftPose(step, t).barY, BAR.floorHeight);
});
test('hands follow the same bar coordinates throughout preload, pull and lowering', () => {
  for (let step = 3; step <= 5; step++) for (let i = 0; i <= 20; i++) {
    const pose = sampleDeadliftPose(step, i / 20);
    pose.hands.forEach((hand, side) => assert.deepEqual(hand, [(side ? 1 : -1) * BAR.grip, pose.barY, BAR.z]));
    assert.deepEqual(pose.ankles, [[-.23, .14, -.05], [.23, .14, -.05]]);
    assert.ok(Math.abs(distance(pose.hips, pose.shoulders) - BODY.torso) < 1e-8);
  }
});
test('a continuous pull reaches standing height, and lowering reverses its bar path', () => {
  let previous = BAR.floorHeight;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, up = sampleDeadliftPose(4, t), down = sampleDeadliftPose(5, 1 - t);
    assert.ok(up.barY >= previous - 1e-8); previous = up.barY;
    assert.ok(Math.abs(up.barY - down.barY) < 1e-8);
  }
  assert.ok(previous > .9);
  assert.equal(sampleDeadliftPose(5, 1).barY, BAR.floorHeight);
  assert.deepEqual(sampleDeadliftPose(1, 1).root, [0, 0, 0]);
});
test('all animated arm and leg targets remain reachable with finite joints', () => {
  for (let step = 0; step <= 5; step++) for (let i = 0; i <= 30; i++) {
    const pose = sampleDeadliftPose(step, i / 30);
    for (let side = 0; side < 2; side++) {
      const shoulder = pose.shoulderJoints[side], hand = pose.hands[side];
      assert.ok(distance(shoulder, hand) <= BODY.upperArm + BODY.lowerArm + 1e-5, `Arm reach: step ${step}, frame ${i}`);
      const elbow = solveJoint(shoulder, hand, BODY.upperArm, BODY.lowerArm, [side ? 1 : -1, 0, 1]);
      assert.ok(elbow.every(Number.isFinite));
      const hip = pose.hipJoints[side], ankle = pose.ankles[side];
      assert.ok(distance(hip, ankle) <= BODY.upperLeg + BODY.lowerLeg + 1e-5, `Leg reach: step ${step}, frame ${i}`);
    }
  }
});
