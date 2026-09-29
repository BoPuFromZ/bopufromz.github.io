import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BODY, solveJoint } from './fitness-motion.js';

// Smooth, tapered anatomical volumes retain the lightweight original character.
// Each limb shares the exact joint endpoints used by the bar-constrained animation.
export function createAthlete() {
  const root = new THREE.Group(); root.name = 'DeadliftAthlete'; root.userData.design = 'muscular-athlete-v2';
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0 });
  const skin = mat(0xbc865f), skinLight = mat(0xc99470), tank = mat(0x728966), trim = mat(0xc6df92), shorts = mat(0x26332e), hairMat = mat(0x272621), shoeMat = mat(0x26302b), soleMat = mat(0xd1d6bf), iris = mat(0x242a23), white = mat(0xdedacb), mouthMat = mat(0x785342);
  const ball = new THREE.SphereGeometry(1, 24, 18), up = new THREE.Vector3(0, 1, 0);
  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material); object.castShadow = true; object.receiveShadow = true; object.position.set(...position); parent.add(object); return object;
  }
  function ellipsoid(parent, material, position, scale) { const object = mesh(ball, material, parent, position); object.scale.set(...scale); return object; }
  function loft(profile, segments = 28, rings = 30) {
    const curve = new THREE.CatmullRomCurve3(profile.map(([y, x, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
    const vertices = [], indices = [];
    for (let row = 0; row <= rings; row++) {
      const p = curve.getPoint(row / rings);
      for (let col = 0; col <= segments; col++) { const angle = col / segments * Math.PI * 2; vertices.push(Math.cos(angle) * Math.max(0, p.x), p.y, Math.sin(angle) * Math.max(0, p.z)); }
    }
    for (let row = 0; row < rings; row++) for (let col = 0; col < segments; col++) { const a = row * (segments + 1) + col, b = a + segments + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  }
  function stroke(parent, material, points, radius) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 8, false), material, parent); }
  function connect(object, a, b) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    object.position.copy(start.add(end).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(up, delta.clone().normalize()); object.scale.set(1, delta.length(), 1);
  }
  const torso = new THREE.Group(); root.add(torso);
  mesh(loft([[-.07, 0, 0], [0, .208, .134], [.17, .215, .145], [.34, .28, .178], [.47, .315, .19], [.56, .27, .158], [.60, .12, .1], [.61, 0, 0]]), tank, torso);
  const chest = [-1, 1].map(sign => ellipsoid(torso, tank, [sign * .126, .443, -.15], [.16, .105, .078]));
  for (const sign of [-1, 1]) {
    ellipsoid(torso, skin, [sign * .11, .574, .005], [.12, .063, .118]);
    stroke(torso, trim, [[sign * .24, .55, -.08], [sign * .193, .57, -.13], [sign * .126, .59, -.088]], .013);
    stroke(torso, trim, [[sign * .237, .13, -.04], [sign * .246, .26, -.10], [sign * .278, .38, -.09]], .006);
  }
  stroke(torso, shorts, [[-.115, .565, -.107], [0, .537, -.18], [.115, .565, -.107]], .014);
  const logo = mesh(new THREE.RingGeometry(.021, .026, 20), trim, torso, [.125, .454, -.247]); logo.rotation.y = Math.PI;
  const pelvis = mesh(loft([[-.17, 0, 0], [-.145, .218, .138], [-.05, .253, .164], [.05, .232, .148], [.08, 0, 0]], 28, 24), shorts, root);
  const belt = mesh(new THREE.CylinderGeometry(.229, .235, .075, 32), hairMat, torso, [0, .035, 0]); belt.scale.z = .68;
  mesh(new RoundedBoxGeometry(.065, .045, .026, 3, .008), soleMat, torso, [0, .035, -.157]);
  const neck = mesh(loft([[-.5, .069, .065], [0, .08, .07], [.5, .067, .062]], 24, 18), skin, root);
  const head = new THREE.Group(); root.add(head);
  mesh(loft([[-.145, 0, 0], [-.128, .079, .086], [-.074, .116, .109], [.015, .136, .125], [.09, .13, .121], [.148, .09, .094], [.166, 0, 0]], 32, 36), skinLight, head);
  for (const sign of [-1, 1]) {
    ellipsoid(head, skin, [sign * .13, -.006, .003], [.026, .046, .022]);
    ellipsoid(head, skinLight, [sign * .066, -.032, -.096], [.044, .04, .025]);
    stroke(head, hairMat, [[sign * .101, .057, -.091], [sign * .071, .071, -.121], [sign * .032, .060, -.125]], .008);
  }
  const eyes = [-1, 1].map(sign => {
    const eye = new THREE.Group(); eye.position.set(sign * .06, .029, -.117); head.add(eye);
    ellipsoid(eye, white, [0, 0, 0], [.023, .012, .008]); ellipsoid(eye, iris, [-sign * .002, -.001, -.007], [.008, .009, .004]); return eye;
  });
  ellipsoid(head, skin, [0, -.002, -.126], [.021, .047, .02]); ellipsoid(head, skinLight, [0, -.023, -.148], [.025, .02, .024]);
  stroke(head, mouthMat, [[-.035, -.077, -.093], [0, -.081, -.107], [.035, -.077, -.093]], .004);
  ellipsoid(head, skin, [0, -.113, -.077], [.06, .023, .024]);
  const hair = mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * .48), hairMat, head, [0, .014, .007]); hair.scale.set(.14, .162, .13);
  for (let i = 0; i < 5; i++) { const tuft = ellipsoid(head, hairMat, [-.076 + i * .035, .133 + i * .005, -.035], [.048, .055, .1]); tuft.rotation.z = -.22; }
  const upperArmGeo = loft([[-.5, .061, .06], [-.38, .117, .106], [-.1, .132, .115], [.19, .103, .09], [.41, .074, .068], [.5, .054, .055]], 24, 28);
  const forearmGeo = loft([[-.5, .059, .058], [-.26, .087, .084], [0, .09, .077], [.31, .058, .05], [.5, .043, .045]], 24, 24);
  const thighGeo = loft([[-.5, .105, .102], [-.27, .149, .135], [.02, .147, .13], [.26, .113, .103], [.5, .072, .077]], 28, 28);
  const calfGeo = loft([[-.5, .068, .073], [-.24, .107, .105], [0, .102, .095], [.30, .063, .063], [.5, .043, .044]], 24, 26);
  const shortLegGeo = loft([[-.51, .109, .109], [-.4, .156, .142], [-.15, .155, .142], [-.11, .149, .135]], 24, 16);
  const limbs = [-1, 1].map(sign => {
    const shoulder = ellipsoid(root, skin, [0, 0, 0], [.122, .103, .113]), elbow = ellipsoid(root, skin, [0, 0, 0], [.062, .063, .061]), knee = ellipsoid(root, skin, [0, 0, 0], [.08, .086, .079]);
    const upperArm = mesh(upperArmGeo, skin, root), forearm = mesh(forearmGeo, skin, root), upperLeg = new THREE.Group(); root.add(upperLeg); mesh(thighGeo, skin, upperLeg); mesh(shortLegGeo, shorts, upperLeg);
    const lowerLeg = mesh(calfGeo, skin, root);
    const wrist = new THREE.Group(); root.add(wrist); ellipsoid(wrist, hairMat, [0, .017, 0], [.049, .037, .049]);
    const hand = new THREE.Group(); root.add(hand); ellipsoid(hand, skinLight, [0, .014, .006], [.058, .057, .04]);
    for (const x of [-.024, -.008, .008, .024]) { const finger = mesh(new THREE.TorusGeometry(.031, .009, 8, 16, Math.PI * 1.65), skin, hand, [x, -.012, 0]); finger.rotation.y = Math.PI / 2; }
    ellipsoid(hand, skinLight, [sign * .047, -.005, -.023], [.024, .039, .02]);
    const foot = new THREE.Group(); root.add(foot);
    mesh(new RoundedBoxGeometry(.205, .112, .365, 4, .04), shoeMat, foot, [0, -.014, -.079]);
    mesh(new RoundedBoxGeometry(.214, .028, .375, 4, .012), soleMat, foot, [0, -.063, -.081]);
    ellipsoid(foot, shoeMat, [0, .014, .018], [.087, .066, .086]);
    for (let i = 0; i < 3; i++) stroke(foot, trim, [[-.039, .046, -.085 + i * .023], [0, .051, -.096 + i * .023], [.039, .046, -.085 + i * .023]], .006);
    return { sign, shoulder, elbow, knee, upperArm, forearm, upperLeg, lowerLeg, wrist, hand, foot };
  });
  let lastPose = null;
  function breathe(now) {
    const breath = Math.sin(now / 1000 * 1.65), blinkTime = (now / 1000) % 4.7, blink = blinkTime > 4.46 && blinkTime < 4.6;
    chest.forEach(pec => { pec.scale.y = .105 * (1 + breath * .012); pec.scale.z = .078 * (1 + breath * .012); });
    eyes.forEach(eye => { eye.scale.y = blink ? .12 : 1; });
    if (lastPose) { head.rotation.x = -lastPose.pitch * .42 - .035; head.rotation.y = lastPose.grippingBar ? 0 : Math.sin(now / 1000 * .65) * .025; }
  }
  function apply(pose, now = performance.now()) {
    lastPose = pose; root.position.set(...pose.root); root.rotation.y = pose.yaw;
    const direction = new THREE.Vector3(...pose.shoulders).sub(new THREE.Vector3(...pose.hips)).normalize();
    torso.position.set(...pose.hips); torso.quaternion.setFromUnitVectors(up, direction); pelvis.position.set(...pose.hips);
    const neckStart = new THREE.Vector3(...pose.shoulders), neckEnd = neckStart.clone().addScaledVector(direction, .10); connect(neck, neckStart.toArray(), neckEnd.toArray());
    head.position.copy(new THREE.Vector3(...pose.shoulders).addScaledVector(direction, .237));
    limbs.forEach((limb, i) => {
      const shoulder = pose.shoulderJoints[i], hand = pose.hands[i], hip = pose.hipJoints[i], ankle = pose.ankles[i];
      const elbow = solveJoint(shoulder, hand, BODY.upperArm, BODY.lowerArm, [limb.sign * .42, 0, 1]), knee = solveJoint(hip, ankle, BODY.upperLeg, BODY.lowerLeg, [0, 0, -1]);
      limb.shoulder.position.set(...shoulder); limb.elbow.position.set(...elbow); limb.knee.position.set(...knee);
      limb.shoulder.quaternion.copy(torso.quaternion);
      connect(limb.upperArm, shoulder, elbow); connect(limb.forearm, elbow, hand); connect(limb.upperLeg, hip, knee); connect(limb.lowerLeg, knee, ankle);
      limb.hand.position.set(...hand); limb.wrist.position.set(...hand); limb.wrist.position.add(new THREE.Vector3(...elbow).sub(new THREE.Vector3(...hand)).normalize().multiplyScalar(.044));
      limb.foot.position.set(ankle[0], ankle[1] - .065, ankle[2]);
    });
    breathe(now);
  }
  return { root, apply, breathe };
}
