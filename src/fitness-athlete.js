import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { BODY, solveJoint } from './fitness-motion.js';

let source;
export async function createAthlete() {
  source ||= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/fitness-athlete.glb?v=f55e029c488e`).catch(error => { source = null; throw error; });
  const gltf = await source, root = clone(gltf.scene); root.name = 'DeadliftAthlete'; root.userData.design = 'natural-athlete-v4';
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
  const browMaterial = new THREE.MeshStandardMaterial({ color: 0x211e1c, roughness: 1 });
  for (const position of eyeSource) {
    const ref = bones.get('head'), group = new THREE.Group(); group.position.copy(new THREE.Vector3(...position).applyMatrix4(ref.inverse)); group.quaternion.copy(ref.quaternion).invert(); ref.object.add(group);
    const lids = new THREE.Group(); group.add(lids); eyeGroups.push(lids);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd5c9b7, roughness: .48 })); sclera.scale.set(.016, .0068, .006); sclera.position.z = -.014; lids.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0x3b3029, roughness: .42 })); iris.scale.set(.0054, .0054, .002); iris.position.z = -.020; lids.add(iris);
    const sign = Math.sign(position[0]);
    const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(-sign * .023, .026, -.018), new THREE.Vector3(-sign * .006, .030, -.022), new THREE.Vector3(sign * .014, .027, -.020), new THREE.Vector3(sign * .028, .021, -.014)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(brow, 14, .003, 5, false), browMaterial));
    const upperLid = new THREE.CatmullRomCurve3([new THREE.Vector3(-.016, .002, -.019), new THREE.Vector3(0, .008, -.021), new THREE.Vector3(.016, .002, -.019)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(upperLid, 10, .0015, 4, false), browMaterial));
  }
  const shoes = [-1, 1].map(() => {
    const shoe = new THREE.Group(); root.add(shoe);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), new THREE.MeshStandardMaterial({ color: 0x262e32, roughness: .82 })); upper.scale.set(.099, .045, .156); upper.position.set(0, .055, -.073); shoe.add(upper);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(.194, .016, .314), new THREE.MeshStandardMaterial({ color: 0xc5c8ba, roughness: .88 })); sole.position.set(0, .013, -.076); shoe.add(sole);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x3b484b, roughness: .91 })); toe.scale.set(.091, .023, .061); toe.position.set(0, .041, -.169); shoe.add(toe);
    for (let lace = 0; lace < 3; lace++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(.082, .0025, .006), new THREE.MeshStandardMaterial({ color: 0xb0b9ae, roughness: 1 })); strip.position.set(0, .095 - lace * .006, -.096 - lace * .021); shoe.add(strip);
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
      setBone(`thigh.${side}`, new THREE.Vector3(...hip), new THREE.Vector3(...knee)); setBone(`calf.${side}`, new THREE.Vector3(...knee), new THREE.Vector3(...ankle));
      const foot = bones.get(`foot.${side}`), footHead = new THREE.Vector3(...ankle), direction = foot.tail.clone().sub(foot.head); direction.x = 0; setBone(`foot.${side}`, footHead, footHead.clone().add(direction));
      shoes[i].position.set(ankle[0], 0, ankle[2]);
    }
    breathe(now); root.updateMatrixWorld(true);
  }
  return { root, apply, breathe };
}

