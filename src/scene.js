import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const palette = { game: 0x8bebde, music: 0xda98d7, animation: 0xb0a1ff, car: 0xffb46e, fitness: 0xd4ee8c };

export function createGarage({ mount, hotspots, onOpen, onReady, onHover, reduced = false }) {
  const scene = new THREE.Scene();
  const width = () => mount.clientWidth || 800;
  const height = () => mount.clientHeight || 600;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width:800px)').matches ? 1.5 : 1.75));
  renderer.setSize(width(), height());
  renderer.setClearColor(0x101313, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', '三维创作车库。拖动旋转，滚轮缩放。点击汽车、音乐台、游戏电脑、动画屏幕或健身器械探索。方向键旋转，Home 恢复视角。');
  renderer.domElement.tabIndex = 0;
  mount.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(32, width() / height(), .1, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.minDistance = 15;
  controls.maxDistance = 42;
  controls.minPolarAngle = .32;
  controls.maxPolarAngle = Math.PI / 2.08;
  controls.minAzimuthAngle = -.3;
  controls.maxAzimuthAngle = Math.PI * .75;
  controls.rotateSpeed = .48;
  controls.zoomSpeed = .65;
  let renderDirty = true;
  controls.addEventListener('change', () => { renderDirty = true; });
  controls.target.set(0, 1.1, 0);
  const homePosition = new THREE.Vector3(18, 16, 23);
  function reset() {
    const aspect = width() / height();
    homePosition.set(18, 16, 23).multiplyScalar(aspect < 1.2 ? Math.max(1.08, 1.15 / aspect) : aspect > 1.65 ? .92 : 1);
    camera.position.copy(homePosition); controls.target.set(0, 1.1, 0); controls.update();
  }
  reset();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentRoom = new RoomEnvironment();
  const envTarget = pmrem.fromScene(environmentRoom, .04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = .45;
  environmentRoom.dispose(); pmrem.dispose();
  const world = new THREE.Group(); scene.add(world);
  const pickables = [];
  const animations = [];
  const lights = [];
  const shared = {
    dark: new THREE.MeshStandardMaterial({ color: 0x1b2627, roughness: .64, metalness: .3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x778084, roughness: .36, metalness: .87 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151b1c, roughness: .72, metalness: .2 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7c6049, roughness: .7 }),
    white: new THREE.MeshStandardMaterial({ color: 0xdddecd, roughness: .49 }),
  };
  const material = (color, roughness = .5, metalness = .15) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const neon = (color, strength = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: .35, toneMapped: false });
  function mesh(geo, mat, pos, parent = world, cast = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w, h, d, mat, x, y, z, parent = world) => mesh(new THREE.BoxGeometry(w, h, d), mat, [x, y, z], parent);
  const cylinder = (top, bottom, h, mat, x, y, z, parent = world, segments = 24) => mesh(new THREE.CylinderGeometry(top, bottom, h, segments), mat, [x, y, z], parent);
  function tube(a, b, r, mat, parent = world) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const m = cylinder(r, r, delta.length(), mat, 0, 0, 0, parent, 10);
    m.position.copy(start.add(end).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  function texture(draw, w = 1024, h = 512) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    draw(canvas.getContext('2d'), w, h); const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { t, canvas };
  }
  function face(tex, w, h, pos, parent = world, intensity = .25) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensity, roughness: .65, side: THREE.DoubleSide });
    return mesh(new THREE.PlaneGeometry(w, h), mat, pos, parent, false);
  }
  function sign(text, subtext, color, w, h, pos, parent = world) {
    const { t } = texture((ctx, tw, th) => {
      ctx.fillStyle = '#162120'; ctx.fillRect(0, 0, tw, th);
      ctx.strokeStyle = '#657667'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, tw - 28, th - 28);
      ctx.fillStyle = '#' + new THREE.Color(color).getHexString(); ctx.font = '900 150px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, tw / 2, th * .58);
      ctx.font = '24px monospace'; ctx.fillStyle = '#8e9e8d'; ctx.fillText(subtext, tw / 2, th * .8);
    }); return face(t, w, h, pos, parent, .8);
  }
  function route(group, id) { group.traverse(o => { if (o.isMesh) { o.userData.route = id; pickables.push(o); } }); }
  function point(color, intensity, pos, distance = 10) { const l = new THREE.PointLight(color, intensity, distance, 2); l.position.set(...pos); scene.add(l); lights.push(l); return l; }
  function floorGlow(color, x, z, sx, sz, parent = world) {
    const { t } = texture((ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#' + new THREE.Color(color).getHexString() + '70'); g.addColorStop(.4, '#' + new THREE.Color(color).getHexString() + '20'); g.addColorStop(1, '#00000000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, 256, 256);
    const m = mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }), [x, .256, z], parent, false); m.rotation.x = -Math.PI / 2; return m;
  }

  // A cutaway workshop, built entirely as three-dimensional geometry.
  const floorTexture = texture((ctx, w, h) => {
    ctx.fillStyle = '#434948'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) { const x = (i * 137.51) % w, y = (i * 89.31) % h; ctx.fillStyle = i % 2 ? '#ffffff08' : '#00000009'; ctx.fillRect(x, y, 1.5, 1.5); }
    ctx.strokeStyle = '#1e2725'; ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * w / 8, 0); ctx.lineTo(i * w / 8, h); ctx.stroke(); }
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(0, i * h / 6); ctx.lineTo(w, i * h / 6); ctx.stroke(); }
  });
  box(16, .5, 11, material(0x293231, .65), 0, -.02, 0);
  const floor = face(floorTexture.t, 15.8, 10.8, [0, .235, 0], world, 0); floor.rotation.x = -Math.PI / 2;
  box(16.06, .08, .06, neon(0x9cb987, 1), 0, -.08, 5.52);
  box(.06, .08, 11.06, neon(0x9cb987, 1), 8.02, -.08, 0);
  box(16, .16, 11, shared.black, 0, -.42, 0);
  box(16, 3.95, .22, material(0x263331, .85), 0, 2.12, -5.38);
  box(.22, 3.95, 6.8, material(0x25312f, .85), -7.88, 2.12, -2);
  for (let x = -7; x < 8; x += 2) {
    box(.05, 3.7, .035, material(0x40504a), x, 2.15, -5.24);
    box(.025, .025, .015, shared.steel, x, 1.2, -5.21);
  }
  box(16.1, .18, .3, shared.dark, 0, 4.13, -5.34);
  box(.3, .18, 6.9, shared.dark, -7.9, 4.13, -2);
  box(15.5, .035, .025, neon(0xd4ee8c, 2), 0, 3.95, -5.21);
  box(.025, .035, 6.2, neon(0xd4ee8c, 2), -7.73, 3.95, -2.2);
  box(15.6, .08, .07, shared.black, 0, .48, -5.21);
  for (let x = -7; x < 8; x += 3) tube([x, 3.8, -5.08], [x + 2, 3.8, -5.08], .06, shared.steel);
  tube([-7.55, .25, -5.04], [-7.55, 3.9, -5.04], .08, shared.steel);
  const logo = sign('AFTER HOURS', 'CREATIVE GARAGE / STAY CURIOUS', 0xd4ee8c, 3.8, 1.5, [-5.15, 2.75, -5.23]);
  point(0xd4ee8c, 20, [-4.8, 3.2, -4.5], 7);
  // Frosted industrial window in the left wall.
  const windowGroup = new THREE.Group(); windowGroup.position.set(-7.72, 2.55, -1.8); windowGroup.rotation.y = Math.PI / 2; world.add(windowGroup);
  box(3.4, 1.7, .12, shared.black, 0, 0, 0, windowGroup);
  box(3.18, 1.47, .14, new THREE.MeshStandardMaterial({ color: 0x779499, emissive: 0x5c8c84, emissiveIntensity: .35, metalness: .15, roughness: .2 }), 0, 0, .02, windowGroup);
  for (const x of [-1, 0, 1]) box(.05, 1.5, .06, shared.dark, x, 0, .12, windowGroup);
  box(3.3, .05, .06, shared.dark, 0, 0, .12, windowGroup);
  box(3.6, .08, .32, shared.dark, 0, -.86, .13, windowGroup);

  // MUSIC: a synthesizer, studio speakers, turntable, and moving equalizer.
  const music = new THREE.Group(); music.position.set(-5.1, 0, -2.3); world.add(music);
  box(3.4, .13, 1.3, shared.wood, 0, 1.08, 0, music);
  for (const x of [-1.4, 1.4]) { box(.08, .82, .9, shared.dark, x, .63, 0, music); tube([x, .3, -.4], [x, .97, .45], .03, shared.steel, music); }
  const synth = new THREE.Group(); synth.position.set(.1, 1.26, .14); synth.rotation.x = -.12; music.add(synth);
  box(2.4, .18, .68, material(0x252d38), 0, 0, 0, synth);
  for (let i = 0; i < 22; i++) {
    box(.083, .036, .36, shared.white, -1.05 + i * .098, .109, .105, synth);
    if (![2, 6].includes(i % 7)) box(.05, .06, .2, shared.black, -1 + i * .098, .14, .02, synth);
  }
  for (let i = 0; i < 12; i++) cylinder(.035, .035, .04, shared.steel, -.93 + i * .16, .12, -.23, synth, 10);
  box(.22, .008, .08, neon(palette.music, .8), .64, .12, -.23, synth);
  for (const x of [-1.27, 1.27]) {
    box(.47, .68, .39, shared.black, x, 1.55, -.39, music);
    for (const [r, y] of [[.145, 1.44], [.064, 1.72]]) {
      const driver = cylinder(r, r, .025, material(0x283236), x, y, -.181, music); driver.rotation.x = Math.PI / 2;
      const rim = mesh(new THREE.TorusGeometry(r, .012, 8, 24), shared.steel, [x, y, -.163], music); rim.castShadow = false;
    }
  }
  const equalizers = [];
  box(1.34, .66, .09, shared.black, 0, 1.84, -.4, music);
  for (let i = 0; i < 18; i++) {
    const bar = box(.036, .32, .015, neon(palette.music, 1.1), -.52 + i * .06, 1.82, -.341, music); equalizers.push(bar);
  }
  animations.push(t => equalizers.forEach((m, i) => { const h = .06 + (Math.sin(t * 2.8 + i * .55) * .5 + .5) * .4; m.scale.y = h / .32; m.position.y = 1.6 + h / 2; }));
  const stool = cylinder(.32, .3, .12, material(0x76556b), 0, .79, 1, music);
  cylinder(.06, .08, .5, shared.steel, 0, .51, 1, music); cylinder(.33, .36, .06, shared.black, 0, .26, 1, music);
  floorGlow(palette.music, -5, -2.1, 4, 3.5); point(palette.music, 14, [-5, 1.8, -1.7], 5); route(music, 'music');

  // GAME: dual monitors with a bespoke little platform-world and a code display.
  const game = new THREE.Group(); game.position.set(-.8, 0, -3.55); world.add(game);
  box(3.7, .15, 1.36, material(0x38434a), 0, 1.13, 0, game);
  for (const x of [-1.55, 1.55]) { box(.12, .86, .12, shared.dark, x, .64, -.42, game); box(.12, .86, .12, shared.dark, x, .64, .42, game); }
  const platformTex = texture((ctx, w, h) => {
    ctx.fillStyle = '#101d26'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#152938'); g.addColorStop(1, '#33574a'); ctx.fillStyle = g; ctx.fillRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = '#b5edd0'; ctx.beginPath(); ctx.arc(780, 125, 48, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 28; i++) { ctx.fillStyle = '#a2dfca'; ctx.fillRect(45 + (i * 137) % 850, 35 + (i * 43) % 230, 3, 3); }
    ctx.fillStyle = '#243f3d'; ctx.beginPath(); ctx.moveTo(0, 370); for (let i = 0; i <= 12; i++) ctx.lineTo(i * 90, 245 + Math.sin(i * 2) * 90); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    for (const [x, y, size] of [[40, 385, 230], [345, 320, 180], [620, 370, 300]]) { ctx.fillStyle = '#8be4c1'; ctx.fillRect(x, y, size, 9); ctx.fillStyle = '#354c41'; ctx.fillRect(x, y + 9, size, 60); }
    ctx.fillStyle = '#d4ee8c'; ctx.fillRect(425, 271, 27, 39); ctx.fillStyle = '#142723'; ctx.fillRect(442, 282, 5, 5);
    ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#a1cfb8'; ctx.fillText('WORLD_01 / PLAY', 45, 60);
  });
  const codeTex = texture((ctx, w, h) => {
    ctx.fillStyle = '#111e20'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c3031'; ctx.fillRect(0, 0, w, 65); ctx.font = '23px monospace'; ctx.fillStyle = '#8fae9b'; ctx.fillText('WORLD.ts   ×', 45, 43);
    const lines = ['const world = new World();', '', 'function createSomething() {', '  const idea = imagine();', '  return build(idea);', '}', '', '// keep making things.'];
    lines.forEach((s, i) => { ctx.fillStyle = '#4c6963'; ctx.fillText(String(i + 1), 25, 113 + i * 40); ctx.fillStyle = i === 7 ? '#688873' : i === 0 ? '#95dcda' : '#c5d0bc'; ctx.fillText(s, 85, 113 + i * 40); });
  });
  for (const [x, tex, angle] of [[-.85, platformTex.t, .15], [.87, codeTex.t, -.15]]) {
    const screen = new THREE.Group(); screen.position.set(x, 1.9, -.28); screen.rotation.y = angle; game.add(screen);
    box(1.7, 1, .12, shared.black, 0, 0, 0, screen); face(tex, 1.55, .85, [0, .015, .066], screen, .65);
    box(.09, .43, .07, shared.steel, 0, -.64, -.02, screen); box(.52, .03, .35, shared.black, 0, -.85, .04, screen);
  }
  box(1.35, .05, .38, shared.black, -.15, 1.235, .32, game);
  for (let i = 0; i < 13; i++) for (let j = 0; j < 3; j++) box(.072, .018, .066, i % 4 ? shared.steel : neon(palette.game, .5), -.68 + i * .085, 1.271, .23 + j * .09, game);
  box(.16, .065, .24, shared.black, .9, 1.25, .34, game);
  const tower = box(.48, .76, .65, shared.dark, 1.46, .64, .1, game);
  for (let y = .4; y < .9; y += .24) { const ring = mesh(new THREE.TorusGeometry(.13, .014, 8, 24), neon(palette.game, 1.5), [1.46, y, .438], game); }
  const chair = new THREE.Group(); chair.position.set(.05, 0, 1.35); game.add(chair);
  box(.73, .14, .65, material(0x34494a), 0, .8, 0, chair); const backrest = box(.69, .74, .13, material(0x34494a), 0, 1.19, .25, chair); backrest.rotation.x = -.12;
  cylinder(.05, .065, .54, shared.steel, 0, .48, 0, chair);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; tube([0, .25, 0], [Math.sin(a) * .43, .24, Math.cos(a) * .43], .035, shared.dark, chair); }
  floorGlow(palette.game, -.8, -3.3, 4, 4); point(palette.game, 18, [-.6, 2.1, -3], 6); route(game, 'game');

  // ANIMATION: a wall screen with an original animated orbit study and a pen display.
  const animation = new THREE.Group(); animation.position.set(4.55, 0, -4.3); world.add(animation);
  box(3.6, 2.17, .18, shared.black, 0, 2.5, -.78, animation);
  const animatedTexture = texture(() => {}, 768, 432);
  face(animatedTexture.t, 3.39, 1.94, [0, 2.5, -.677], animation, .65);
  function drawAnimation(t) {
    const ctx = animatedTexture.canvas.getContext('2d'); const w = 768, h = 432;
    ctx.fillStyle = '#1a2032'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a99fff22'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.save(); ctx.translate(w * .53, h * .46); ctx.rotate(t * .18);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#b0a1ff', '#dfb7dc', '#8bebde'][i]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, 139, 45, i * Math.PI / 3, 0, Math.PI * 2); ctx.stroke(); }
    const g = ctx.createRadialGradient(-15, -18, 0, 0, 0, 53); g.addColorStop(0, '#e5dffb'); g.addColorStop(.5, '#aca2d8'); g.addColorStop(1, '#484976'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 51, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d4ee8c'; ctx.beginPath(); ctx.arc(Math.cos(t * .7) * 139, Math.sin(t * .7) * 45, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.font = '18px monospace'; ctx.fillStyle = '#acabc0'; ctx.fillText('MOTION STUDY / 001', 32, 35); ctx.fillStyle = '#7886a3'; ctx.font = '13px monospace'; ctx.fillText('FRAME BY FRAME', 32, 398);
    ctx.fillStyle = '#333b56'; ctx.fillRect(310, 379, 420, 18); for (let i = 0; i < 27; i++) { ctx.fillStyle = i === Math.floor(t * 5) % 27 ? '#d4ee8c' : '#5f668d'; ctx.fillRect(315 + i * 15, 382, 9, 12); }
    animatedTexture.t.needsUpdate = true;
  }
  drawAnimation(0); animations.push(drawAnimation);
  box(3.1, .12, 1.05, shared.wood, 0, 1.08, .08, animation);
  for (const x of [-1.35, 1.35]) box(.1, .8, .8, shared.dark, x, .63, .1, animation);
  const tablet = box(1.45, .09, .8, shared.black, -.15, 1.21, .1, animation); tablet.rotation.x = -.15;
  const tabletScreen = box(1.25, .012, .63, material(0x7c82ac), -.15, 1.26, .1, animation); tabletScreen.rotation.x = -.15;
  tube([.27, 1.33, .3], [.65, 1.33, -.1], .018, shared.white, animation);
  const books = [0x84978f, 0x68759e, 0xa19887]; books.forEach((c, i) => box(.55, .075, .45, material(c), 1.07, 1.18 + i * .085, .1, animation));
  floorGlow(palette.animation, 4.5, -4, 4.5, 3); point(palette.animation, 18, [4.4, 2.5, -4.4], 6); route(animation, 'animation');

  // CAR: an original retro hatchback, with round lamps, roof stripes and alloy wheels.
  const car = new THREE.Group(); car.position.set(-1.45, .25, 1.32); car.rotation.y = -.24; world.add(car);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xcd7b44, metalness: .68, roughness: .27, clearcoat: 1, clearcoatRoughness: .18 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x183b3f, metalness: .38, roughness: .13, clearcoat: 1 });
  const stripe = material(0xe5deba, .4, .2);
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-1.93, .57); bodyShape.lineTo(-1.86, .97); bodyShape.quadraticCurveTo(-1.7, 1.13, -1.3, 1.12); bodyShape.lineTo(1.62, 1.02); bodyShape.quadraticCurveTo(1.92, .96, 1.98, .74); bodyShape.lineTo(1.94, .46); bodyShape.lineTo(-1.85, .46); bodyShape.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 1.55, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .1, bevelThickness: .07, curveSegments: 8 });
  mesh(bodyGeo, paint, [0, 0, -.775], car);
  const cabShape = new THREE.Shape(); cabShape.moveTo(-1.17, 1.01); cabShape.lineTo(-.91, 1.88); cabShape.quadraticCurveTo(-.8, 2.01, -.58, 2.01); cabShape.lineTo(.55, 1.98); cabShape.quadraticCurveTo(.73, 1.95, .79, 1.77); cabShape.lineTo(1.04, 1.01); cabShape.closePath();
  mesh(new THREE.ExtrudeGeometry(cabShape, { depth: 1.39, bevelEnabled: true, bevelSize: .07, bevelThickness: .06, bevelSegments: 3, steps: 1 }), paint, [0, 0, -.695], car);
  // Side glass follows the cabin silhouette rather than sitting as a rectangular block.
  for (const z of [-.778, .778]) {
    const win = new THREE.Shape(); win.moveTo(-1.01, 1.19); win.lineTo(-.79, 1.86); win.lineTo(.55, 1.84); win.lineTo(.84, 1.19); win.closePath();
    mesh(new THREE.ShapeGeometry(win), new THREE.MeshPhysicalMaterial({ color: 0x163536, roughness: .15, metalness: .55, side: THREE.DoubleSide }), [0, 0, z], car);
    tube([-.1, 1.2, z * 1.005], [-.16, 1.86, z * 1.005], .025, paint, car);
    box(.22, .055, .05, shared.steel, .32, 1.07, z * 1.08, car);
    const mirror = box(.22, .16, .16, paint, .81, 1.35, z * 1.15, car); mirror.rotation.z = -.12;
    tube([-1.09, .53, z * 1.08], [.99, .53, z * 1.08], .025, shared.steel, car);
  }
  const windshield = box(.055, .72, 1.32, glass, .91, 1.52, 0, car); windshield.rotation.z = .33;
  const rearGlass = box(.055, .66, 1.28, glass, -1.07, 1.54, 0, car); rearGlass.rotation.z = -.3;
  for (const z of [-.25, .25]) {
    box(1.27, .017, .15, stripe, -.04, 2.094, z, car);
    const hoodStripe = box(.82, .022, .15, stripe, 1.42, 1.115, z, car); hoodStripe.rotation.z = -.04;
  }
  box(.1, .16, 1.78, shared.steel, 2.07, .57, 0, car); box(.1, .14, 1.76, shared.steel, -2.03, .62, 0, car);
  box(.09, .25, .68, shared.black, 2.034, .83, 0, car);
  for (let z = -.29; z <= .3; z += .09) box(.1, .025, .045, shared.steel, 2.09, .84, z, car);
  const plate = sign('AH · 001', '', 0xd4ee8c, .46, .16, [2.145, .52, 0], car); plate.rotation.y = Math.PI / 2;
  const headlights = [];
  for (const z of [-.59, .59]) {
    const lamp = cylinder(.18, .18, .05, neon(0xffefca, 1.8), 2.02, .9, z, car, 32); lamp.rotation.z = Math.PI / 2; headlights.push(lamp);
    const rim = mesh(new THREE.TorusGeometry(.19, .032, 10, 32), shared.steel, [2.054, .9, z], car); rim.rotation.y = Math.PI / 2;
    box(.065, .105, .17, neon(0xff722e, 1), 2.052, .66, z, car);
    box(.055, .2, .2, neon(0xc84a36, .5), -2.035, .84, z, car);
  }
  const tireMat = material(0x111615, .92, .02);
  for (const x of [-1.27, 1.22]) for (const z of [-.9, .9]) {
    const wheel = new THREE.Group(); wheel.position.set(x, .48, z); wheel.rotation.x = Math.PI / 2; car.add(wheel);
    cylinder(.47, .47, .28, tireMat, 0, 0, 0, wheel, 40);
    const side = z < 0 ? .155 : -.155;
    cylinder(.33, .33, .028, shared.steel, 0, side, 0, wheel, 32);
    cylinder(.25, .25, .04, shared.black, 0, side * 1.13, 0, wheel, 32);
    cylinder(.075, .075, .06, shared.steel, 0, side * 1.32, 0, wheel, 20);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; tube([Math.sin(a) * .07, side * 1.21, Math.cos(a) * .07], [Math.sin(a) * .27, side * 1.21, Math.cos(a) * .27], .03, shared.steel, wheel); }
    for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10; const tread = box(.03, .29, .025, material(0x222623), Math.sin(a) * .463, 0, Math.cos(a) * .463, wheel); tread.rotation.y = a; }
  }
  // A lowered work bay with safety markings and warm light beneath the car.
  const bay = box(6.4, .06, 4, material(0x2d3633, .35, .3), -1.5, .26, 1.4);
  for (const z of [-.7, 3.5]) {
    box(6.35, .014, .035, neon(0xffb46e, .9), -1.5, .3, z);
    for (let x = -4.5; x < 1.6; x += .35) { const marking = box(.13, .013, .24, material(0xbdac67), x, .307, z + (z < 0 ? .12 : -.12)); marking.rotation.y = -.45; }
  }
  floorGlow(palette.car, -1.5, 1.4, 6.2, 4.7); point(palette.car, 22, [0, .8, 2.6], 6);
  const headlightSpot = new THREE.SpotLight(0xffe4af, 22, 9, .4, .7, 1.5); headlightSpot.position.set(2.1, .9, 0); headlightSpot.target.position.set(7, .3, 0); car.add(headlightSpot, headlightSpot.target); headlights.push(headlightSpot);
  route(car, 'car');

  // Workshop objects: rolling toolbox, pegboard tools, tires, and an articulated lamp.
  const cabinet = new THREE.Group(); cabinet.position.set(-5.8, 0, 1.45); world.add(cabinet);
  box(1.2, 1.2, .72, material(0x647059, .4, .45), 0, .92, 0, cabinet);
  box(1.28, .09, .8, shared.black, 0, 1.57, 0, cabinet);
  for (let y = .55; y < 1.5; y += .21) { box(1.04, .16, .05, material(0x748167, .45, .4), 0, y, .39, cabinet); box(.52, .027, .065, shared.steel, 0, y + .02, .433, cabinet); }
  for (const x of [-.45, .45]) for (const z of [-.24, .24]) { const caster = cylinder(.09, .09, .07, shared.black, x, .3, z, cabinet, 12); caster.rotation.z = Math.PI / 2; }
  cylinder(.16, .15, .24, shared.steel, .3, 1.76, .04, cabinet);
  tube([-.35, 1.62, .2], [-.18, 1.66, -.1], .035, shared.steel, cabinet);
  route(cabinet, 'car');
  for (let i = 0; i < 3; i++) { const tire = cylinder(.46, .46, .24, tireMat, -6.2, .4 + i * .25, 3.45); cylinder(.25, .25, .25, shared.black, -6.2, .4 + i * .25, 3.45); }
  const lampStand = new THREE.Group(); lampStand.position.set(-4.2, 0, -.9); world.add(lampStand);
  cylinder(.22, .28, .05, shared.dark, 0, .28, 0, lampStand);
  tube([0, .3, 0], [0, 1.9, 0], .035, shared.steel, lampStand); tube([0, 1.9, 0], [.4, 2.5, .1], .035, shared.steel, lampStand);
  mesh(new THREE.ConeGeometry(.23, .3, 20, 1, true), material(0x74866b), [.4, 2.38, .1], lampStand);
  cylinder(.15, .15, .012, neon(0xffdfb0, 1), .4, 2.25, .1, lampStand);
  point(0xffdfb0, 7, [-3.8, 2.25, -.8], 4);

  // FITNESS: compact squat rack, barbell, bench and plate storage.
  const gym = new THREE.Group(); gym.position.set(5.55, 0, 1.6); world.add(gym);
  box(3.35, .04, 4, material(0x1c2923, .94), 0, .27, 0, gym);
  for (const x of [-1.08, 1.08]) {
    box(.12, 2.8, .12, shared.dark, x, 1.7, -.8, gym); box(.12, .08, 2, shared.dark, x, .37, -.55, gym);
    box(.14, .08, .48, shared.steel, x, 1.55, -.52, gym);
    for (let y = .7; y < 2.8; y += .19) box(.027, .027, .006, shared.steel, x, y, -.733, gym);
  }
  tube([-1.08, 3.08, -.8], [1.08, 3.08, -.8], .05, shared.steel, gym);
  tube([-1.08, 2.95, -.8], [1.08, 2.95, -.8], .025, neon(palette.fitness, 1), gym);
  const barbellY = 1.63, barbellZ = -.28;
  tube([-1.8, barbellY, barbellZ], [1.8, barbellY, barbellZ], .038, shared.steel, gym);
  for (const sign of [-1, 1]) for (let i = 0; i < 3; i++) { const plate = cylinder(.36 - i * .045, .36 - i * .045, .095, i === 0 ? material(0x66784e, .55, .45) : shared.black, sign * (1.3 + i * .115), barbellY, barbellZ, gym, 32); plate.rotation.z = Math.PI / 2; }
  box(.62, .18, 1.58, material(0x4b5646), 0, .8, .72, gym); box(.45, .13, .45, material(0x4b5646), 0, .81, 1.85, gym);
  tube([0, .28, .22], [0, .72, .22], .06, shared.dark, gym); tube([0, .28, 1.55], [0, .75, 1.55], .06, shared.dark, gym);
  tube([-.4, .3, .22], [.4, .3, .22], .05, shared.dark, gym); tube([-.4, .3, 1.55], [.4, .3, 1.55], .05, shared.dark, gym);
  for (const z of [.05, .58]) { tube([-1.55, .45, z], [-.8, .45, z], .033, shared.steel, gym); for (const x of [-1.48, -.87]) { const head = cylinder(.15, .15, .17, shared.black, x, .45, z, gym, 6); head.rotation.z = Math.PI / 2; } }
  const gymSign = sign('ONE MORE REP', '195 KG / DEADLIFT', palette.fitness, 2.5, .9, [0, 2.5, -.83], gym);
  floorGlow(palette.fitness, 5.55, 1.8, 4, 5); point(palette.fitness, 14, [5.55, 2.5, .8], 5); route(gym, 'fitness');

  // Living details: one plant, a few cables, garage plates and dust in the light.
  const pot = cylinder(.21, .16, .32, material(0x82826a), 7.06, .44, -3.8);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2; const leaf = mesh(new THREE.SphereGeometry(.15, 8, 6), material(0x607f59, .8), [7.06 + Math.sin(a) * .23, .92 + (i % 3) * .13, -3.8 + Math.cos(a) * .23]); leaf.scale.set(.42, 2.4, 1); leaf.rotation.z = Math.sin(a) * .55; leaf.rotation.x = Math.cos(a) * .55;
  }
  const rearLabel = sign('05', 'MADE AFTER HOURS', 0x899c79, .7, .5, [7.15, 3.17, -5.22]);
  const hazardSticker = sign('CAUTION', 'CREATIVITY AT WORK', 0xffb46e, 1.2, .48, [-2.23, 2.93, -5.22]);
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.9, .27, -2), new THREE.Vector3(-4.3, .27, -1.4), new THREE.Vector3(-3.5, .27, -1.9), new THREE.Vector3(-2.9, .27, -3.7)]);
  mesh(new THREE.TubeGeometry(cable, 32, .019, 6, false), shared.black, [0, 0, 0]);
  const shadowTex = texture((ctx, w, h) => { const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, '#000000b0'); g.addColorStop(.5, '#00000050'); g.addColorStop(1, '#00000000'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }, 256, 256);
  const baseShadow = mesh(new THREE.PlaneGeometry(25, 19), new THREE.MeshBasicMaterial({ map: shadowTex.t, transparent: true, depthWrite: false }), [0, -.65, 0], scene, false); baseShadow.rotation.x = -Math.PI / 2;
  const dustGeo = new THREE.BufferGeometry(); const dustPositions = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) { dustPositions[i * 3] = Math.sin(i * 24.7) * 8; dustPositions[i * 3 + 1] = .5 + (i * .073) % 4; dustPositions[i * 3 + 2] = Math.cos(i * 7.1) * 5; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xcedbbc, size: .018, transparent: true, opacity: .25, depthWrite: false })); scene.add(dust);
  animations.push(t => { dust.rotation.y = Math.sin(t * .045) * .06; dust.position.y = Math.sin(t * .17) * .1; });

  const ambient = new THREE.HemisphereLight(0xb1cfc4, 0x192d22, 1.3); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xe7e5c8, 3.1); key.position.set(2, 10, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -12; key.shadow.camera.right = 12; key.shadow.camera.top = 10; key.shadow.camera.bottom = -10; key.shadow.normalBias = .03; key.shadow.bias = -.0001; scene.add(key);
  const rim = new THREE.DirectionalLight(0x96c6ce, 1.1); rim.position.set(-8, 5, -6); scene.add(rim);

  let composer = null, bloom = null;
  if (!matchMedia('(max-width:800px)').matches) {
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(width(), height()), .14, .25, 1.8); composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  const hotspotDefs = [
    { id: 'music', name: '音乐台', position: [-5.05, 2.55, -2.2], number: '02' },
    { id: 'game', name: '游戏开发', position: [-.8, 2.7, -3.35], number: '01' },
    { id: 'animation', name: '动画制作', position: [4.55, 3.87, -4.1], number: '03' },
    { id: 'car', name: '复古车库', position: [-1.1, 2.55, 1.7], number: '04' },
    { id: 'fitness', name: '训练区', position: [5.55, 3.35, 1], number: '05' },
  ];
  const labels = hotspotDefs.map(d => {
    const el = document.createElement('button'); el.className = 'hotspot'; el.dataset.panel = d.id; el.style.setProperty('--accent', '#' + new THREE.Color(palette[d.id]).getHexString());
    el.innerHTML = `<i></i><small>${d.number}</small><span>${d.name}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M2 2h8v8"/></svg>`;
    el.setAttribute('aria-label', `探索${d.name}`); hotspots.append(el); el.addEventListener('click', () => onOpen(d.id));
    return { el, vector: new THREE.Vector3(...d.position) };
  });
  const projected = new THREE.Vector3();
  function updateLabels() {
    for (const d of labels) { projected.copy(d.vector).project(camera); const visible = projected.z < 1 && projected.z > -1 && Math.abs(projected.x) < .96 && Math.abs(projected.y) < .94; d.el.classList.toggle('visible', visible); d.el.style.left = `${(projected.x * .5 + .5) * width()}px`; d.el.style.top = `${(-projected.y * .5 + .5) * height()}px`; d.el.style.visibility = visible ? 'visible' : 'hidden'; }
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart = null, hovered = null;
  function hit(event) { const rect = renderer.domElement.getBoundingClientRect(); pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); return raycaster.intersectObjects(pickables, false)[0]?.object.userData.route || null; }
  renderer.domElement.addEventListener('pointerdown', e => { pointerStart = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => { if (pointerStart && Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) < 6) { const id = hit(e); if (id) onOpen(id); } pointerStart = null; });
  renderer.domElement.addEventListener('pointermove', e => { if (pointerStart) return; const id = hit(e); if (id !== hovered) { hovered = id; renderer.domElement.style.cursor = id ? 'pointer' : 'grab'; onHover?.(id); } });
  renderer.domElement.addEventListener('pointerleave', () => { pointerStart = null; hovered = null; onHover?.(null); });
  renderer.domElement.addEventListener('keydown', e => {
    if (e.key === 'Home') { reset(); e.preventDefault(); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { const offset = camera.position.clone().sub(controls.target), sph = new THREE.Spherical().setFromVector3(offset); if (e.key === 'ArrowLeft') sph.theta -= .08; if (e.key === 'ArrowRight') sph.theta += .08; if (e.key === 'ArrowUp') sph.phi -= .06; if (e.key === 'ArrowDown') sph.phi += .06; sph.theta = THREE.MathUtils.clamp(sph.theta, controls.minAzimuthAngle, controls.maxAzimuthAngle); sph.phi = THREE.MathUtils.clamp(sph.phi, controls.minPolarAngle, controls.maxPolarAngle); camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(controls.target)); controls.update(); e.preventDefault(); }
  });
  // Resizing clears the canvas; schedule a new frame even when motion is paused.
  const resizeObserver = new ResizeObserver(() => { camera.aspect = width() / height(); camera.updateProjectionMatrix(); renderer.setSize(width(), height()); composer?.setSize(width(), height()); updateLabels(); renderDirty = true; }); resizeObserver.observe(mount);
  let motion = !reduced, daytime = false, enabled = true, disposed = false, elapsed = 0, last = performance.now(), lastRender = 0, frame;
  let frames = 0;
  function animate(now) {
    if (disposed) return; frame = requestAnimationFrame(animate); const delta = Math.min((now - last) / 1000, .1); last = now;
    if (document.hidden || !enabled) return;
    controls.update();
    if (motion) elapsed += delta;
    if (now - lastRender < 33 || (!motion && !renderDirty && frames > 3)) return;
    lastRender = now;
    if (motion && frames % 3 === 0) animations.forEach(fn => fn(elapsed));
    updateLabels(); composer ? composer.render() : renderer.render(scene, camera); renderDirty = false;
    if (++frames === 3) onReady?.();
  }
  frame = requestAnimationFrame(animate);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); enabled = false; mount.dispatchEvent(new CustomEvent('scene-error')); });
  return {
    reset,
    explore() { const offset = camera.position.clone().sub(controls.target); camera.position.copy(controls.target).add(offset.multiplyScalar(.9)); controls.update(); },
    setMotion(value) { motion = value; renderDirty = true; },
    setActive(value) { enabled = value; last = performance.now(); renderDirty = true; },
    setDay(value) { renderDirty = true; daytime = value; ambient.intensity = value ? 2.25 : 1.3; key.intensity = value ? 4.4 : 3.1; key.color.set(value ? 0xe4eef4 : 0xe7e5c8); scene.environmentIntensity = value ? .8 : .45; renderer.toneMappingExposure = value ? 1.3 : 1.2; lights.forEach(l => { if (!l.userData.nightIntensity) l.userData.nightIntensity = l.intensity; l.intensity = l.userData.nightIntensity * (value ? .4 : 1); }); headlights.forEach(l => { if (l.isLight) l.intensity = value ? 0 : 22; else l.material.emissiveIntensity = value ? .2 : 1.8; }); if (bloom) bloom.strength = value ? .07 : .14; },
    dispose() { disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); controls.dispose(); composer?.dispose(); envTarget.dispose(); renderer.dispose(); scene.traverse(o => { o.geometry?.dispose(); const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of mats) { m.map?.dispose(); m.dispose(); } }); labels.forEach(l => l.el.remove()); renderer.domElement.remove(); },
  };
}
