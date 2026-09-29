import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createMusicWorld({ mount, audio, onError }) {
  const mobile = matchMedia('(max-width:800px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '三维音乐舞台。DJ 正在打碟，顶部射灯扫动，右侧屏幕显示歌曲实时频谱。拖动环绕，双指或滚轮缩放。');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0c0d19');
  scene.fog = new THREE.FogExp2('#0c0d19', .025);
  const camera = new THREE.PerspectiveCamera(mobile ? 47 : 40, 1, .1, 90);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 7; controls.maxDistance = 23;
  controls.minPolarAngle = .7; controls.maxPolarAngle = 1.48;
  controls.minAzimuthAngle = -.75; controls.maxAzimuthAngle = .9;
  let active = false, dirty = true, disposed = false, frame = 0, clock = 0, last = 0, view = 0;
  let moving = !matchMedia('(prefers-reduced-motion:reduce)').matches;
  let palette = 0, level = 0;
  const palettes = [['#ac76ff', '#58ddff', '#d4ee8c'], ['#ff895d', '#f452a7', '#ffd984'], ['#64edb2', '#5aacff', '#d4ee8c']];
  const matte = (color, metalness = .1) => new THREE.MeshStandardMaterial({ color, roughness: .6, metalness });
  const dark = matte('#1a1c2d'), black = matte('#090b13'), metal = matte('#5b6275', .8);
  const violet = matte('#725091'), mint = matte('#d4ee8c');
  const glow = color => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  function mesh(geometry, material, x, y, z, parent = scene) {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); parent.add(object); return object;
  }
  const box = (w, h, d, material, x, y, z, parent = scene) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  function rod(a, b, radius, material, parent = scene) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const object = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), material, 0, 0, 0, parent);
    object.position.copy(start.add(end).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return object;
  }
  function label(text, subtitle, w, h, x, y, z) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#111423'; ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#d4ee8c'; ctx.font = 'bold 112px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 512, 140);
    ctx.fillStyle = '#8992b0'; ctx.font = '23px monospace'; ctx.fillText(subtitle, 512, 204);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }), x, y, z);
  }
  // An open-front club room, with a raised stage and a separate visual screen.
  box(19, .22, 15, matte('#151827'), 0, -.13, -1);
  box(18, 7, .24, matte('#191b31'), 0, 3.4, -6);
  box(.24, 7, 11, matte('#121729'), -8.3, 3.4, -.6);
  for (let x = -8; x <= 8; x += .8) box(.12, 6.5, .18, dark, x, 3.2, -5.8);
  box(12.6, .5, 5.4, dark, 0, .23, -1.65);
  box(12.7, .04, .04, glow('#ac76ff'), 0, .5, 1.06);
  box(3.8, .23, .55, metal, 0, .1, 1.5);
  label('AFTERHOURS', 'SOUND ROOM 02 / FIND THE FREQUENCY', 7, 1.75, -1, 4.9, -5.66);
  const strips = [];
  for (const x of [-7.9, 7.9]) strips.push(box(.05, 5.6, .05, glow('#ac76ff'), x, 2.9, -5.6).material);
  for (let x = -7; x <= 7; x += 2) {
    rod([x, 6.6, -4.7], [x, 6.6, .5], .05, metal);
    rod([x, 6.6, -4.7], [x + 1, 6.6, .5], .023, metal);
  }
  for (const z of [-4.7, .5]) rod([-7, 6.6, z], [7, 6.6, z], .09, metal);
  // PA stacks with drivers and subtle light rings.
  for (const x of [-5.2, 5.8]) {
    box(1.3, 2.65, 1.1, black, x, 1.86, -.8);
    for (const y of [1.16, 2.15]) {
      const driver = mesh(new THREE.CylinderGeometry(.43, .43, .05, 32), dark, x, y, -.22); driver.rotation.x = Math.PI / 2;
      const ring = mesh(new THREE.TorusGeometry(.44, .018, 8, 40), glow('#ac76ff'), x, y, -.18); strips.push(ring.material);
      mesh(new THREE.SphereGeometry(.16, 16, 10), black, x, y, -.18).scale.z = .25;
    }
    box(.65, .12, .04, metal, x, 2.88, -.22);
  }
  // The original geometric DJ, assembled locally rather than using an artist avatar.
  const dj = new THREE.Group(); dj.position.set(-1.25, .5, -2.45); scene.add(dj);
  const skin = matte('#dfa37e'), clothing = matte('#586176'), hair = matte('#191c27');
  for (const x of [-.23, .23]) { box(.28, .8, .32, black, x, .45, 0, dj); box(.34, .18, .55, mint, x, .13, .13, dj); }
  const torso = new THREE.Group(); torso.position.y = .83; dj.add(torso);
  const body = mesh(new THREE.CylinderGeometry(.42, .34, .95, 12), clothing, 0, .42, 0, torso); body.scale.z = .7;
  box(.23, .19, .04, glow('#d4ee8c'), 0, .54, .3, torso);
  const head = new THREE.Group(); head.position.y = 1.24; torso.add(head);
  mesh(new THREE.SphereGeometry(.34, 24, 16), skin, 0, 0, 0, head);
  const cap = mesh(new THREE.SphereGeometry(.355, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, .04, 0, head); cap.rotation.z = -.08;
  box(.5, .045, .35, hair, .05, .14, .3, head);
  for (const x of [-.35, .35]) box(.13, .32, .25, black, x, .01, 0, head);
  const band = mesh(new THREE.TorusGeometry(.36, .05, 8, 24, Math.PI), metal, 0, .03, 0, head); band.rotation.z = 0;
  for (const x of [-.12, .12]) mesh(new THREE.SphereGeometry(.026, 8, 8), black, x, -.02, .315, head);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .37, .79, 0); torso.add(arm);
    rod([0, 0, 0], [side * .2, -.4, .24], .13, clothing, arm);
    rod([side * .2, -.4, .24], [side * .28, -.42, .73], .09, skin, arm);
    mesh(new THREE.SphereGeometry(.12, 12, 8), skin, side * .28, -.42, .76, arm); arms.push(arm);
  }
  // Turntables and a mixer at the hands, facing the visitor.
  box(3.65, .86, 1.25, dark, -1.25, .96, -1.5);
  box(3.82, .11, 1.38, metal, -1.25, 1.44, -1.5);
  box(3.65, .31, .03, black, -1.25, 1.17, -.86);
  label('AH / SELECTOR', 'KEEP THE RECORD SPINNING', 2.5, .37, -1.25, 1.17, -.833);
  const records = [];
  for (const x of [-2.34, -.16]) {
    const record = new THREE.Group(); record.position.set(x, 1.54, -1.5); scene.add(record); records.push(record);
    mesh(new THREE.CylinderGeometry(.43, .43, .05, 40), black, 0, 0, 0, record);
    mesh(new THREE.CylinderGeometry(.15, .15, .056, 24), glow('#d4ee8c'), 0, .005, 0, record);
    for (const r of [.24, .32, .38]) { const groove = mesh(new THREE.TorusGeometry(r, .003, 4, 40), metal, 0, .03, 0, record); groove.rotation.x = Math.PI / 2; }
    box(.04, .01, .25, mint, 0, .035, .24, record);
    rod([x + .4, 1.62, -1.93], [x + .19, 1.6, -1.36], .025, metal);
  }
  box(.62, .1, .95, black, -1.25, 1.57, -1.5);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) mesh(new THREE.CylinderGeometry(.035, .035, .06, 10), metal, -1.44 + i * .19, 1.65, -1.83 + j * .18);
  for (let i = 0; i < 4; i++) { box(.018, .01, .2, metal, -1.49 + i * .16, 1.635, -1.22); box(.09, .025, .04, mint, -1.49 + i * .16, 1.65, -1.2); }
  // CanvasTexture is updated from decoded audio, with no fabricated audio data.
  const visual = document.createElement('canvas'); visual.width = 768; visual.height = 512;
  const ctx = visual.getContext('2d'), texture = new THREE.CanvasTexture(visual); texture.colorSpace = THREE.SRGBColorSpace;
  box(4.45, 3.05, .22, metal, 3.15, 2.77, -3.8);
  mesh(new THREE.PlaneGeometry(4.24, 2.83), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), 3.15, 2.77, -3.675);
  for (const x of [1.7, 4.6]) box(.1, 1.5, .15, metal, x, 1.03, -3.8);
  label('LIVE SIGNAL', 'JAY CHOU / PIAO YI', 3.25, .43, 3.15, 4.56, -3.7);
  scene.add(new THREE.HemisphereLight('#afbbff', '#262540', 2.1));
  const key = new THREE.DirectionalLight('#ffe2ce', 3.3); key.position.set(-3, 7, 7); scene.add(key);
  const fill = new THREE.PointLight('#9864ff', 32, 12, 2); fill.position.set(-3, 4, -3); scene.add(fill);
  // Each visible beam tapers from its own overhead fixture to a moving floor pool.
  const beams = [], beamGeometry = new THREE.ConeGeometry(1, 1, 32, 1, true);
  beamGeometry.translate(0, -.5, 0); // tip at the origin; the cone extends down local Y
  const colorAttribute = [];
  const position = beamGeometry.attributes.position;
  for (let i = 0; i < position.count; i++) { const fade = .25 + .75 * (position.getY(i) + 1); colorAttribute.push(fade, fade, fade); }
  beamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorAttribute, 3));
  const down = new THREE.Vector3(0, -1, 0), target = new THREE.Vector3();
  for (let i = 0; i < 10; i++) {
    const x = -6 + (i % 5) * 3, z = i < 5 ? -4.6 : .4;
    const fixture = mesh(new THREE.CylinderGeometry(.17, .21, .38, 12), black, x, 6.25, z);
    const material = new THREE.MeshBasicMaterial({ color: palettes[0][i % 3], transparent: true, opacity: .075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, vertexColors: true, toneMapped: false });
    const cone = mesh(beamGeometry, material, x, 6.08, z); cone.renderOrder = 2;
    const pool = mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: palettes[0][i % 3], transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 0, .012, 0);
    pool.rotation.x = -Math.PI / 2;
    // Four physical spot lights complement all ten volumetric beams.
    let light;
    if (i < 4) { light = new THREE.SpotLight(palettes[0][i % 3], 60, 18, .2, .8, 1.5); light.position.copy(cone.position); scene.add(light, light.target); }
    beams.push({ cone, pool, fixture, light, phase: i * 1.73 });
  }
  // Quiet particles give depth without flashing or strobing.
  const particles = new Float32Array(240);
  for (let i = 0; i < particles.length; i += 3) { particles[i] = Math.sin(i * 3.31) * 8; particles[i + 1] = .8 + ((i * .371) % 5); particles[i + 2] = Math.cos(i * 1.73) * 5; }
  const particleGeometry = new THREE.BufferGeometry(); particleGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
  scene.add(new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#b9abd3', size: .025, transparent: true, opacity: .45, depthWrite: false })));

  function resetCamera() {
    controls.target.set(.1, 2.7, -1.5);
    if (view === 1) { camera.position.set(-.6, 4.1, 9.7); controls.target.set(-1, 1.9, -1.5); }
    else if (view === 2) { camera.position.set(6, 4.4, 10); controls.target.set(2.7, 2.9, -3.3); }
    else camera.position.set(mobile ? 9.3 : 10.7, mobile ? 9 : 8.8, mobile ? 18.5 : 17.7);
    controls.update(); dirty = true;
  }
  function resize() {
    const width = mount.clientWidth, height = mount.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); dirty = true;
  }
  const observer = new ResizeObserver(resize); observer.observe(mount);
  controls.addEventListener('change', () => { dirty = true; });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); onError(); });
  function drawScreen(signal) {
    const colors = palettes[palette];
    ctx.fillStyle = '#090c18'; ctx.fillRect(0, 0, 768, 512);
    ctx.strokeStyle = '#273047'; ctx.lineWidth = 1;
    for (let x = 32; x < 768; x += 44) { ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, 450); ctx.stroke(); }
    for (let y = 80; y < 450; y += 44) { ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(736, y); ctx.stroke(); }
    ctx.font = '20px monospace'; ctx.fillStyle = colors[2]; ctx.fillText('AH / AUDIO REACTIVE', 32, 40);
    ctx.fillStyle = '#7f8eab'; ctx.textAlign = 'right'; ctx.fillText(signal.playing ? 'LIVE' : 'STANDBY', 734, 40); ctx.textAlign = 'left';
    const centerX = 384, centerY = 216;
    for (let i = 0; i < 72; i++) {
      const angle = i / 72 * Math.PI * 2, value = signal.frequency[Math.min(511, Math.floor(3 * Math.pow(100, i / 72))) ] / 255;
      const radius = 70 + level * 24, outer = radius + 8 + value * 84;
      ctx.strokeStyle = colors[i % 3]; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius); ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer); ctx.stroke();
    }
    ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#edf1e6'; ctx.fillText('飘移', centerX, centerY + 8); ctx.textAlign = 'left';
    ctx.strokeStyle = colors[1]; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 256; i++) { const x = 32 + i / 255 * 704, y = 407 + (signal.waveform[i * 4] / 128 - 1) * 40; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.fillStyle = '#7f8eab'; ctx.font = '18px monospace'; ctx.fillText('JAY CHOU  /  PIAO YI', 32, 486);
    ctx.fillStyle = colors[2]; for (let i = 0; i < 18; i++) ctx.fillRect(526 + i * 11, 468, 6, i / 18 < signal.energy * 2 ? 18 : 3);
    texture.needsUpdate = true;
  }
  let screenAt = -1;
  function render(now) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const dt = Math.min((now - last) / 1000 || 0, .05); last = now;
    if (!active || document.hidden) return;
    const signal = audio.sample(); level += (signal.bass - level) * .16;
    if (signal.playing && moving) clock += dt;
    controls.update();
    head.rotation.z = moving ? Math.sin(clock * 5) * level * .13 : 0;
    torso.rotation.y = moving ? Math.sin(clock * 2) * .06 : 0;
    for (let i = 0; i < arms.length; i++) arms[i].rotation.y = moving ? Math.sin(clock * (i ? 2.2 : 3) + i) * .17 * (signal.playing ? 1 : 0) : 0;
    for (const record of records) if (signal.playing && moving) record.rotation.y += dt * 1.8;
    for (let i = 0; i < beams.length; i++) {
      const beam = beams[i], phase = beam.phase;
      target.set(Math.sin(clock * .47 + phase) * 5.7, .03, -1 + Math.cos(clock * .36 + phase) * 3.7);
      const direction = target.clone().sub(beam.cone.position), length = direction.length();
      beam.cone.quaternion.setFromUnitVectors(down, direction.normalize()); beam.cone.scale.set(1.25, length, 1.25);
      beam.fixture.quaternion.copy(beam.cone.quaternion);
      beam.pool.position.set(target.x, .015, target.z); beam.pool.scale.set(1.25, 1.25, 1);
      beam.cone.material.opacity = (signal.playing ? .045 + level * .07 : .035);
      beam.pool.material.opacity = signal.playing ? .11 + level * .16 : .06;
      if (beam.light) { beam.light.target.position.copy(target); beam.light.intensity = signal.playing ? 45 + level * 70 : 25; }
    }
    if (now - screenAt > (mobile ? 70 : 45) || dirty) { drawScreen(signal); screenAt = now; }
    if (signal.playing || dirty || moving) { renderer.render(scene, camera); dirty = false; }
  }
  resetCamera(); resize(); frame = requestAnimationFrame(render);
  return {
    start() { active = true; last = performance.now(); dirty = true; resize(); },
    stop() { active = false; },
    setMoving(value) { moving = value; dirty = true; },
    get moving() { return moving; },
    camera() { view = (view + 1) % 3; resetCamera(); return ['全景', 'DJ 近景', '频谱屏'][view]; },
    theme() {
      palette = (palette + 1) % palettes.length;
      beams.forEach((beam, i) => { const color = palettes[palette][i % 3]; beam.cone.material.color.set(color); beam.pool.material.color.set(color); beam.light?.color.set(color); });
      strips.forEach(material => material.color.set(palettes[palette][0])); fill.color.set(palettes[palette][0]); dirty = true;
      return ['紫电 / VIOLET', '落日 / SUNSET', '薄荷 / MINT'][palette];
    },
    refresh() { dirty = true; },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of [].concat(object.material)) { materials.add(material); if (material.map) textures.add(material.map); } });
      geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose()); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
