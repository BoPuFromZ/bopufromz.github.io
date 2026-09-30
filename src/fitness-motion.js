export const DEADLIFT_STEPS = [
  { title: '站位', short: '站位', duration: 1.15, detail: '利落迈步，双脚在杠铃前站稳。' },
  { title: '屈髋屈膝抓杠铃', short: '抓杠', duration: .72, detail: '快速下沉，屈髋屈膝，握紧杠铃。' },
  { title: '预拉', short: '预拉', duration: .38, detail: '收紧背部，建立张力，准备发力。' },
  { title: '蹬地发力拉起杠铃', short: '拉起', duration: .82, detail: '蹬地启动，一气呵成拉起，站直锁定。' },
  { title: '放下', short: '放下', duration: .72, detail: '干净回落，控制杠铃落到硬拉台。' },
];
export const BAR = { floorHeight: .34, z: -.2, grip: .43, shaftWeight: 20, platesPerSide: [20, 20, 20, 20, 10] };
export const BODY = { torso: .64, upperLeg: .49, lowerLeg: .49, upperArm: .305, lowerArm: .313, shoulderWidth: .225, shoulderDrop: .10, hipWidth: .135, gripRise: .112, gripBack: .027 };
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
// Brief tension build-up, a fast drive, then a firm stop without a bar overshoot.
export function powerProgress(value) {
  const t = clamp(value), points = [[0, 0, 0], [.10, .025, .55], [.72, .94, .45], [1, 1, 0]];
  for (let i = 1; i < points.length; i++) if (t <= points[i][0]) {
    const [ta, a, ma] = points[i - 1], [tb, b, mb] = points[i], length = tb - ta, u = (t - ta) / length;
    return (2 * u ** 3 - 3 * u ** 2 + 1) * a + (u ** 3 - 2 * u ** 2 + u) * length * ma + (-2 * u ** 3 + 3 * u ** 2) * b + (u ** 3 - u ** 2) * length * mb;
  }
  return 1;
}
const mix = (a, b, t) => a + (b - a) * t;
const mixPoint = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
function bodyPose(hipY, hipZ, pitch) {
  const hips = [0, hipY, hipZ];
  return { hips, shoulders: [0, hipY + Math.cos(pitch) * BODY.torso, hipZ - Math.sin(pitch) * BODY.torso], pitch };
}
const standing = () => bodyPose(1.048, .015, 0);
const preloading = () => bodyPose(.72, .42, 1.08);
const pre = preloading();
function armOrigin(pose) { return [0, pose.shoulders[1] - Math.cos(pose.pitch) * BODY.shoulderDrop, pose.shoulders[2] + Math.sin(pose.pitch) * BODY.shoulderDrop]; }
const preArm = armOrigin(pre);
const armReach = Math.hypot(BAR.grip - BODY.shoulderWidth, preArm[1] - BAR.floorHeight - BODY.gripRise, preArm[2] - BAR.z - BODY.gripBack);
function liftPose(progress) {
  const p = clamp(progress), hipY = mix(.72, 1.048, p), hipZ = mix(.42, .015, p);
  const pitch = 1.08 * (1 - smooth((p - .15) / .85));
  const pose = bodyPose(hipY, hipZ, pitch);
  const shoulder = armOrigin(pose);
  const drop = Math.sqrt(Math.max(0, armReach ** 2 - (BAR.grip - BODY.shoulderWidth) ** 2 - (shoulder[2] - BAR.z - BODY.gripBack) ** 2));
  return { ...pose, barY: p === 0 ? BAR.floorHeight : Math.max(BAR.floorHeight, shoulder[1] - drop - BODY.gripRise) };
}

export function createDeadliftState() { return { completed: 0, step: 0, elapsed: 0, progress: 0, running: false }; }
export function beginDeadliftStep(state) {
  if (state.running || state.completed >= DEADLIFT_STEPS.length) return false;
  state.step = state.completed + 1; state.elapsed = 0; state.progress = 0; state.running = true; return true;
}
export function advanceDeadlift(state, dt) {
  if (!state.running || !Number.isFinite(dt) || dt <= 0) return false;
  state.elapsed = Math.min(DEADLIFT_STEPS[state.step - 1].duration, state.elapsed + dt);
  state.progress = clamp(state.elapsed / DEADLIFT_STEPS[state.step - 1].duration);
  if (state.progress >= 1 - 1e-9) { state.progress = 1; state.completed = state.step; state.running = false; return true; }
  return false;
}

// Joint positions are calculated from the same bar position used by the scene.
// Feet remain planted from grabbing through the final lowering phase.
export function sampleDeadliftPose(step = 0, progress = 0) {
  const p = step >= 4 ? powerProgress(progress) : smooth(progress);
  let pose = standing(), root = [-2.65, 0, .95], yaw = -1.1, barY = BAR.floorHeight, grippingBar = false;
  const ankles = [[-.23, .085, -.05], [.23, .085, -.05]];
  let hands = [[-.35, 1.05, .08], [.35, 1.05, .08]], wristOffset = 0;
  if (step === 1) {
    root = mixPoint([-2.65, 0, .95], [0, 0, 0], p); yaw = mix(-1.1, 0, smooth((progress - .7) / .3));
    const fade = Math.sin(Math.PI * clamp(progress)), gait = Math.sin(clamp(progress) * Math.PI * 4);
    pose = bodyPose(1.048 - .058 * fade + gait * gait * .008 * fade, .015, .055 * fade);
    for (let i = 0; i < 2; i++) {
      const stride = gait * (i ? -1 : 1); ankles[i][1] += Math.max(0, stride) * .12 * fade; ankles[i][2] += stride * .23 * fade;
      hands[i][2] += stride * .18 * fade; hands[i][1] += .025 * fade;
    }
  } else if (step >= 2) {
    root = [0, 0, 0]; yaw = 0;
    if (step === 2) {
      pose = bodyPose(mix(1.048, .72, p), mix(.015, .42, p), mix(0, 1.16, p)); wristOffset = p;
      hands = [-1, 1].map(sign => {
        const x = sign * mix(.35, BAR.grip, p), z = mix(.08, BAR.z, smooth((p - .15) / .85));
        const shoulder = armOrigin(pose), drop = Math.sqrt(Math.max(0, .612 ** 2 - (Math.abs(x) - BODY.shoulderWidth) ** 2 - (z + BODY.gripBack * p - shoulder[2]) ** 2)) * mix(.90, 1, p);
        return [x, Math.max(BAR.floorHeight, shoulder[1] - drop - BODY.gripRise * p), z];
      });
      if (p === 1) { hands = [-1, 1].map(sign => [sign * BAR.grip, BAR.floorHeight, BAR.z]); grippingBar = true; }
    } else {
      grippingBar = true; wristOffset = 1;
      if (step === 3) pose = bodyPose(.72, .42, mix(1.16, 1.08, p));
      else { pose = liftPose(step === 4 ? p : 1 - p); barY = pose.barY; }
      hands = [-1, 1].map(sign => [sign * BAR.grip, barY, BAR.z]);
    }
  }
  const armStart = armOrigin(pose);
  const shoulderJoints = [-1, 1].map(sign => [sign * BODY.shoulderWidth, armStart[1], armStart[2]]);
  const hipJoints = [-1, 1].map(sign => [sign * BODY.hipWidth, pose.hips[1], pose.hips[2]]);
  const wristJoints = hands.map(hand => [hand[0], hand[1] + BODY.gripRise * wristOffset, hand[2] + BODY.gripBack * wristOffset]);
  return { ...pose, root, yaw, barY, hands, ankles, shoulderJoints, hipJoints, wristJoints, grippingBar, gripAmount: step >= 3 ? 1 : step === 2 ? smooth((progress - .55) / .45) : 0 };
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

