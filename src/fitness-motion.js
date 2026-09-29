export const DEADLIFT_STEPS = [
  { title: '站位', short: '站位', duration: 2.5, detail: '小人走到杠铃前，完成站位。' },
  { title: '屈髋屈膝抓杠铃', short: '抓杠', duration: 2.2, detail: '小人屈髋屈膝，双手抓住杠铃。' },
  { title: '预拉', short: '预拉', duration: 1.4, detail: '小人收紧姿态，做出预拉动作。' },
  { title: '蹬地发力拉起杠铃', short: '拉起', duration: 2.6, detail: '小人蹬地发力，将杠铃拉起并站直。' },
  { title: '放下', short: '放下', duration: 2.4, detail: '小人屈髋屈膝，把杠铃放回硬拉台。' },
];
export const BAR = { floorHeight: .34, z: -.2, grip: .43, shaftWeight: 20, platesPerSide: [20, 20, 20, 20, 10] };
export const BODY = { torso: .6, upperLeg: .461, lowerLeg: .451, upperArm: .357, lowerArm: .357 };
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mixPoint = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
function bodyPose(hipY, hipZ, pitch) {
  const hips = [0, hipY, hipZ];
  return { hips, shoulders: [0, hipY + Math.cos(pitch) * BODY.torso, hipZ - Math.sin(pitch) * BODY.torso], pitch };
}
const standing = () => bodyPose(1.048, .015, 0);
const gripping = () => bodyPose(.72, .42, 1.13);
const preloading = () => bodyPose(.72, .42, 1.048);
const pre = preloading();
const armReach = Math.hypot(.17, pre.shoulders[1] - BAR.floorHeight, pre.shoulders[2] - BAR.z);
function liftPose(progress) {
  const p = clamp(progress), hipY = mix(.72, 1.048, p), hipZ = mix(.42, .015, p);
  const pitch = 1.048 * (1 - smooth((p - .15) / .85));
  const pose = bodyPose(hipY, hipZ, pitch);
  const drop = Math.sqrt(Math.max(0, armReach ** 2 - .17 ** 2 - (pose.shoulders[2] - BAR.z) ** 2));
  return { ...pose, barY: p === 0 ? BAR.floorHeight : Math.max(BAR.floorHeight, pose.shoulders[1] - drop) };
}

export function createDeadliftState() { return { completed: 0, step: 0, elapsed: 0, progress: 0, running: false }; }
export function beginDeadliftStep(state) {
  if (state.running || state.completed >= DEADLIFT_STEPS.length) return false;
  state.step = state.completed + 1; state.elapsed = 0; state.progress = 0; state.running = true; return true;
}
export function advanceDeadlift(state, dt) {
  if (!state.running || !Number.isFinite(dt) || dt <= 0) return false;
  state.elapsed = Math.min(DEADLIFT_STEPS[state.step - 1].duration, state.elapsed + Math.min(dt, .08));
  state.progress = clamp(state.elapsed / DEADLIFT_STEPS[state.step - 1].duration);
  if (state.progress >= 1 - 1e-9) { state.progress = 1; state.completed = state.step; state.running = false; return true; }
  return false;
}

// Joint positions are calculated from the same bar position used by the scene.
// Feet remain planted from grabbing through the final lowering phase.
export function sampleDeadliftPose(step = 0, progress = 0) {
  const p = smooth(progress);
  let pose = standing(), root = [-2.65, 0, .95], yaw = -1.1, barY = BAR.floorHeight, grippingBar = false;
  const ankles = [[-.23, .14, -.05], [.23, .14, -.05]];
  let hands = [[-.35, 1.025, .08], [.35, 1.025, .08]];
  if (step === 1) {
    root = mixPoint([-2.65, 0, .95], [0, 0, 0], p); yaw = mix(-1.1, 0, smooth((progress - .7) / .3));
    const fade = Math.sin(Math.PI * clamp(progress)), gait = Math.sin(clamp(progress) * Math.PI * 6);
    pose = bodyPose(1.048 - .026 * fade + gait * gait * .006 * fade, .015, .055 * fade);
    for (let i = 0; i < 2; i++) {
      const stride = gait * (i ? -1 : 1); ankles[i][1] += Math.max(0, stride) * .10 * fade; ankles[i][2] += stride * .14 * fade;
      hands[i][2] += stride * .18 * fade; hands[i][1] += .025 * fade;
    }
  } else if (step >= 2) {
    root = [0, 0, 0]; yaw = 0;
    if (step === 2) {
      pose = bodyPose(mix(1.048, .72, p), mix(.015, .42, p), mix(0, 1.13, p));
      hands = [-1, 1].map(sign => {
        const x = sign * mix(.35, BAR.grip, p), z = mix(.08, BAR.z, smooth((p - .15) / .85));
        const drop = Math.sqrt(Math.max(0, .703 ** 2 - (Math.abs(x) - .26) ** 2 - (z - pose.shoulders[2]) ** 2)) * mix(.90, 1, p);
        return [x, Math.max(BAR.floorHeight, pose.shoulders[1] - drop), z];
      });
      if (p === 1) { hands = [-1, 1].map(sign => [sign * BAR.grip, BAR.floorHeight, BAR.z]); grippingBar = true; }
    } else {
      grippingBar = true;
      if (step === 3) pose = bodyPose(.72, .42, mix(1.13, 1.048, p));
      else { pose = liftPose(step === 4 ? p : 1 - p); barY = pose.barY; }
      hands = [-1, 1].map(sign => [sign * BAR.grip, barY, BAR.z]);
    }
  }
  const shoulderJoints = [-1, 1].map(sign => [sign * .26, pose.shoulders[1], pose.shoulders[2]]);
  const hipJoints = [-1, 1].map(sign => [sign * .22, pose.hips[1], pose.hips[2]]);
  return { ...pose, root, yaw, barY, hands, ankles, shoulderJoints, hipJoints, grippingBar };
}

// Analytic two-bone joints keep elbows and knees articulated without stretching.
export function solveJoint(start, end, upper, lower, bendHint) {
  const delta = end.map((v, i) => v - start[i]), actual = Math.hypot(...delta);
  const distance = Math.max(1e-7, Math.min(upper + lower - 1e-7, actual));
  const axis = delta.map(v => v / Math.max(actual, 1e-7));
  const projected = bendHint.reduce((sum, v, i) => sum + v * axis[i], 0);
  let bend = bendHint.map((v, i) => v - projected * axis[i]), length = Math.hypot(...bend);
  if (length < 1e-6) { bend = [axis[1], -axis[0], 0]; length = Math.hypot(...bend) || 1; }
  bend = bend.map(v => v / length);
  const along = (upper ** 2 - lower ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
  return start.map((v, i) => v + axis[i] * along + bend[i] * height);
}
