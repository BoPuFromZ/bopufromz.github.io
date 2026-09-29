import * as THREE from 'three';
import { getDjPose } from './music-rhythm.js';

export function createDj() {
  const group = new THREE.Group(); group.name = 'selector-dj'; group.position.set(-1.25, .5, -2.45);
  const material = (color, metalness = .1) => new THREE.MeshStandardMaterial({ color, roughness: .6, metalness });
  const skin = material('#dfa37e'), clothing = material('#586176'), black = material('#090b13');
  const mint = material('#d4ee8c'), hair = material('#191c27'), metal = material('#5b6275', .8);
  function mesh(geometry, mat, x, y, z, parent = group) {
    const object = new THREE.Mesh(geometry, mat); object.position.set(x, y, z); parent.add(object); return object;
  }
  function box(w, h, d, mat, x, y, z, parent = group) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent); }
  const torso = new THREE.Group(); torso.name = 'dj-torso'; torso.position.y = .83; group.add(torso);
  const body = mesh(new THREE.CylinderGeometry(.42, .34, .95, 12), clothing, 0, .42, 0, torso); body.scale.z = .7;
  box(.23, .19, .04, new THREE.MeshBasicMaterial({ color: '#d4ee8c', toneMapped: false }), 0, .54, .3, torso);
  const head = new THREE.Group(); head.name = 'dj-head'; head.position.y = 1.24; torso.add(head);
  mesh(new THREE.SphereGeometry(.34, 24, 16), skin, 0, 0, 0, head);
  const cap = mesh(new THREE.SphereGeometry(.355, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, .04, 0, head); cap.rotation.z = -.08;
  box(.5, .045, .35, hair, .05, .14, .3, head);
  for (const x of [-.35, .35]) box(.13, .32, .25, black, x, .01, 0, head);
  mesh(new THREE.TorusGeometry(.36, .05, 8, 24, Math.PI), metal, 0, .03, 0, head);
  for (const x of [-.12, .12]) mesh(new THREE.SphereGeometry(.026, 8, 8), black, x, -.02, .315, head);
  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  function bone(radius, mat) { return mesh(new THREE.CylinderGeometry(radius, radius * .9, 1, 12), mat, 0, 0, 0); }
  function placeBone(object, from, to) {
    direction.copy(to).sub(from); object.scale.y = direction.length();
    object.position.copy(from).add(to).multiplyScalar(.5); object.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  // Two-segment limbs keep hands on the actual deck while the body dances.
  const arms = [-1, 1].map(side => {
    const hand = mesh(new THREE.SphereGeometry(.115, 12, 8), skin, 0, 0, 0); hand.scale.set(1, .55, 1.15);
    hand.name = side < 0 ? 'dj-hand-left' : 'dj-hand-right';
    return { side, upper: bone(.135, clothing), lower: bone(.095, skin), hand, shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), target: new THREE.Vector3(side * 1.09, 1.11, .95), desired: new THREE.Vector3(), bend: new THREE.Vector3() };
  });
  const legs = [-1, 1].map(side => ({ side, upper: bone(.14, black), lower: bone(.12, black), hip: new THREE.Vector3(), knee: new THREE.Vector3(), ankle: new THREE.Vector3(), shoe: box(.34, .18, .55, mint, side * .23, .13, .13) }));
  const smooth = { hipY: .83, hipX: 0, lean: 0, twist: 0, forward: -.05, nod: 0, headTilt: 0, headTurn: 0, shoulderPop: 0, jump: 0 };
  let scratchLeft = true, scratchOffset = 0;
  function update(groove, dt, enabled = true) {
    const pose = getDjPose(groove, enabled), weight = 1 - Math.exp(-Math.min(dt, .1) * 22);
    for (const key of Object.keys(smooth)) smooth[key] += (pose[key] - smooth[key]) * weight;
    torso.position.set(smooth.hipX, smooth.hipY, 0);
    torso.rotation.set(smooth.forward, smooth.twist, -smooth.lean);
    head.rotation.set(smooth.nod, smooth.headTurn, smooth.headTilt);
    head.position.y = 1.24 + smooth.shoulderPop * .35;
    group.updateMatrixWorld(true);
    for (const leg of legs) {
      leg.hip.set(leg.side * .23, 0, 0).applyMatrix4(torso.matrix);
      leg.ankle.set(leg.side * .23, .17 + smooth.jump * .26, .08);
      leg.knee.copy(leg.hip).lerp(leg.ankle, .52); leg.knee.z += .14 + Math.max(0, .83 - smooth.hipY) * .5;
      placeBone(leg.upper, leg.hip, leg.knee); placeBone(leg.lower, leg.knee, leg.ankle);
      leg.shoe.position.y = .13 + smooth.jump * .26; leg.shoe.rotation.x = -smooth.jump * .1;
    }
    for (const arm of arms) {
      const scratchHand = (arm.side < 0) === pose.recordLeft;
      arm.shoulder.set(arm.side * .37, .79 + smooth.shoulderPop, 0).applyMatrix4(torso.matrix);
      if (scratchHand) arm.desired.set(arm.side * 1.09, 1.115, .95 + pose.scratch);
      else arm.desired.set(arm.side * .15 + pose.fader, 1.145, 1.11);
      if (!scratchHand && pose.headphone > .05) {
        const ear = new THREE.Vector3(arm.side * .38, .03, .02).applyMatrix4(head.matrix).applyMatrix4(torso.matrix);
        arm.desired.lerp(ear, pose.headphone);
      }
      if (!scratchHand && pose.hype > .05) {
        const raised = new THREE.Vector3(arm.side * .8, 2.9 + smooth.jump * .2, .05);
        arm.desired.lerp(raised, pose.hype);
      }
      arm.target.lerp(arm.desired, 1 - Math.exp(-Math.min(dt, .1) * 25));
      const reach = new THREE.Vector3().subVectors(arm.target, arm.shoulder), distance = Math.min(reach.length(), 1.495);
      reach.normalize(); arm.hand.position.copy(arm.shoulder).addScaledVector(reach, distance);
      const upperLength = .72, lowerLength = .78;
      const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * Math.max(distance, .01));
      const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
      arm.bend.set(arm.side, -.3, -.3).addScaledVector(reach, -new THREE.Vector3(arm.side, -.3, -.3).dot(reach)).normalize();
      arm.elbow.copy(arm.shoulder).addScaledVector(reach, along).addScaledVector(arm.bend, height);
      placeBone(arm.upper, arm.shoulder, arm.elbow); placeBone(arm.lower, arm.elbow, arm.hand.position);
      arm.hand.rotation.set(scratchHand ? pose.scratch * 1.5 : -pose.hype * .7, 0, scratchHand ? arm.side * .15 : pose.hype * arm.side * .4);
    }
    scratchLeft = pose.recordLeft; scratchOffset += (pose.scratch * 3.5 - scratchOffset) * weight;
    return { scratchLeft, scratchOffset, active: pose.active };
  }
  update(null, 1, false);
  return { group, update };
}
