import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { BODY, solveJoint } from './fitness-motion.js';

let source;
export async function createAthlete() {
  source ||= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/fitness-athlete.glb?v=1feccf883f77`).catch(error => { source = null; throw error; });
  const gltf = await source, root = clone(gltf.scene); root.name = 'DeadliftAthlete'; root.userData.design = 'goku-training-tribute-v1';
  const bones = new Map(), up = new THREE.Vector3(0, 1, 0);
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (object.isMesh) { object.geometry = object.geometry.clone(); object.material = object.material.clone(); object.castShadow = true; object.receiveShadow = true; }
    if (object.isBone) bones.set(object.name.replace(/([LR])$/, '.$1'), { object, head: new THREE.Vector3(...object.userData.referenceHead), tail: new THREE.Vector3(...object.userData.referenceTail), quaternion: object.quaternion.clone(), inverse: object.matrix.clone().invert() });
  });
  function setBone(name, head, tail) {
    const ref = bones.get(name), direction = tail.clone().sub(head), original = ref.tail.clone().sub(ref.head);
    const delta = new THREE.Quaternion().setFromUnitVectors(original.clone().normalize(), direction.clone().normalize());
    ref.object.position.copy(head); ref.object.quaternion.copy(delta).multiply(ref.quaternion); ref.object.scale.set(1, direction.length() / original.length(), 1); ref.object.updateMatrix();
    return ref.object.matrix.clone().multiply(ref.inverse);
  }
  const eyeSource = root.getObjectByName('NaturalAthlete').userData.eyes, eyeGroups = [];
  const ink = new THREE.MeshStandardMaterial({ color: 0x101219, roughness: 1 });
  for (const position of eyeSource) {
    const ref = bones.get('head'), group = new THREE.Group(); group.position.copy(new THREE.Vector3(...position).applyMatrix4(ref.inverse)); group.quaternion.copy(ref.quaternion).invert(); ref.object.add(group);
    const lids = new THREE.Group(); group.add(lids); eyeGroups.push(lids);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf1eadc, roughness: .6 })); sclera.scale.set(.022, .012, .006); sclera.position.z = -.022; lids.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), ink); iris.scale.set(.0074, .009, .002); iris.position.z = -.028; lids.add(iris);
    const sign = Math.sign(position[0]);
    const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(-sign * .025, .034, -.024), new THREE.Vector3(-sign * .006, .038, -.028), new THREE.Vector3(sign * .015, .031, -.025), new THREE.Vector3(sign * .03, .023, -.019)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(brow, 14, .0044, 5, false), ink));
    const upperLid = new THREE.CatmullRomCurve3([new THREE.Vector3(-.021, .003, -.026), new THREE.Vector3(0, .013, -.029), new THREE.Vector3(.021, .003, -.026)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(upperLid, 10, .002, 4, false), ink));
  }
  const head = bones.get('head'), hair = new THREE.MeshStandardMaterial({ color: 0x090b11, roughness: .88, flatShading: true });
  const spikes = [
    [[-.081, 1.985, -.006], [-.255, 2.050, -.020], .067],
    [[-.065, 1.997, -.035], [-.180, 2.145, -.050], .069],
    [[-.035, 2.005, -.025], [-.095, 2.225, -.035], .072],
    [[.025, 2.007, -.022], [.010, 2.195, -.040], .073],
    [[.068, 1.996, -.025], [.135, 2.195, -.028], .068],
    [[.090, 1.969, -.004], [.265, 2.050, -.015], .061],
    [[-.087, 1.968, .025], [-.252, 2.035, .076], .062],
    [[-.049, 2.002, .045], [-.135, 2.177, .092], .068],
    [[.046, 2.003, .045], [.105, 2.180, .100], .068],
    [[.087, 1.973, .025], [.245, 2.040, .083], .058],
    [[-.065, 1.995, -.080], [-.135, 1.936, -.154], .052],
    [[.061, 1.996, -.075], [.128, 1.942, -.148], .051],
  ];
  for (const [baseWorld, tipWorld, radius] of spikes) {
    const base = new THREE.Vector3(...baseWorld).applyMatrix4(head.inverse), tip = new THREE.Vector3(...tipWorld).applyMatrix4(head.inverse);
    const delta = tip.clone().sub(base), spike = new THREE.Mesh(new THREE.ConeGeometry(radius, delta.length(), 5), hair);
    spike.position.copy(base).addScaledVector(delta, .5); spike.quaternion.setFromUnitVectors(up, delta.normalize()); spike.castShadow = true; head.object.add(spike);
  }
  const mouth = new THREE.Group(); mouth.position.copy(new THREE.Vector3(0, 1.805, -.194).applyMatrix4(head.inverse)); mouth.quaternion.copy(head.quaternion).invert(); head.object.add(mouth);
  const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-.022, .003, 0), new THREE.Vector3(0, -.004, -.002), new THREE.Vector3(.022, .003, 0)]);
  mouth.add(new THREE.Mesh(new THREE.TubeGeometry(smile, 10, .0016, 4, false), ink));
  const giBlue = new THREE.MeshStandardMaterial({ color: 0x143a9c, roughness: .96, side: THREE.DoubleSide });
  const torso = bones.get('torso'), garment = new THREE.Group(); garment.position.copy(new THREE.Vector3(0, 1.09, 0).applyMatrix4(torso.inverse)); garment.quaternion.copy(torso.quaternion).invert(); torso.object.add(garment);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(.198, .186, .087, 24, 1, true), giBlue); belt.scale.z = .70; belt.castShadow = true; garment.add(belt);
  const beltTail = new THREE.Mesh(new THREE.BoxGeometry(.055, .185, .014), giBlue); beltTail.position.set(.045, -.105, -.136); beltTail.rotation.z = -.13; garment.add(beltTail);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.074, .012, 8, 24), giBlue); collar.rotation.x = Math.PI / 2; collar.position.set(0, .61, -.015); garment.add(collar);
  const vPoints = [[-.103, 1.67, -.146], [.103, 1.67, -.146], [0, 1.52, -.204]].map(point => new THREE.Vector3(...point).applyMatrix4(torso.inverse));
  const vGeometry = new THREE.BufferGeometry(); vGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vPoints.flatMap(point => point.toArray()), 3)); vGeometry.computeVertexNormals();
  torso.object.add(new THREE.Mesh(vGeometry, giBlue));
  const emblemCanvas = document.createElement('canvas'); emblemCanvas.width = emblemCanvas.height = 128;
  const brush = emblemCanvas.getContext('2d'); brush.fillStyle = '#f5eee4'; brush.beginPath(); brush.arc(64, 64, 56, 0, Math.PI * 2); brush.fill(); brush.strokeStyle = '#111924'; brush.lineWidth = 8; brush.stroke(); brush.fillStyle = '#111924'; brush.font = 'bold 73px sans-serif'; brush.textAlign = 'center'; brush.textBaseline = 'middle'; brush.fillText('悟', 64, 67);
  const emblemAnchor = new THREE.Group(); emblemAnchor.position.copy(new THREE.Vector3(.115, 1.51, -.186).applyMatrix4(torso.inverse)); emblemAnchor.quaternion.copy(torso.quaternion).invert(); torso.object.add(emblemAnchor);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(.05, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(emblemCanvas), transparent: true, side: THREE.DoubleSide })); emblem.rotation.y = Math.PI; emblemAnchor.add(emblem);
  const wristbands = [-1, 1].map(() => { const band = new THREE.Mesh(new THREE.CylinderGeometry(.052, .058, .08, 12), giBlue); band.castShadow = true; root.add(band); return band; });
  const shoes = [-1, 1].map(() => {
    const shoe = new THREE.Group(); root.add(shoe);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), giBlue); upper.scale.set(.10, .047, .156); upper.position.set(0, .056, -.073); shoe.add(upper);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(.194, .017, .314), new THREE.MeshStandardMaterial({ color: 0xb3441a, roughness: .85 })); sole.position.set(0, .013, -.076); shoe.add(sole);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), giBlue); toe.scale.set(.091, .024, .061); toe.position.set(0, .041, -.169); shoe.add(toe);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.084, .105, .23, 14), giBlue); shaft.position.set(0, .195, -.015); shoe.add(shaft);
    const bootTrim = new THREE.Mesh(new THREE.CylinderGeometry(.089, .089, .015, 14), new THREE.MeshStandardMaterial({ color: 0xb3441a, roughness: .9 })); bootTrim.position.set(0, .303, -.015); shoe.add(bootTrim);
    for (let lace = 0; lace < 3; lace++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(.082, .0025, .006), new THREE.MeshStandardMaterial({ color: 0xeadfbe, roughness: 1 })); strip.position.set(0, .098 - lace * .006, -.096 - lace * .021); shoe.add(strip);
    }
    shoe.traverse(object => { if (object.isMesh) object.castShadow = true; });
    return shoe;
  });
  let lastPose = null;
  function fingers(side, handTransform, amount) {
    const refHand = bones.get(`hand.${side}`), handRotation = refHand.object.quaternion.clone().multiply(refHand.quaternion.clone().invert());
    for (let finger = 1; finger <= 5; finger++) {
      let head = bones.get(`finger${finger}-1.${side}`).head.clone().applyMatrix4(handTransform), angle = 0;
      for (let segment = 1; segment <= 3; segment++) {
        const name = `finger${finger}-${segment}.${side}`, ref = bones.get(name), length = ref.tail.distanceTo(ref.head);
        angle += [0, .73, 1.03, .83][segment] * (finger === 1 ? .6 : 1) * (.035 + amount * .965);
        const axis = finger === 1 ? new THREE.Vector3(0, 0, side === 'L' ? -1 : 1) : new THREE.Vector3(1, 0, 0);
        const direction = ref.tail.clone().sub(ref.head).normalize().applyQuaternion(handRotation).applyAxisAngle(axis, angle);
        const tail = head.clone().addScaledVector(direction, length); setBone(name, head, tail); head = tail;
      }
    }
  }
  function breathe(now) {
    const breath = Math.sin(now / 1000 * 1.65), t = now / 1000 % 4.7;
    bones.get('torso').object.scale.z = 1 + breath * .003;
    eyeGroups.forEach(eye => { eye.scale.y = t > 4.46 && t < 4.60 ? .15 : 1; });
  }
  function apply(pose, now = performance.now()) {
    lastPose = pose; root.position.set(...pose.root); root.rotation.y = pose.yaw;
    const hips = new THREE.Vector3(...pose.hips), shoulders = new THREE.Vector3(...pose.shoulders);
    const torsoMatrix = setBone('torso', hips, shoulders);
    setBone('pelvis', hips, hips.clone().add(up.clone().multiplyScalar(bones.get('pelvis').head.distanceTo(bones.get('pelvis').tail))));
    const neckRef = bones.get('neck'), neckHead = neckRef.head.clone().applyMatrix4(torsoMatrix), neckTail = neckRef.tail.clone().applyMatrix4(torsoMatrix); setBone('neck', neckHead, neckTail);
    const headRef = bones.get('head'), headDirection = headRef.tail.clone().sub(headRef.head).applyAxisAngle(new THREE.Vector3(1, 0, 0), -pose.pitch * .40); setBone('head', neckTail, neckTail.clone().add(headDirection));
    for (let i = 0; i < 2; i++) {
      const side = i ? 'L' : 'R', sign = i ? 1 : -1, shoulder = pose.shoulderJoints[i], wrist = pose.wristJoints[i], hip = pose.hipJoints[i], ankle = pose.ankles[i];
      const elbow = solveJoint(shoulder, wrist, BODY.upperArm, BODY.lowerArm, [sign * .2, 0, 1]), knee = solveJoint(hip, ankle, BODY.upperLeg, BODY.lowerLeg, [0, 0, -1]);
      setBone(`arm.${side}`, new THREE.Vector3(...shoulder), new THREE.Vector3(...elbow)); setBone(`forearm.${side}`, new THREE.Vector3(...elbow), new THREE.Vector3(...wrist));
      const handRef = bones.get(`hand.${side}`), handHead = new THREE.Vector3(...wrist);
      const handTail = handHead.clone().add(new THREE.Vector3(0, -handRef.head.distanceTo(handRef.tail), 0));
      handTail.lerp(new THREE.Vector3(...pose.hands[i]).add(new THREE.Vector3(0, .008, 0)), pose.gripAmount);
      const handTransform = setBone(`hand.${side}`, handHead, handTail); fingers(side, handTransform, pose.gripAmount);
      wristbands[i].position.copy(new THREE.Vector3(...wrist).lerp(new THREE.Vector3(...elbow), .13)); wristbands[i].quaternion.setFromUnitVectors(up, new THREE.Vector3(...elbow).sub(new THREE.Vector3(...wrist)).normalize());
      setBone(`thigh.${side}`, new THREE.Vector3(...hip), new THREE.Vector3(...knee)); setBone(`calf.${side}`, new THREE.Vector3(...knee), new THREE.Vector3(...ankle));
      const foot = bones.get(`foot.${side}`), footHead = new THREE.Vector3(...ankle), direction = foot.tail.clone().sub(foot.head); direction.x = 0; setBone(`foot.${side}`, footHead, footHead.clone().add(direction));
      shoes[i].position.set(ankle[0], 0, ankle[2]);
    }
    breathe(now); root.updateMatrixWorld(true);
  }
  return { root, apply, breathe };
}

