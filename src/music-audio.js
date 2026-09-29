// One media element and one analyser for the lifetime of the page.
// Created on entry, before importing the larger scene, to retain click activation.
export function createMusicAudio() {
  const media = new Audio(new URL(`${import.meta.env.BASE_URL}audio/piaoyi.m4a`, document.baseURI).href);
  media.preload = 'metadata'; media.volume = .7;
  let context, analyser, frequency = new Uint8Array(512), waveform = new Uint8Array(1024);
  let active = false, requested = false, message = '', seeking = false;
  const listeners = new Set();
  function notify() { for (const listener of listeners) listener(); }
  function prepare() {
    if (context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext(); analyser = context.createAnalyser();
    analyser.fftSize = 1024; analyser.smoothingTimeConstant = .78;
    context.createMediaElementSource(media).connect(analyser); analyser.connect(context.destination);
  }
  async function play() {
    if (!active) return;
    requested = true; message = ''; notify();
    try {
      prepare();
      // Start both from the user gesture; awaiting resume first can lose activation.
      const resumed = context?.resume(); const played = media.play();
      await Promise.all([resumed, played]);
      if (!active || !requested) media.pause();
    } catch (error) {
      requested = false;
      message = error.name === 'NotAllowedError' ? '点击播放，打开今晚的声音。' : '音频暂时无法播放，请点击重试。';
      notify();
    }
  }
  function pause() { requested = false; media.pause(); notify(); }
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'waiting', 'playing', 'volumechange', 'seeked']) media.addEventListener(event, notify);
  media.addEventListener('error', () => { message = '音频加载失败，请刷新页面后重试。'; requested = false; notify(); });
  media.addEventListener('ended', () => { requested = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) pause(); });
  return {
    media,
    open() { active = true; void play(); },
    close() { active = false; pause(); void context?.suspend(); },
    toggle() { if (media.paused) void play(); else pause(); },
    pause,
    seek(value) { if (Number.isFinite(media.duration)) media.currentTime = Math.max(0, Math.min(value, media.duration)); },
    setVolume(value) { media.volume = Math.max(0, Math.min(1, value)); },
    setSeeking(value) { seeking = value; },
    get seeking() { return seeking; },
    get message() { return message; },
    get playing() { return !media.paused && !media.ended; },
    get loading() { return requested && media.readyState < 3; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    sample() {
      if (analyser && !media.paused && context.state === 'running') {
        analyser.getByteFrequencyData(frequency); analyser.getByteTimeDomainData(waveform);
      } else { frequency.fill(0); waveform.fill(128); }
      let bass = 0, energy = 0;
      for (let i = 2; i < 32; i++) bass += frequency[i];
      for (let i = 0; i < frequency.length; i++) energy += frequency[i];
      return { frequency, waveform, bass: bass / (30 * 255), energy: energy / (frequency.length * 255), playing: !media.paused };
    },
  };
}
