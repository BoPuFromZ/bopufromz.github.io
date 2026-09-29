import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRetroCar } from './vehicle.js';
import { TRACK, createDriveState, advanceDrive } from './driving.js';

export function createMotorWorld({ mount, config, onTelemetry, onFinish, onCollision, onError }) {
  const mobile = matchMedia('(max-width:800px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '立体复古车库。拖动查看车辆，滚轮或双指缩放。驾驶时使用方向键。');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101819);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 240);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 5.2; controls.maxDistance = 21;
  controls.minPolarAngle = .32; controls.maxPolarAngle = 1.48;
  controls.minAzimuthAngle = -.65; controls.maxAzimuthAngle = 2.7;
  let dirty = true, disposed = false, mode = 'garage', paused = false, view = 0;
  controls.addEventListener('change', () => { dirty = true; });
  const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = generator.fromScene(room, .04); scene.environment = environment.texture;
  scene.environmentIntensity = .75; room.dispose(); generator.dispose();
  const vehicle = createRetroCar(config); scene.add(vehicle.group);
  const garage = new THREE.Group(); scene.add(garage);
  let circuit = null;
  const matte = (color, roughness = .7, metalness = .15) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const dark = matte(0x172222), steel = matte(0x778582, .35, .85), lime = matte(0xb8cd84), orange = matte(0xcb7847);
  const glow = color => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4, toneMapped: false });
  function mesh(geometry, material, position, parent = garage, shadow = true) {
    const object = new THREE.Mesh(geometry, material); object.position.set(...position);
    object.castShadow = shadow; object.receiveShadow = true; parent.add(object); return object;
  }
  const box = (w, h, d, mat, x, y, z, parent = garage) => mesh(new THREE.BoxGeometry(w, h, d), mat, [x, y, z], parent);
  function tube(a, b, radius, mat, parent = garage) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
    const m = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 12), mat, [0, 0, 0], parent);
    m.position.copy(from.add(to).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  function sign(text, subtitle, w, h, x, y, z, parent = garage, color = '#d4ee8c') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#172323'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#56665a'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, 1000, 232);
    ctx.fillStyle = color; ctx.font = 'bold 96px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 512, 136);
    ctx.fillStyle = '#a1b0a4'; ctx.font = '22px monospace'; ctx.fillText(subtitle, 512, 196);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .3, roughness: .7 }), [x, y, z], parent, false);
  }
  // An actual room around the original vehicle, with a service platform and tools.
  box(24, .3, 18, matte(0x313d3c), 0, -.16, 0);
  for (let x = -11; x < 12; x += 2) box(.018, .004, 18, dark, x, .004, 0);
  for (let z = -8; z < 9; z += 2) box(24, .004, .018, dark, 0, .005, z);
  box(24, 6.5, .24, matte(0x243231), 0, 3.1, -7.3);
  box(.24, 6.5, 16, matte(0x1f2c2b), -10.5, 3.1, -.7);
  for (let x = -10; x <= 10; x += 2.5) {
    box(.075, 6, .08, steel, x, 3, -7.14);
    tube([x, 5.7, -7.02], [x + 2.3, 4.5, -7.02], .035, steel);
  }
  sign('AFTERHOURS', 'CUSTOM BAY 04 / KEEP IT PERSONAL', 6.1, 1.55, 0, 4.15, -7.13);
  sign('MAKE IT YOURS', 'RETRO MOTOR CLUB', 2.5, 1.1, 7, 2.9, -7.13, garage, '#ffb46e');
  box(20, .055, .08, glow(0xd4ee8c), 0, 5.83, -7);
  for (const x of [-4.2, 4.2]) {
    box(.16, .18, 10, steel, x, 5.5, -1.5);
    box(.04, .035, 8.5, glow(0xe1eddb), x, 5.38, -1.5);
    tube([x, 5.5, -6], [x, 6.15, -7.2], .045, steel);
  }
  box(7.5, .16, 4.8, matte(0x323c38, .35, .4), -.5, .08, 0);
  for (const z of [-2.45, 2.45]) {
    box(7.6, .04, .045, glow(0xffb46e), -.5, .16, z);
    for (let x = -4; x < 3; x += .4) { const stripe = box(.17, .016, .22, lime, x, .17, z); stripe.rotation.y = -.45; }
  }
  for (const x of [-6.8, 6.3]) {
    box(2.5, 1.8, 1.1, matte(x < 0 ? 0x65715b : 0x4b5b5c, .5, .45), x, .94, -5.2);
    box(2.65, .12, 1.2, dark, x, 1.9, -5.2);
    for (let y = .5; y < 1.8; y += .3) { box(2.2, .22, .06, steel, x, y, -4.62); box(1, .025, .05, dark, x, y, -4.58); }
    for (let i = 0; i < 3; i++) box(.17, .3, .14, i === 1 ? orange : lime, x - .5 + i * .3, 2.1, -5.1);
  }
  const pegboard = box(3.3, 1.6, .08, matte(0x5b6257), -6.8, 3.1, -7.06);
  for (let i = 0; i < 8; i++) { const x = -8.1 + i * .36; tube([x, 2.65, -6.94], [x, 3.4 + i % 2 * .2, -6.94], .035, steel); }
  for (let i = 0; i < 3; i++) {
    const tire = mesh(new THREE.TorusGeometry(.58, .17, 12, 32), vehicle.tireMat, [-7, .6 + i * .36, -.9]); tire.rotation.x = Math.PI / 2;
  }
  for (const z of [-3.2, 3.2]) {
    const lift = box(.28, 3.2, .36, orange, -4.5, 1.6, z);
    box(.48, .12, .58, dark, -4.5, .1, z); tube([-4.5, .5, z], [-2.7, .5, z * .4], .09, steel);
  }
  const hemisphere = new THREE.HemisphereLight(0xd6e5df, 0x263128, 2.2); scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xffecce, 3.5); key.position.set(6, 12, 8); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = -13; key.shadow.camera.right = 13; key.shadow.camera.top = 13; key.shadow.camera.bottom = -13;
  key.shadow.normalBias = .03; key.shadow.bias = -.0001; scene.add(key, key.target);
  const fill = new THREE.PointLight(0xd4ee8c, 45, 16, 2); fill.position.set(-3, 4, -4); garage.add(fill);
  const rim = new THREE.PointLight(0x91c6d3, 35, 15, 2); rim.position.set(5, 3, 0); garage.add(rim);

  function buildCircuit() {
    const group = new THREE.Group(); scene.add(group);
    const ground = mesh(new THREE.CircleGeometry(110, 96), matte(0x253a30), [0, -.06, 0], group); ground.rotation.x = -Math.PI / 2;
    const road = mesh(new THREE.RingGeometry(28, 40, 192), matte(0x333e43, .97, .02), [0, .01, 0], group); road.rotation.x = -Math.PI / 2;
    const inner = mesh(new THREE.CircleGeometry(27.7, 96), matte(0x31483a), [0, -.015, 0], group); inner.rotation.x = -Math.PI / 2;
    for (const radius of [27.7, 40.3]) {
      const wall = mesh(new THREE.CylinderGeometry(radius, radius, .58, 128, 1, true), new THREE.MeshStandardMaterial({ color: 0x63716d, side: THREE.DoubleSide, roughness: .6, metalness: .35 }), [0, .32, 0], group);
      const rail = mesh(new THREE.TorusGeometry(radius, .07, 8, 192), glow(0x90bcaa), [0, .68, 0], group); rail.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 128; i++) {
      const angle = i / 128 * Math.PI * 2;
      for (const radius of [28.35, 39.65]) {
        const curb = mesh(new THREE.RingGeometry(radius - .35, radius + .35, 2, 1, angle, Math.PI * 2 / 128), i % 2 ? matte(0xd5d9c7) : orange, [0, .04, 0], group); curb.rotation.x = -Math.PI / 2;
      }
      if (i % 4 === 0) { const line = box(.12, .01, .9, matte(0xc1cbbd), Math.cos(angle) * 34, .035, Math.sin(angle) * 34, group); line.rotation.y = -angle; }
    }
    // A checked finish line spans the road; markers show the required direction.
    for (let x = 28; x < 40; x += 1) for (let z = -.5; z < .5; z += .5) box(1, .018, .5, (Math.floor(x) + Math.round(z * 2)) % 2 ? dark : matte(0xe4e8d8), x + .5, .045, z + .25, group);
    for (let i = 1; i <= 12; i++) {
      const angle = i / 12 * Math.PI * 2, gate = new THREE.Group(); gate.position.set(Math.cos(angle) * 34, 0, Math.sin(angle) * 34); gate.rotation.y = -angle; group.add(gate);
      for (const x of [-6.8, 6.8]) { box(.18, 3.6, .18, dark, x, 1.8, 0, gate); box(.06, 2.8, .06, glow(i === 12 ? 0xffb46e : 0xb7dc8b), x, 2, .11, gate); }
      if (i % 3 === 0) {
        box(13.8, .12, .22, steel, 0, 3.6, 0, gate);
        sign(i === 12 ? 'START / FINISH' : `CHECKPOINT ${String(i).padStart(2, '0')}`, 'AFTERHOURS / NIGHT CIRCUIT', 5.5, .85, 0, 3.15, -.14, gate);
      }
      const arrow = new THREE.Shape(); arrow.moveTo(-.5, -.6); arrow.lineTo(0, .6); arrow.lineTo(.5, -.6); arrow.lineTo(0, -.25); arrow.closePath();
      const marker = mesh(new THREE.ShapeGeometry(arrow), new THREE.MeshBasicMaterial({ color: 0xb4cb84, side: THREE.DoubleSide }), [Math.cos(angle) * 32, .06, Math.sin(angle) * 32], group, false);
      marker.rotation.set(-Math.PI / 2, 0, -angle + Math.PI);
    }
    // Trackside landmarks and the clubhouse give the chase camera a sense of space.
    box(12, 4.8, 7, matte(0x263739), 0, 2.4, 0, group);
    box(12.2, .18, 7.2, dark, 0, 4.85, 0, group);
    sign('AFTERHOURS', 'ONE CAR / ONE LAP / YOUR OWN STYLE', 9.5, 1.9, 0, 3.15, 3.53, group);
    for (let i = -4; i <= 4; i += 2) box(1.6, 1.2, .06, glow(0x849887), i, 1.25, 3.54, group);
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2, x = Math.cos(angle) * 45, z = Math.sin(angle) * 45;
      tube([x, 0, z], [x, 7, z], .11, steel, group);
      const light = box(1.5, .12, .45, glow(0xffe6c0), x, 7, z, group); light.rotation.y = -angle;
      if (i % 4 === 0) { const lamp = new THREE.PointLight(0xffe6c0, 28, 17, 2); lamp.position.set(x, 6, z); group.add(lamp); }
    }
    for (let i = 0; i < 30; i++) {
      const angle = i * Math.PI * 2 / 30, radius = 68 + Math.sin(i * 21.3) * 7, h = 5 + (i * 7.23) % 11;
      const building = box(5 + i % 3, h, 5, matte(i % 2 ? 0x263a40 : 0x304747), Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius, group);
      building.rotation.y = -angle;
      for (let j = 0; j < 3; j++) box(.035, h * .55, .5, glow(j % 2 ? 0x7ca19b : 0xa4ac7a), Math.cos(angle) * (radius - 3), h / 2, Math.sin(angle) * (radius - 3) + j, group);
    }
    const moon = mesh(new THREE.SphereGeometry(3, 20, 12), new THREE.MeshBasicMaterial({ color: 0xd1ded1 }), [-55, 44, -70], group, false);
    const points = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) { points[i * 3] = Math.sin(i * 19.3) * 130; points[i * 3 + 1] = 32 + i % 50; points[i * 3 + 2] = Math.cos(i * 37.7) * 130; }
    const stars = new THREE.BufferGeometry(); stars.setAttribute('position', new THREE.BufferAttribute(points, 3));
    group.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xadc6c4, size: .14, transparent: true, opacity: .6 })));
    return group;
  }
  let state = createDriveState(), input = {}, last = performance.now(), accumulator = 0, lastRender = 0, lastHUD = 0, frame, finishSent = false, collisionCount = 0;
  const target = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  function garageCamera() {
    const factor = mount.clientWidth < 600 ? 1.12 : 1;
    const positions = [[8.6, 4.5, 8.8], [1.2, 3.4, 11], [-8.2, 4.1, 8.6]];
    camera.position.set(...positions[view % 3]).multiplyScalar(factor); camera.up.set(0, 1, 0);
    controls.target.set(-.5, 1.05, 0); controls.update(); dirty = true;
  }
  function placeCar() { vehicle.group.position.set(state.x, .04, state.z); vehicle.group.rotation.y = -state.heading; }
  function updateCamera(dt, snap = false) {
    if (view) { desiredCamera.set(state.x - Math.cos(state.heading) * 11, 17, state.z - Math.sin(state.heading) * 11); target.set(state.x, 0, state.z); }
    else { desiredCamera.set(state.x - Math.cos(state.heading) * 8.4, 4.4, state.z - Math.sin(state.heading) * 8.4); target.set(state.x + Math.cos(state.heading) * 4, 1, state.z + Math.sin(state.heading) * 4); }
    if (snap) camera.position.copy(desiredCamera); else camera.position.lerp(desiredCamera, 1 - Math.exp(-5 * dt));
    camera.lookAt(target);
  }
  function resetRace() {
    state = createDriveState(); input = {}; accumulator = 0; paused = false; finishSent = false; collisionCount = 0;
    placeCar(); updateCamera(0, true); dirty = true; onTelemetry?.(state);
  }
  function setMode(next) {
    mode = next; view = 0; input = {}; paused = false; last = performance.now(); accumulator = 0;
    garage.visible = next === 'garage'; controls.enabled = next === 'garage';
    if (next === 'race') {
      circuit ??= buildCircuit(); circuit.visible = true; scene.background.set(0x18262e); scene.fog = new THREE.FogExp2(0x18262e, .006);
      key.shadow.camera.left = -48; key.shadow.camera.right = 48; key.shadow.camera.top = 48; key.shadow.camera.bottom = -48;
      key.shadow.camera.updateProjectionMatrix(); hemisphere.intensity = 1.8; resetRace();
    } else {
      if (circuit) circuit.visible = false; scene.background.set(0x101819); scene.fog = null;
      key.position.set(6, 12, 8); key.target.position.set(0, 0, 0);
      key.shadow.camera.left = -13; key.shadow.camera.right = 13; key.shadow.camera.top = 13; key.shadow.camera.bottom = -13; key.shadow.camera.updateProjectionMatrix(); hemisphere.intensity = 2.2;
      vehicle.group.position.set(-.5, .17, 0); vehicle.group.rotation.y = 0; vehicle.animateWheels(0, 0); garageCamera();
    }
    dirty = true;
  }
  const resize = () => {
    const width = mount.clientWidth || 800, height = mount.clientHeight || 600;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); dirty = true;
  };
  const observer = new ResizeObserver(resize); observer.observe(mount); resize(); setMode('garage');
  function animate(now) {
    if (disposed) return; frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, .08); last = now;
    if (document.hidden) { input = {}; return; }
    if (mode === 'garage') controls.update();
    if (mode === 'race' && !paused && !state.finished) {
      accumulator += dt; let traveled = 0;
      while (accumulator >= 1 / 120) { const before = state.distance; advanceDrive(state, input, 1 / 120); traveled += state.distance - before; accumulator -= 1 / 120; }
      placeCar(); vehicle.animateWheels(traveled, state.steering); updateCamera(dt); dirty = true;
      key.position.set(state.x + 5, 15, state.z + 5); key.target.position.set(state.x, 0, state.z);
      if (state.collisions > collisionCount) { collisionCount = state.collisions; onCollision?.(); }
      if (state.finished && !finishSent) { finishSent = true; input = {}; onFinish?.(state); }
    }
    if (mode === 'race' && now - lastHUD > 100) { lastHUD = now; onTelemetry?.(state); }
    if (dirty && now - lastRender > 33) { renderer.render(scene, camera); dirty = false; lastRender = now; mount.dataset.ready = 'true'; }
  }
  frame = requestAnimationFrame(animate);
  renderer.domElement.addEventListener('webglcontextlost', e => { if (!disposed) { e.preventDefault(); paused = true; input = {}; onError?.(); } });
  return {
    setMode, resetRace,
    setInput(value) { input = { ...value }; },
    setPaused(value) { paused = value; input = {}; last = performance.now(); },
    setConfig(value) { vehicle.setConfig(value); dirty = true; },
    cycleCamera() { view = mode === 'race' ? 1 - view : (view + 1) % 3; if (mode === 'garage') garageCamera(); else updateCamera(0, true); dirty = true; },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const mat of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) { materials.add(mat); for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); delete mount.dataset.ready;
    },
  };
}
