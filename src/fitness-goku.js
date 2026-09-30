import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { BODY, solveJoint } from './fitness-motion.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/goku-itch/Goku_animation.fbx`;
const MODEL_SCALE = 0.01;

const vector = values => new THREE.Vector3(...values);
const between = (a, b, t) => a.clone().lerp(b, t);

export async function createAthlete() {
  const model = await new FBXLoader().loadAsync(MODEL_URL), root = new THREE.Group();
  root.name = 'DeadliftAthlete';
  root.userData.design = 'estudio-masluz-goku-rig-v1';
  model.rotation.y = Math.PI;
  root.add(model);
  root.updateMatrixWorld(true);

  const bones = new Map();
  model.traverse(object => {
    if (object.isBone) bones.set(object.name, object);
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        material.side = THREE.DoubleSide;
      }
    }
  });

  const childOf = {
    rootx: 'spine_01x', spine_01x: 'spine_02x', spine_02x: 'spine_03x', spine_03x: 'neckx',
    neckx: 'headx', headx: 'headx',
    shoulderl: 'arm_stretchl', arm_stretchl: 'forearm_stretchl', forearm_stretchl: 'handl', handl: 'handl',
    shoulderr: 'arm_stretchr', arm_stretchr: 'forearm_stretchr', forearm_stretchr: 'handr', handr: 'handr',
    thigh_stretchl: 'leg_stretchl', leg_stretchl: 'footl', footl: 'toes_01l', toes_01l: 'toes_01l',
    thigh_stretchr: 'leg_stretchr', leg_stretchr: 'footr', footr: 'toes_01r', toes_01r: 'toes_01r',
  };
  const refs = new Map();
  for (const [name, bone] of bones) {
    if (!childOf[name]) continue;
    const head = bone.getWorldPosition(new THREE.Vector3());
    const next = bones.get(childOf[name]);
    const tail = next === bone ? head.clone().add(new THREE.Vector3(0, name.startsWith('hand') ? -10 : 10, name.startsWith('toes') ? -10 : 0)) : next.getWorldPosition(new THREE.Vector3());
    refs.set(name, { bone, direction: tail.sub(head).normalize(), quaternion: bone.getWorldQuaternion(new THREE.Quaternion()) });
  }
  function aim(name, head, tail) {
    const ref = refs.get(name);
    if (!ref) return;
    const direction = tail.clone().sub(head);
    if (direction.lengthSq() < 1e-8) return;
    const turn = new THREE.Quaternion().setFromUnitVectors(ref.direction, direction.normalize());
    ref.bone.parent.updateMatrixWorld(true);
    const parentQuaternion = ref.bone.parent.getWorldQuaternion(new THREE.Quaternion());
    ref.bone.quaternion.copy(parentQuaternion.invert().multiply(turn).multiply(ref.quaternion));
    if (name === 'rootx') {
      ref.bone.position.copy(ref.bone.parent.worldToLocal(head.clone().multiplyScalar(1 / MODEL_SCALE)));
    }
    ref.bone.updateMatrixWorld(true);
  }
  function apply(pose) {
    root.position.set(0, 0, 0); root.rotation.y = 0;
    model.scale.setScalar(1);
    root.updateMatrixWorld(true);
    const hips = vector(pose.hips), shoulders = vector(pose.shoulders), torso = shoulders.clone().sub(hips).normalize();
    const spine1 = between(hips, shoulders, .25), spine2 = between(hips, shoulders, .55), spine3 = between(hips, shoulders, .88);
    const neck = shoulders.clone().addScaledVector(torso, .035), head = neck.clone().addScaledVector(torso, .105);
    aim('rootx', hips, spine1);
    aim('spine_01x', spine1, spine2);
    aim('spine_02x', spine2, spine3);
    aim('spine_03x', spine3, neck);
    aim('neckx', neck, head);
    aim('headx', head, head.clone().addScaledVector(torso, .13));
    for (const [side, i] of [['l', 0], ['r', 1]]) {
      const sign = i === 0 ? -1 : 1;
      const shoulderJoint = vector(pose.shoulderJoints[i]), shoulderBase = shoulders.clone().add(new THREE.Vector3(sign * .065, -.015, 0));
      const wrist = vector(pose.wristJoints[i]), elbow = vector(solveJoint(pose.shoulderJoints[i], pose.wristJoints[i], BODY.upperArm, BODY.lowerArm, [sign * .15, 0, 1]));
      const hand = vector(pose.hands[i]);
      aim(`shoulder${side}`, shoulderBase, shoulderJoint);
      aim(`arm_stretch${side}`, shoulderJoint, elbow);
      aim(`forearm_stretch${side}`, elbow, wrist);
      aim(`hand${side}`, wrist, hand.distanceToSquared(wrist) > .0025 ? hand : wrist.clone().add(new THREE.Vector3(0, -.09, 0)));
      const hip = vector(pose.hipJoints[i]), ankle = vector(pose.ankles[i]);
      const knee = vector(solveJoint(pose.hipJoints[i], pose.ankles[i], BODY.upperLeg, BODY.lowerLeg, [0, 0, -1]));
      aim(`thigh_stretch${side}`, hip, knee);
      aim(`leg_stretch${side}`, knee, ankle);
      const toe = ankle.clone().add(new THREE.Vector3(0, -.04, -.16));
      aim(`foot${side}`, ankle, toe);
      aim(`toes_01${side}`, toe, toe.clone().add(new THREE.Vector3(0, 0, -.09)));
    }
    model.scale.setScalar(MODEL_SCALE);
    root.position.set(...pose.root);
    root.rotation.y = pose.yaw;
    root.updateMatrixWorld(true);
  }
  return { root, apply, breathe() {} };
}
