const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Detect percussive attacks against a changing local baseline, rather than
// driving the performer from a wall-clock sine wave or average loudness.
export function createRhythmTracker() {
  let previous = new Float32Array(64), previousTime = -1;
  let average = .025, deviation = .015, lastBeat = -10, period = .5, count = 0, strength = 0;
  function reset(time = -1) {
    previous.fill(0); previousTime = time; average = .025; deviation = .015;
    lastBeat = -10; period = .5; count = 0; strength = 0;
  }
  return {
    reset,
    sample({ frequency, rms, time, playing, sampleRate = 44100, fftSize = 1024 }) {
      if (!playing || !Number.isFinite(time)) {
        reset(); return { hit: false, pulse: 0, age: 10, phase: 0, count: 0, strength: 0, drive: 0, period };
      }
      const discontinuity = previousTime < 0 || time < previousTime || time - previousTime > 1.5;
      if (discontinuity) reset(time);
      const dt = clamp(time - previousTime, 0, .1); previousTime = time;
      let flux = 0, bass = 0, totalWeight = 0;
      const maxBin = Math.min(previous.length, frequency.length);
      for (let i = 1; i < maxBin; i++) {
        const hz = i * sampleRate / fftSize, value = frequency[i] / 255;
        const weight = hz < 250 ? 2.8 : hz < 1100 ? 1 : .25;
        flux += Math.max(0, value - previous[i]) * weight; totalWeight += weight;
        if (hz > 40 && hz < 240) bass += value;
        previous[i] = value;
      }
      flux /= totalWeight || 1;
      const threshold = Math.max(.014, average + deviation * 1.35);
      const hit = !discontinuity && rms > .008 && flux > threshold && time - lastBeat > .23;
      if (hit) {
        const gap = time - lastBeat;
        if (gap < 1.6) {
          const candidates = [gap, gap * 2, gap / 2].filter(value => value >= .36 && value <= .75);
          candidates.sort((a, b) => Math.abs(a - period) - Math.abs(b - period));
          if (candidates.length) period += (candidates[0] - period) * .2;
        }
        lastBeat = time; count++; strength = clamp(.5 + (flux - threshold) * 7, .5, 1);
      }
      const adaptation = 1 - Math.exp(-dt / .8);
      deviation += (Math.abs(flux - average) - deviation) * adaptation;
      average += (flux - average) * adaptation;
      const age = Math.max(0, time - lastBeat);
      // Fade choreography during quiet breaks; no invented beats in silence.
      const drive = rms > .006 && age < 1.5 ? clamp(rms * 12 + bass / 12, 0, 1) * Math.exp(-Math.max(0, age - .65) * 2) : 0;
      return { hit, pulse: Math.exp(-age / .12) * strength, age, phase: age / period % 1, count, strength, drive, period };
    },
  };
}

export function getDjPose(groove, enabled = true) {
  const { age = 10, count = 0, strength = 0, phase = 0, drive = 0, pulse = 0 } = groove || {};
  const amount = enabled ? drive : 0, side = count % 2 ? -1 : 1;
  const jumpPhase = clamp((age - .035) / .36, 0, 1);
  const jump = Math.sin(jumpPhase * Math.PI) ** 2 * strength * amount;
  const swing = Math.sin(phase * Math.PI) * side * amount;
  const scratch = Math.sin(phase * Math.PI * 4) * amount;
  // Four-beat phrases alternate deck work, headphone listening and crowd cues.
  const mode = Math.floor(count / 4) % 5;
  return {
    mode, jump,
    hipY: .83 + jump * .36 - pulse * amount * .11,
    hipX: swing * .14,
    lean: swing * .2, twist: swing * .28,
    forward: -.05 - pulse * amount * .18,
    nod: pulse * amount * .62 - jump * .2,
    headTilt: swing * .17, headTurn: swing * .18,
    shoulderPop: pulse * amount * .12,
    scratch: scratch * .16,
    hype: mode === 4 ? amount * (.65 + .35 * Math.sin(phase * Math.PI)) : 0,
    headphone: mode === 2 || mode === 3 ? amount : 0,
    fader: Math.sin(phase * Math.PI * 2) * amount * .12,
    recordLeft: mode === 0 || mode === 2 || mode === 4,
    active: amount,
  };
}
