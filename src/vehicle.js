import * as THREE from 'three';
import { BODY_COLORS, WHEELS, LIGHT_COLORS, sanitizeConfig, loadCarConfig } from './car-options.js';

// The original homepage hatchback, shared by all three scenes.
export function createRetroCar(initialConfig = loadCarConfig()) {
  const shared = { steel: new THREE.MeshStandardMaterial({ color: 0x778084, roughness: .36, metalness: .87 }), black: new THREE.MeshStandardMaterial({ color: 0x151b1c, roughness: .72, metalness: .2 }) };
  const material = (color, roughness=.5, metalness=.15) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  const neon = (color, strength=2) => new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:strength,roughness:.35,toneMapped:false});
  function mesh(geo,mat,pos,parent,cast=true) { const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m; }
  const box=(w,h,d,mat,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),mat,[x,y,z],parent);
  const cylinder=(top,bottom,h,mat,x,y,z,parent,segments=24)=>mesh(new THREE.CylinderGeometry(top,bottom,h,segments),mat,[x,y,z],parent);
  function tube(a,b,r,mat,parent) { const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start); const m=cylinder(r,r,delta.length(),mat,0,0,0,parent,10); m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m; }
  function sign(text,subtext,color,w,h,pos,parent) { const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#162120';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#657667';ctx.strokeRect(8,8,496,112);ctx.fillStyle='#'+new THREE.Color(color).getHexString();ctx.font='bold 72px monospace';ctx.textAlign='center';ctx.fillText(text,256,92);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.65}),pos,parent,false); }
  const car = new THREE.Group(); car.name = 'AfterhoursRetroHatchback';
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
  const tireMat = material(0x111615,.92,.02);
  const wheelParts=[];
  for(const x of [-1.27,1.22]) for(const z of [-.9,.9]) {
    const pivot=new THREE.Group();pivot.position.set(x,.48,z);car.add(pivot);
    const rotor=new THREE.Group();rotor.rotation.x=Math.PI/2;pivot.add(rotor);
    cylinder(.47,.47,.28,tireMat,0,0,0,rotor,40);
    for(let i=0;i<20;i++){const a=i*Math.PI/10;const tread=box(.03,.29,.025,material(0x222623),Math.sin(a)*.463,0,Math.cos(a)*.463,rotor);tread.rotation.y=a;}
    const rims=new THREE.Group();rotor.add(rims);wheelParts.push({pivot,rotor,rims,front:x>0,side:z<0?-.155:.155});
  }
  const beam=new THREE.SpotLight(0xffefca,22,13,.4,.7,1.5);beam.position.set(2.1,.9,0);beam.target.position.set(10,.15,0);car.add(beam,beam.target);headlights.push(beam);
  let config={};
  function rebuildRims(style) {
    for(const wheel of wheelParts){
      const geometries=new Set(),materials=new Set();wheel.rims.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&o.material!==shared.steel&&o.material!==shared.black)materials.add(o.material);});
      wheel.rims.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      const side=wheel.side,alloy=material(style.hex,.28,.92);
      cylinder(.33,.33,.028,alloy,0,side,0,wheel.rims,32);
      if(style.spokes){
        cylinder(.25,.25,.04,shared.black,0,side*1.13,0,wheel.rims,32);
        for(let i=0;i<style.spokes;i++){const a=i*Math.PI*2/style.spokes;tube([Math.sin(a)*.07,side*1.21,Math.cos(a)*.07],[Math.sin(a)*.27,side*1.21,Math.cos(a)*.27],style.spokes===5?.055:.03,alloy,wheel.rims);}
      }else{
        cylinder(.28,.28,.05,alloy,0,side*1.13,0,wheel.rims,48);
        for(let i=0;i<10;i++){const a=i*Math.PI/5;cylinder(.026,.026,.007,shared.black,Math.sin(a)*.225,side*1.34,Math.cos(a)*.225,wheel.rims,12);}
      }
      cylinder(.075,.075,.06,shared.steel,0,side*1.42,0,wheel.rims,20);
    }
  }
  function setConfig(value){
    const next=sanitizeConfig(value);paint.color.set(BODY_COLORS.find(c=>c.id===next.body).hex);
    const light=LIGHT_COLORS.find(c=>c.id===next.lights).hex;
    headlights.forEach(l=>{if(l.isLight)l.color.set(light);else{l.material.color.set(0x000000);l.material.emissive.set(light);l.material.emissiveIntensity=.95;}});
    if(config.wheels!==next.wheels)rebuildRims(WHEELS.find(c=>c.id===next.wheels));config=next;
    car.userData.config={...config};
  }
  setConfig(initialConfig);
  return {group:car,headlights,tireMat,setConfig,
    animateWheels(distance,steering=0){for(const wheel of wheelParts){wheel.rotor.rotation.y-=distance/.47;wheel.pivot.rotation.y=wheel.front?-steering:0;}}
  };
}
