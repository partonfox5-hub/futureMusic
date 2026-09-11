import * as THREE from 'three';

// CC3 Enhance-Eyes stand-in: tiny Head-parented cards. The eyeball keeps
// rotating on L_Eye/R_Eye; these stay in the socket. No new GLB morphs.
const V = () => new THREE.Vector3();

function ribbon(w, h, segs=8){
  const g = new THREE.PlaneGeometry(w, h, segs, 1);
  const pos = g.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, -0.010*x*x/Math.max(w*w,1e-6) + y*y*0.15);
  }
  g.computeVertexNormals();
  return g;
}

function occMat(){
  return new THREE.ShaderMaterial({
    name: 'Std_EyeOcclusion',
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    uniforms: { uBlink: {value: 0}, uGain: {value: 0.42} },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uBlink, uGain; varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.0-1.0;
        float r = length(p*vec2(1.0,1.18+uBlink*0.55));
        // Open iris window; darken only the lid contact ring.
        float ring = smoothstep(0.34, 0.62, r) * (1.0-smoothstep(0.88, 1.08, r));
        float lid = smoothstep(0.12, 0.55, abs(p.y)+uBlink*0.35);
        float a = clamp(uGain*(0.22+0.55*ring+0.28*lid)*(0.55+0.45*uBlink), 0.0, 0.62);
        if(a<0.02) discard;
        gl_FragColor = vec4(0.07, 0.045, 0.04, a);
      }`
  });
}

function tearMat(){
  return new THREE.MeshPhysicalMaterial({
    name: 'Std_TearLine',
    color: 0xc8d8e4,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.85,
    clearcoat: 0.55,
    clearcoatRoughness: 0.08
  });
}

export class EyeFinish {
  constructor(actor){
    this.actor = actor;
    this.ready = false;
    this.sides = [];
    const head = actor.bones?.Head;
    if(!head || !actor.bones.L_Eye || !actor.bones.R_Eye) return;
    this.group = new THREE.Group();
    this.group.name = 'MiraEyeFinish';
    head.add(this.group);
    actor.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
    const L = actor.bones.L_Eye.getWorldPosition(V()).applyMatrix4(inv);
    const R = actor.bones.R_Eye.getWorldPosition(V()).applyMatrix4(inv);
    const across = V().subVectors(R, L);
    if(across.lengthSq()<1e-8) across.set(0,0,0.06);
    const up = V().set(0,1,0);
    const fwd = V().crossVectors(across, up);
    if(fwd.lengthSq()<1e-8) fwd.set(0,0,1);
    fwd.normalize();
    const worldFwd = fwd.clone().transformDirection(head.matrixWorld);
    if(worldFwd.z < 0) fwd.negate();
    const half = across.length()*0.5;
    const basis = new THREE.Matrix4().makeBasis(
      across.clone().normalize(),
      up.clone().crossVectors(fwd, across.clone().normalize()).normalize(),
      fwd
    );
    const quat = new THREE.Quaternion().setFromRotationMatrix(basis);
    for(const side of ['L','R']){
      const center = side==='L'?L:R;
      const hold = new THREE.Group();
      hold.name = 'EyeFinish_'+side;
      hold.position.copy(center);
      hold.quaternion.copy(quat);
      this.group.add(hold);
      const occ = new THREE.Mesh(ribbon(0.036, 0.026, 10), occMat());
      occ.name = 'Mira_EyeOcclusion_'+side;
      occ.position.set(0, 0.001, 0.0115);
      occ.renderOrder = 3;
      occ.frustumCulled = false;
      occ.castShadow = occ.receiveShadow = false;
      hold.add(occ);
      const tear = new THREE.Mesh(ribbon(0.028, 0.0024, 8), tearMat());
      tear.name = 'Mira_TearLine_'+side;
      tear.position.set(0, -0.0108, 0.0132);
      tear.renderOrder = 4;
      tear.frustumCulled = false;
      tear.castShadow = tear.receiveShadow = false;
      hold.add(tear);
      this.sides.push({side, hold, occ, tear, restY: tear.position.y});
    }
    this.ready = true;
    this.setMode(actor.eyeDetail||'advanced');
  }
  setMode(mode){
    this.mode = mode==='classic'?'classic':'advanced';
    if(this.group) this.group.visible = this.mode==='advanced' && !this.actor.headMissing;
  }
  tick(){
    if(!this.ready) return;
    if(this.actor.headMissing){ this.group.visible=false; return; }
    this.group.visible = this.mode==='advanced';
    if(this.mode!=='advanced') return;
    for(const s of this.sides){
      const blink = THREE.MathUtils.clamp(this.actor.cur?.['Eye_Blink_'+s.side]||0, 0, 1);
      s.occ.material.uniforms.uBlink.value = blink;
      s.occ.scale.set(1, 1+blink*0.22, 1);
      s.tear.position.y = s.restY + blink*0.0035;
      s.tear.material.opacity = 0.32 + blink*0.22;
    }
  }
}

export { EyeFinish as EnhanceEyes };
