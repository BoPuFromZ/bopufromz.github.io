import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { BODY, solveJoint } from './fitness-motion.js';

let source;
export async function createAthlete() {
  source ||= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/fitness-athlete.glb?v=0c68e0e7`).catch(error => { source = null; throw error; });
  const gltf = await source, root = clone(gltf.scene); root.name = 'DeadliftAthlete'; root.userData.design = 'natural-athlete-v3';
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
  for (const position of eyeSource) {
    const ref = bones.get('head'), group = new THREE.Group(); group.position.copy(new THREE.Vector3(...position).applyMatrix4(ref.inverse)); group.quaternion.copy(ref.quaternion).invert(); ref.object.add(group);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(.017, 24, 16), new THREE.MeshStandardMaterial({ color: 0xdad6c6, roughness: .28 })); group.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0x4a382b, roughness: .35 })); iris.scale.set(.0075, .0075, .004); iris.position.z = -.016; group.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.0032, 12, 8), new THREE.MeshStandardMaterial({ color: 0x171c18, roughness: .2 })); pupil.position.z = -.0195; group.add(pupil); eyeGroups.push(group);
  }
  let lastPose = null;
  function fingers(side, handTransform, amount) {
    const refHand = bones.get(`hand.${side}`), handRotation = refHand.object.quaternion.clone().multiply(refHand.quaternion.clone().invert());
    for (let finger = 1; finger <= 5; finger++) {
      let head = bones.get(`finger${finger}-1.${side}`).head.clone().applyMatrix4(handTransform), angle = 0;
      for (let segment = 1; segment <= 3; segment++) {
        const name = `finger${finger}-${segment}.${side}`, ref = bones.get(name), length = ref.tail.distanceTo(ref.head);
        angle += [0, .73, 1.03, .83][segment] * (finger === 1 ? .6 : 1) * (.12 + amount * .88);
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
      const handRef = bones.get(`hand.${side}`), handHead = new THREE.Vector3(...wrist), handTail = handHead.clone().add(new THREE.Vector3(0, -handRef.head.distanceTo(handRef.tail), 0));
      const handTransform = setBone(`hand.${side}`, handHead, handTail); fingers(side, handTransform, pose.gripAmount);
      setBone(`thigh.${side}`, new THREE.Vector3(...hip), new THREE.Vector3(...knee)); setBone(`calf.${side}`, new THREE.Vector3(...knee), new THREE.Vector3(...ankle));
      const foot = bones.get(`foot.${side}`), footHead = new THREE.Vector3(...ankle), direction = foot.tail.clone().sub(foot.head); direction.x = 0; setBone(`foot.${side}`, footHead, footHead.clone().add(direction));
    }
    breathe(now); root.updateMatrixWorld(true);
  }
  return { root, apply, breathe };
}

