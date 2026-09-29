// Driving is independent of rendering, so handling and lap validation can be tested.
export const TRACK = { radius: 34, halfWidth: 6, carRadius: 2.15, checkpoints: 12 };
export function wrapAngle(angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
export function steeringLimit(speed) { return .37 / (1 + Math.abs(speed) * .035); }
export function createDriveState() {
  return { x: TRACK.radius, z: 0, heading: Math.PI / 2, speed: 0, steering: 0,
    elapsed: 0, started: false, finished: false, progress: 0, nextCheckpoint: 1,
    collisions: 0, collisionCooldown: 0, lastLap: 0, laps: 0, distance: 0 };
}
export function advanceDrive(state, input, dt) {
  dt = Math.max(0, Math.min(dt, .05));
  if (!dt || state.finished) return state;
  const throttle = input.up ? 1 : 0, brake = input.down ? 1 : 0;
  if (throttle && brake) state.speed *= Math.exp(-8 * dt);
  else if (throttle) state.speed += (state.speed < 0 ? 15 : 8.4) * dt;
  else if (brake) state.speed -= (state.speed > 0 ? 17 : 4) * dt;
  else state.speed *= Math.exp(-.48 * dt);
  state.speed = Math.max(-7, Math.min(27, state.speed));
  if (Math.abs(state.speed) < .035) state.speed = 0;
  const steerInput = Math.max(-1, Math.min(1, input.steer ?? ((input.right ? 1 : 0) - (input.left ? 1 : 0))));
  state.steering += (steerInput * steeringLimit(state.speed) - state.steering) * (1 - Math.exp(-9 * dt));
  state.heading = wrapAngle(state.heading + state.speed / 2.5 * Math.tan(state.steering) * dt);
  const previousAngle = Math.atan2(state.z, state.x);
  const travel = state.speed * dt;
  state.x += Math.cos(state.heading) * travel;
  state.z += Math.sin(state.heading) * travel;
  state.distance += travel;
  state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
  const r = Math.hypot(state.x, state.z);
  const min = TRACK.radius - TRACK.halfWidth + TRACK.carRadius;
  const max = TRACK.radius + TRACK.halfWidth - TRACK.carRadius;
  if (r < min || r > max) {
    const clamped = Math.max(min, Math.min(max, r));
    state.x *= clamped / r; state.z *= clamped / r;
    if (!state.collisionCooldown) { state.speed *= .38; state.collisions++; state.collisionCooldown = .65; }
  }
  if (!state.started && Math.abs(state.speed) > .15) state.started = true;
  if (state.started) state.elapsed += dt;
  // Net angular travel and ordered gates prevent reverse crossings or oscillations
  // around the finish line from creating a lap.
  const deltaAngle = wrapAngle(Math.atan2(state.z, state.x) - previousAngle);
  state.progress = Math.max(0, state.progress + deltaAngle);
  const target = state.nextCheckpoint * Math.PI * 2 / TRACK.checkpoints;
  if (deltaAngle > 0 && state.progress >= target && state.speed > 0) {
    state.nextCheckpoint++;
    if (state.nextCheckpoint > TRACK.checkpoints) {
      state.laps = 1; state.lastLap = state.elapsed; state.finished = true; state.speed = 0;
    }
  }
  return state;
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--.--';
  const centiseconds = Math.floor(seconds * 100);
  return `${String(Math.floor(centiseconds / 6000)).padStart(2, '0')}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}
