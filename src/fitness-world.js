import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BAR, createDeadliftState, beginDeadliftStep, advanceDeadlift, sampleDeadliftPose } from './fitness-motion.js';
import { createAthlete } from './fitness-goku.js';

export async function createFitnessWorld({ mount, onState, onError }) {
  const athlete = await createAthlete();
  const mobile = matchMedia('(max-width:800px)').matches;
  const idleMotion = !matchMedia('(prefers-reduced-motion:reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', '三维硬拉台，200 公斤杠铃与可逐步演示动作的悟空。拖动旋转，滚轮或双指缩放。');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x111b1b);
  const camera = new THREE.PerspectiveCamera(41, 1, .1, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 4.4; controls.maxDistance = 13;
  controls.minPolarAngle = .35; controls.maxPolarAngle = 1.43;
  controls.minAzimuthAngle = .7; controls.maxAzimuthAngle = Math.PI * 1.42;
  let disposed = false, dirty = true, view = 0, state = createDeadliftState(), last = performance.now(), lastRender = 0, lastHUD = 0, lastIdle = 0, frame;
  controls.addEventListener('change', () => { dirty = true; });
  const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = generator.fromScene(room, .04); scene.environment = environment.texture; scene.environmentIntensity = .6;
  room.dispose(); generator.dispose();
  const material = (color, roughness = .65, metalness = .1) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const dark = material(0x192422), rubber = material(0x141d1c, .96, .01), steel = material(0x99a6a0, .28, .9);
  const lime = material(0xb6d580, .55), cloth = material(0x323e3b, .88);
  const glow = color => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, toneMapped: false });
  function mesh(geometry, mat, position, parent = scene, shadows = true) {
    const object = new THREE.Mesh(geometry, mat); object.position.set(...position); object.castShadow = shadows; object.receiveShadow = true; parent.add(object); return object;
  }
  const box = (w, h, d, mat, x, y, z, parent = scene) => mesh(new THREE.BoxGeometry(w, h, d), mat, [x, y, z], parent);
  function label(text, subtitle, width, height, position, parent = scene, color = '#d4ee8c') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#172521'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#596b55'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 1004, 236);
    ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = 'bold 108px Impact, sans-serif'; ctx.fillText(text, 512, 145);
    ctx.fillStyle = '#99b292'; ctx.font = '20px monospace'; ctx.fillText(subtitle, 512, 206);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const object = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .2 }), position, parent, false); object.rotation.y = Math.PI; return object;
  }
  // A dedicated wooden deadlift platform, with rubber under both plate stacks.
  box(14, .18, 11, material(0x303c39), 0, -.1, 0);
  for (let x = -6; x <= 6; x += 2) box(.016, .004, 11, dark, x, .001, 0);
  for (let z = -4; z <= 4; z += 2) box(14, .004, .016, dark, 0, .002, z);
  box(6.6, .16, 4.8, dark, 0, .08, .3);
  box(1.65, .035, 4.75, material(0x927552, .6, .04), 0, .1775, .3);
  for (const x of [-2.05, 2.05]) box(2.45, .035, 4.75, rubber, x, .1775, .3);
  for (let x = -.75; x < .8; x += .18) box(.009, .001, 4.6, material(0x675238), x, .196, .3);
  for (const z of [-2.12, 2.72]) box(6.55, .025, .035, glow(0xd4ee8c), 0, .17, z);
  const floorLabel = label('200 KG', 'DEADLIFT / ONE MORE REP', 1.42, .36, [0, .198, -1.35]); floorLabel.rotation.set(-Math.PI / 2, 0, Math.PI);
  box(13.5, 4.8, .22, material(0x243330), 0, 2.3, 4.35);
  for (let x = -6; x <= 6; x += 2) box(.05, 4.55, .05, material(0x405449), x, 2.3, 4.2);
  label('ONE MORE REP', 'AFTERHOURS / TRAINING BAY 05', 5.1, 1.25, [0, 3.2, 4.21]);
  box(12.8, .045, .045, glow(0xd4ee8c), 0, 4.44, 4.19);
  for (const x of [-4.6, 4.6]) {
    box(.14, 3.25, .14, dark, x, 1.65, 2.25); box(.14, .09, 2.3, dark, x, .08, 2.1);
    for (let y = .6; y < 2.9; y += .18) box(.03, .03, .01, steel, x, y, 2.16);
    box(.3, .10, .33, steel, x, 1.4, 2.1);
  }
  box(9.2, .13, .14, dark, 0, 3.29, 2.25);
  box(2.6, .08, .1, glow(0xa3b79c), 0, 3.33, 2.18);
  const sparePlate = material(0x3a4a3b, .8, .2);
  for (let i = 0; i < 3; i++) { const plate = mesh(new THREE.CylinderGeometry(.34, .34, .10, 28), sparePlate, [-4.1, .18 + i * .11, .9]); }
  const bench = box(1.2, .15, .62, cloth, 4.7, .62, -.05); box(.8, .45, .42, dark, 4.7, .31, -.05);
  const bottle = mesh(new THREE.CylinderGeometry(.08, .07, .3, 16), material(0x98aa89), [4.95, .85, -.04]);
  label('05', 'STAY CONSISTENT', .9, .85, [-4.4, 3.1, 4.21], scene, '#ffb46e');

  const stage = new THREE.Group(); stage.position.y = .195; scene.add(stage);
  const bar = new THREE.Group(); bar.name = '200kgDeadliftBar'; bar.position.set(0, BAR.floorHeight, BAR.z); stage.add(bar);
  const shaft = mesh(new THREE.CylinderGeometry(.023, .023, 2.9, 20), steel, [0, 0, 0], bar); shaft.rotation.z = Math.PI / 2;
  const knurl = material(0x5f726c, .65, .7);
  for (const x of [-.43, .43]) { const grip = mesh(new THREE.CylinderGeometry(.024, .024, .24, 18), knurl, [x, 0, 0], bar); grip.rotation.z = Math.PI / 2; }
  function plateLabel(weight, radius, x, sign) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = weight === 20 ? '#202d27' : '#5c5740'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#adbe83'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(128, 128, 109, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#dce5c7'; ctx.font = 'bold 66px sans-serif'; ctx.fillText(String(weight), 128, 105);
    ctx.font = '20px monospace'; ctx.fillText('KG', 128, 178); ctx.fillStyle = '#131c17'; ctx.beginPath(); ctx.arc(128, 128, 21, 0, Math.PI * 2); ctx.fill();
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const face = mesh(new THREE.CircleGeometry(radius - .014, 32), new THREE.MeshStandardMaterial({ map, roughness: .8 }), [x, 0, 0], bar); face.rotation.y = sign * Math.PI / 2;
  }
  for (const sign of [-1, 1]) {
    const sleeve = mesh(new THREE.CylinderGeometry(.042, .042, .61, 24), steel, [sign * 1.075, 0, 0], bar); sleeve.rotation.z = Math.PI / 2;
    BAR.platesPerSide.forEach((weight, i) => {
      const radius = weight === 20 ? .335 : .28, thickness = weight === 20 ? .072 : .042, x = sign * (.86 + i * .082);
      const plate = mesh(new THREE.CylinderGeometry(radius, radius, thickness, 40), i === 4 ? material(0x655f44, .8, .25) : rubber, [x, 0, 0], bar); plate.rotation.z = Math.PI / 2;
      const rim = mesh(new THREE.TorusGeometry(radius - .016, .012, 8, 40), lime, [x + sign * thickness / 2, 0, 0], bar); rim.rotation.y = Math.PI / 2;
      plateLabel(weight, radius, x + sign * (thickness / 2 + .002), sign);
    });
    const collar = mesh(new THREE.CylinderGeometry(.065, .065, .07, 20), material(0xb4ac89, .35, .85), [sign * 1.27, 0, 0], bar); collar.rotation.z = Math.PI / 2;
  }

  stage.add(athlete.root);
  mount.dataset.character = athlete.root.userData.design;
  function applyPose(pose) {
    athlete.apply(pose); bar.position.y = pose.barY;
    mount.dataset.pose = JSON.stringify({ root: pose.root, barY: pose.barY, hands: pose.hands, grippingBar: pose.grippingBar, hips: pose.hips, shoulders: pose.shoulders });
    dirty = true;
  }
  const hemisphere = new THREE.HemisphereLight(0xd2e2d7, 0x253029, 2); scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xffe7c6, 3); key.position.set(5, 9, -5); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.normalBias = .025; key.shadow.bias = -.0001; scene.add(key);
  const rim = new THREE.DirectionalLight(0xa4d3c2, 1.2); rim.position.set(-4, 4, 3); scene.add(rim);
  const accent = new THREE.PointLight(0xd4ee8c, 8, 10, 2); accent.position.set(0, 3, 3.5); scene.add(accent);
  function resetCamera() {
    const presets = [[4.3, 2.9, -5.8], [.1, 2.4, -7.2], [6.7, 2.6, -.5]];
    camera.position.set(...presets[view]).multiplyScalar(mount.clientWidth < 600 ? 1.15 : 1);
    controls.target.set(-.4, 1.07, .12); controls.update(); dirty = true;
  }
  function publish() { onState?.({ ...state }); }
  function reset() { state = createDeadliftState(); applyPose(sampleDeadliftPose()); publish(); }
  const resize = () => { const width = mount.clientWidth || 800, height = mount.clientHeight || 600; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); dirty = true; };
  const observer = new ResizeObserver(resize); observer.observe(mount); resize(); resetCamera(); reset();
  const visibility = () => { last = performance.now(); };
  document.addEventListener('visibilitychange', visibility);
  function animate(now) {
    if (disposed) return; frame = requestAnimationFrame(animate);
    const dt = Math.max((now - last) / 1000, 0); last = now;
    if (document.hidden) return;
    controls.update();
    if (state.running) {
      const finished = advanceDeadlift(state, dt); applyPose(sampleDeadliftPose(state.step, state.progress));
      if (finished || now - lastHUD > 90) { lastHUD = now; publish(); }
    }
    if (!state.running && idleMotion && now - lastIdle > 120) { athlete.breathe(now); lastIdle = now; dirty = true; }
    if (dirty && now - lastRender > 33) { renderer.render(scene, camera); dirty = false; lastRender = now; mount.dataset.ready = 'true'; }
  }
  frame = requestAnimationFrame(animate);
  renderer.domElement.addEventListener('webglcontextlost', event => { if (!disposed) { event.preventDefault(); onError?.(); } });
  return {
    startStep() { if (!beginDeadliftStep(state)) return false; applyPose(sampleDeadliftPose(state.step, 0)); last = performance.now(); publish(); return true; },
    reset,
    cycleCamera() { view = (view + 1) % 3; resetCamera(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); document.removeEventListener('visibilitychange', visibility);
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.isLight) object.dispose?.(); for (const mat of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) { materials.add(mat); for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); delete mount.dataset.ready; delete mount.dataset.pose; delete mount.dataset.character;
    },
  };
}
