/**
 * Shared planet engine for Planmorpher (god) and Planetry (orbital RTS).
 * Keep ATMOS, sit(), land height, sea, LOD, and entity scale identical so
 * the two titles can later merge into one god + strategy game.
 */
import * as THREE from "three";

export const ATMOS = 1.22;
/** Thicker lower-sky volume for god-game zoom (Planmorpher). RTS keeps ATMOS. */
export const GOD_ATMOS = 1.78;
export const ENTITY_SCALE = 0.5;
export const SEA_DEFAULT = 0.52;
export const SURFACE_ALT = 1.02;

export const LAND_TEMPLATES = {
  continents: { id: 0, name: "Continents", freq: 2.9, sea: [0.46, 0.56], disp: 0.1, arid: 0, ice: 0, ridges: 0.12 },
  pangea: { id: 1, name: "Pangea", freq: 1.7, sea: [0.4, 0.5], disp: 0.11, arid: 0.08, ice: 0, ridges: 0.18 },
  archipelago: { id: 2, name: "Archipelago", freq: 6.1, sea: [0.54, 0.66], disp: 0.07, arid: 0, ice: 0, ridges: 0.05 },
  mountainous: { id: 3, name: "Mountainous", freq: 3.6, sea: [0.47, 0.55], disp: 0.19, arid: 0.05, ice: 0.22, ridges: 1 },
  arid: { id: 4, name: "Arid desert", freq: 2.5, sea: [0.58, 0.72], disp: 0.08, arid: 1, ice: 0, ridges: 0.12 },
  arctic: { id: 5, name: "Arctic", freq: 2.2, sea: [0.5, 0.62], disp: 0.09, arid: 0, ice: 1, ridges: 0.28 },
};

export const BUILD_AGES = [
  { id: "paleo", name: "Paleolithic", wood: 3, stone: 0, food: 0, wall: 0x8a6a44, roof: 0x5a3a22, scale: 0.82 },
  { id: "neo", name: "Neolithic", wood: 8, stone: 2, food: 2, wall: 0xc4b48a, roof: 0x6a4a28, scale: 1 },
  { id: "bronze", name: "Bronze", wood: 14, stone: 8, food: 4, wall: 0xb08a4a, roof: 0x7a4a18, scale: 1.12 },
  { id: "iron", name: "Iron", wood: 20, stone: 16, food: 6, wall: 0x6a6e74, roof: 0x3a3c42, scale: 1.22 },
  { id: "medieval", name: "Medieval", wood: 30, stone: 24, food: 10, wall: 0x8a7a62, roof: 0x6a2424, scale: 1.38 },
];

export const FORMS = [
  { id: "fearsome", name: "Fearsome", hint: "Creatures scream and flee when you walk their world." },
  { id: "divine", name: "Divine", hint: "They flock to you and speak in awe." },
  { id: "inspire", name: "Inspiring", hint: "A glance, then sixty heartbeats of faster gather and war." },
];

const _up = new THREE.Vector3(0, 1, 0);
const _local = new THREE.Vector3();

export function fract(x) {
  return x - Math.floor(x);
}
export function hash3(x, y, z, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed) * 43758.5453);
}
export function noise3(x, y, z, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const n000 = hash3(ix, iy, iz, seed);
  const n100 = hash3(ix + 1, iy, iz, seed);
  const n010 = hash3(ix, iy + 1, iz, seed);
  const n110 = hash3(ix + 1, iy + 1, iz, seed);
  const n001 = hash3(ix, iy, iz + 1, seed);
  const n101 = hash3(ix + 1, iy, iz + 1, seed);
  const n011 = hash3(ix, iy + 1, iz + 1, seed);
  const n111 = hash3(ix + 1, iy + 1, iz + 1, seed);
  const nx00 = n000 + (n100 - n000) * fx;
  const nx10 = n010 + (n110 - n010) * fx;
  const nx01 = n001 + (n101 - n001) * fx;
  const nx11 = n011 + (n111 - n011) * fx;
  const nxy0 = nx00 + (nx10 - nx00) * fy;
  const nxy1 = nx01 + (nx11 - nx01) * fy;
  return nxy0 + (nxy1 - nxy0) * fz;
}
export function fbmN(n, seed, freq = 3.4) {
  let a = 0.5;
  let s = 0;
  let x = n.x * freq;
  let y = n.y * freq;
  let z = n.z * freq;
  for (let i = 0; i < 5; i++) {
    s += a * noise3(x, y, z, seed);
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    a *= 0.5;
  }
  return s;
}
export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1)));
  return t * t * (3 - 2 * t);
}

export function samplePaint(paint, n) {
  const u = (Math.atan2(n.z, n.x) / (Math.PI * 2) + 1) % 1;
  const v = 0.5 - Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) / Math.PI;
  const x = ((Math.floor(u * paint.s) % paint.s) + paint.s) % paint.s;
  const y = ((Math.floor(v * paint.s) % paint.s) + paint.s) % paint.s;
  return paint.data[(y * paint.s + x) * 4] / 255;
}
export function uvFromN(n) {
  return {
    x: (Math.atan2(n.z, n.x) / (Math.PI * 2) + 1) % 1,
    y: 0.5 - Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) / Math.PI,
  };
}
export function makePaint() {
  const s = 64;
  const data = new Uint8Array(s * s * 4);
  for (let i = 0; i < s * s; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, s, s, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return { tex, data, s };
}
export function paintAt(paint, uv, amount, rad = 2) {
  const x = ((Math.floor(uv.x * paint.s) % paint.s) + paint.s) % paint.s;
  const y = ((Math.floor(uv.y * paint.s) % paint.s) + paint.s) % paint.s;
  for (let j = -rad; j <= rad; j++) {
    for (let i = -rad; i <= rad; i++) {
      if (i * i + j * j > rad * rad) continue;
      const xx = (x + i + paint.s) % paint.s;
      const yy = (y + j + paint.s) % paint.s;
      const k = (yy * paint.s + xx) * 4;
      const v = THREE.MathUtils.clamp(paint.data[k] + amount, 0, 255);
      paint.data[k] = paint.data[k + 1] = paint.data[k + 2] = v;
    }
  }
  paint.tex.needsUpdate = true;
}

export function pickTemplate(rand = Math.random) {
  const keys = Object.keys(LAND_TEMPLATES);
  return LAND_TEMPLATES[keys[Math.floor(rand() * keys.length)]];
}
export function rollSea(tpl, rand = Math.random) {
  return tpl.sea[0] + rand() * (tpl.sea[1] - tpl.sea[0]);
}

export function landH(n, world) {
  const seed = world.seed;
  const freq = world.freq || 3.4;
  const ridges = world.ridges || 0;
  const tpl = world.tpl || 0;
  let h = fbmN(n, seed, freq);
  const ridge = 1 - Math.abs(2 * fbmN(n, seed + 9.1, freq * 1.65) - 1);
  h = h * (1 - ridges) + (0.45 * h + 0.55 * ridge) * ridges;
  const c1 = fbmN(n, seed, 1.35);
  const c2 = fbmN({ x: n.x + 4.2 / 1.55, y: n.y, z: n.z }, seed, 1.55);
  const maskCont = Math.max(smoothstep(0.44, 0.6, c1), smoothstep(0.48, 0.64, c2));
  const maskPang = smoothstep(-0.12, 0.38, n.x + fbmN(n, seed, 1.05) * 0.28);
  const maskArch = smoothstep(0.56, 0.7, fbmN(n, seed, freq + 1.8));
  const maskMtn = maskCont * 0.7 + maskPang * 0.3;
  const maskArid = maskCont * 0.78 + maskArch * 0.22;
  const maskIce = maskCont * 0.45 + n.y * n.y * 0.55;
  let mask = maskCont;
  if (tpl < 0.5) mask = maskCont;
  else if (tpl < 1.5) mask = maskPang;
  else if (tpl < 2.5) mask = maskArch;
  else if (tpl < 3.5) mask = maskMtn;
  else if (tpl < 4.5) mask = maskArid;
  else mask = maskIce;
  return h * 0.32 + h * 0.68 * mask;
}

export function heightOf(world, n) {
  const paint = world.paint ? (samplePaint(world.paint, n) - 0.5) * 0.56 : 0;
  return landH(n, world) + paint;
}
export function seaOf(world) {
  return world.seaLevel != null ? world.seaLevel : SEA_DEFAULT;
}
export function isLand(world, n) {
  if ((world.uni?.uLand?.value ?? 1) < 0.25) return false;
  return heightOf(world, n) > seaOf(world);
}
export function isOcean(world, n) {
  return !isLand(world, n);
}

/**
 * Parent-aware radial sit. If the mesh is already on planet.group, write LOCAL
 * coordinates. Writing world coords then parenting double-transforms (flags in space).
 */
export function sit(mesh, planet, n, alt = 1) {
  _local.copy(n).multiplyScalar(planet.radius * alt);
  if (mesh.parent === planet.group) mesh.position.copy(_local);
  else mesh.position.copy(planet.group.position).add(_local);
  if (!mesh.isSprite) mesh.quaternion.setFromUnitVectors(_up, n);
}

export function atmosR(planet, mul = ATMOS) {
  return planet.radius * mul;
}

export function waterAlt(world) {
  const disp = world.uni?.uDisp?.value ?? 0.1;
  const sea = world.seaLevel != null ? world.seaLevel : SEA_DEFAULT;
  const land = world.uni?.uLand?.value ?? 1;
  return 1 + (sea * 2 - 1) * disp * land * 0.95;
}

export function worldContaining(worlds, pos, slack = 0.02, mul = ATMOS) {
  let best = null;
  let bd = 1e9;
  for (const w of worlds) {
    const d = pos.distanceTo(w.group.position);
    const r = atmosR(w, mul) + slack;
    if (d < r && d < bd) {
      bd = d;
      best = w;
    }
  }
  return best;
}

/** Keep the player between the crust and the atmosphere ceiling. */
export function confineToAtmos(rig, headWorld, planet, mul = ATMOS) {
  const c = planet.group.position;
  const dx = headWorld.x - c.x;
  const dy = headWorld.y - c.y;
  const dz = headWorld.z - c.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return;
  const rMax = planet.radius * mul * 0.985;
  const rMin = planet.radius * 1.09;
  let adj = 0;
  if (len > rMax) adj = rMax - len;
  else if (len < rMin) adj = rMin - len;
  if (!adj) return;
  rig.position.x += (dx / len) * adj;
  rig.position.y += (dy / len) * adj;
  rig.position.z += (dz / len) * adj;
}

export function ejectNearPlanet(rig, planet, headWorld) {
  const c = planet.group.position;
  let nx = headWorld.x - c.x;
  let ny = headWorld.y - c.y;
  let nz = headWorld.z - c.z;
  let len = Math.hypot(nx, ny, nz);
  if (len < 1e-4) {
    nx = 0;
    ny = 1;
    nz = 0;
    len = 1;
  }
  const r = planet.radius * ((planet.atmosMul || ATMOS) + 1.15);
  rig.position.set(c.x + (nx / len) * r, c.y + (ny / len) * r + 0.4, c.z + (nz / len) * r);
}

export function setSkyDormant(sky, dormant) {
  if (!sky) return;
  sky.visible = !dormant;
  if (sky.material) sky.material.uniformsNeedUpdate = !dormant;
}

export function applyTemplateUniforms(uni, tpl, sea) {
  uni.uSea.value = sea;
  uni.uFreq.value = tpl.freq;
  uni.uTpl.value = tpl.id;
  uni.uIce.value = tpl.ice;
  uni.uArid.value = tpl.arid;
  uni.uRidges.value = tpl.ridges;
  uni.uDisp.value = tpl.disp;
}

export function makePeg(color = 0xc8b48a) {
  const g = new THREE.Mesh(
    new THREE.ConeGeometry(0.01, 0.028, 5),
    new THREE.MeshBasicMaterial({ color }),
  );
  g.userData.kind = "peg";
  return g;
}

export function setSurfaceLod(world, on) {
  world.surfaceLod = !!on;
  if (world.uni?.uDetail) world.uni.uDetail.value = on ? 1 : 0;
  if (world.mesh) {
    world.mesh.material.wireframe = false;
    world.mesh.material.transparent = false;
    world.mesh.material.depthWrite = true;
  }
  for (const g of world.groundDetail || []) g.visible = on;
  for (const c of world.life || []) {
    if (c.userData.peg) c.userData.peg.visible = !on;
    c.visible = on;
  }
  for (const t of world.trees || []) {
    if (t.userData.peg) t.userData.peg.visible = !on;
    t.visible = on;
  }
  for (const h of world.huts || []) {
    if (h.userData.peg) h.userData.peg.visible = !on;
    h.visible = on;
  }
  if (world.clouds) {
    if (world.hideCloudsOnLod) world.clouds.visible = !on;
    else world.clouds.visible = true;
  }
  setAtmosMode(world, on);
}

/** Rim atmosphere while outside; thicker haze + gold ring once you are in the lower sky. */
export function setAtmosMode(world, inside) {
  const atmos = world?.atmosShell?.userData?.atmos;
  const ring = world?.atmosShell?.userData?.ring;
  if (atmos?.material?.uniforms?.uInside) atmos.material.uniforms.uInside.value = inside ? 1 : 0;
  if (atmos?.material?.uniforms?.uOp) atmos.material.uniforms.uOp.value = inside ? 0.62 : 0.32;
  if (ring?.material) {
    ring.material.color.setHex(inside ? 0xffe27a : 0x9ee7ff);
    ring.material.opacity = inside ? 0.9 : 0.55;
  }
  const cage = world?.atmosShell?.userData?.cage;
  if (cage?.material) {
    cage.material.color.setHex(inside ? 0xffe27a : 0x9ee7ff);
    cage.material.opacity = inside ? 0.08 : 0.1;
    cage.visible = !inside;
  }
}

const GLSL_NOISE = `
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))+uSeed)*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  float n000=hash(i), n100=hash(i+vec3(1,0,0)), n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
  float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1)), n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y), mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
float landH(vec3 nrm){
  float h = fbm(nrm*uFreq);
  float ridge = 1.0 - abs(2.0*fbm(nrm*uFreq*1.65 + 9.1) - 1.0);
  h = mix(h, 0.45*h + 0.55*ridge, uRidges);
  float c1 = fbm(nrm*1.35);
  float c2 = fbm(nrm*1.55 + vec3(4.2,0.0,0.0));
  float maskCont = max(smoothstep(0.44,0.60,c1), smoothstep(0.48,0.64,c2));
  float maskPang = smoothstep(-0.12, 0.38, nrm.x + fbm(nrm*1.05)*0.28);
  float maskArch = smoothstep(0.56, 0.70, fbm(nrm*(uFreq+1.8)));
  float maskMtn = mix(maskCont, maskPang, 0.3);
  float maskArid = mix(maskCont, maskArch, 0.22);
  float maskIce = mix(maskCont, nrm.y*nrm.y, 0.55);
  float mask = maskCont;
  if(uTpl < 0.5) mask = maskCont;
  else if(uTpl < 1.5) mask = maskPang;
  else if(uTpl < 2.5) mask = maskArch;
  else if(uTpl < 3.5) mask = maskMtn;
  else if(uTpl < 4.5) mask = maskArid;
  else mask = maskIce;
  return mix(h*0.32, h, mask);
}
`;

export const PLANET_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
uniform float uDisp; uniform float uSeed; uniform sampler2D uPaint; uniform float uLand;
uniform float uFreq; uniform float uTpl; uniform float uRidges;
${GLSL_NOISE}
void main(){
  vUv = uv;
  vec3 nrm = normalize(position);
  float h = landH(nrm);
  float paint = texture2D(uPaint, uv).r * 2.0 - 1.0;
  float disp = (h*2.0-1.0)*uDisp*uLand + paint*0.28*uLand;
  vec3 pos = nrm * (1.0 + disp);
  vN = normalMatrix * nrm;
  vP = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}
`;

export const PLANET_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
uniform float uAge; uniform float uMolten; uniform vec3 uVeg; uniform vec3 uOcean;
uniform float uLand; uniform float uStorm; uniform float uSeed;
uniform float uSea; uniform float uFreq; uniform float uTpl; uniform float uRidges;
uniform float uIce; uniform float uArid; uniform float uDetail; uniform float uShellWater;
uniform sampler2D uPaint;
${GLSL_NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 pn = normalize(vP);
  float paint = texture2D(uPaint, vUv).r * 2.0 - 1.0;
  float h = landH(pn) + paint * 0.28;
  float sea = uSea;
  float landMask = smoothstep(sea, sea+0.07, h) * uLand;
  vec3 lava = mix(vec3(0.62,0.09,0.01), vec3(1.0,0.48,0.07), pow(max(h,0.08),0.55));
  lava += vec3(1.0,0.82,0.25)*pow(max(0.0, noise(pn*18.0)-0.52),1.8)*2.4;
  lava += vec3(1.0,0.4,0.05)*pow(max(0.0, noise(pn*7.0)-0.42), 1.2);
  vec3 rock = mix(vec3(0.22,0.18,0.16), vec3(0.42,0.34,0.28), h);
  vec3 sand = vec3(0.72,0.58,0.32);
  vec3 ice = vec3(0.86,0.92,0.96);
  vec3 dirt = mix(vec3(0.22,0.18,0.12), uVeg, smoothstep(0.55,0.78,h));
  dirt = mix(dirt, sand, uArid * (1.0 - smoothstep(0.7, 0.92, h)));
  dirt = mix(dirt, ice, uIce * smoothstep(0.55, 0.9, abs(pn.y)));
  if(uDetail > 0.5){
    float grit = noise(pn*42.0);
    dirt *= 0.88 + grit*0.22;
    rock *= 0.9 + grit*0.18;
    float blade = step(0.62, noise(pn*70.0)) * (1.0-uArid) * (1.0-uIce);
    dirt = mix(dirt, uVeg*1.15, blade*0.35);
  }
  vec3 wet = mix(rock * 0.45, vec3(0.12,0.18,0.16), 0.35);
  wet = mix(wet, sand * 0.55, uArid * 0.4);
  vec3 crust = mix(wet, dirt, landMask);
  vec3 ocean = mix(uOcean*0.45, uOcean, h);
  ocean = mix(ocean, vec3(0.55,0.72,0.82), uIce*0.55);
  vec3 cool = mix(rock, mix(ocean, dirt, landMask), uLand);
  if(uShellWater > 0.5) cool = mix(rock, crust, uLand);
  vec3 col = mix(lava, cool, 1.0-uMolten);
  float ndl = max(0.16, dot(n, normalize(vec3(0.4,0.7,0.3))));
  col *= mix(1.0, ndl, 1.0 - uMolten * 0.92) * (1.0 + uStorm*0.15);
  col += lava * uMolten * 1.15;
  float spec = pow(max(0.0, dot(reflect(normalize(vec3(-0.3,-0.5,-0.2)), n), vec3(0,0,1))), 24.0) * (1.0-landMask) * uLand * (1.0-uShellWater);
  col += spec * uOcean * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const CLOUD_VERT = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
export const CLOUD_FRAG = `
varying vec3 vP; uniform float uTime; uniform float uAlpha; uniform float uSeed; uniform float uStorm;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))+uSeed)*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
}
void main(){
  vec3 p = normalize(vP)*3.2 + vec3(uTime*0.07, 0.0, uTime*0.04);
  float n = noise(p)*0.6 + noise(p*2.2)*0.4;
  float a = smoothstep(0.42, 0.72, n) * uAlpha * (0.55 + uStorm*0.35);
  if(a<0.04) discard;
  gl_FragColor = vec4(vec3(0.92,0.95,1.0)*(1.0-uStorm*0.25), a);
}
`;

export function planetUniforms(seed, veg, ocean, paintTex, tpl, sea) {
  return {
    uAge: { value: 0 },
    uMolten: { value: 1 },
    uLand: { value: 0 },
    uDisp: { value: tpl.disp },
    uSeed: { value: seed },
    uStorm: { value: 0.15 },
    uVeg: { value: veg },
    uOcean: { value: ocean },
    uPaint: { value: paintTex },
    uSea: { value: sea },
    uFreq: { value: tpl.freq },
    uTpl: { value: tpl.id },
    uIce: { value: tpl.ice },
    uArid: { value: tpl.arid },
    uRidges: { value: tpl.ridges },
    uDetail: { value: 0 },
    uShellWater: { value: 0 },
  };
}

export const WATER_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec3 vObj; varying vec2 vUv;
void main(){
  vUv = uv;
  vObj = position;
  vN = normalMatrix * normal;
  vP = (modelViewMatrix * vec4(position,1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;
export const WATER_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec3 vObj; varying vec2 vUv;
uniform vec3 uOcean; uniform float uAlpha; uniform float uTime;
uniform float uSea; uniform float uLand; uniform float uMolten;
uniform float uSeed; uniform float uFreq; uniform float uTpl; uniform float uRidges;
uniform sampler2D uPaint;
${GLSL_NOISE}
void main(){
  if(uMolten > 0.45 || uLand < 0.18) discard;
  vec3 pn = normalize(vObj);
  float paint = texture2D(uPaint, vUv).r * 2.0 - 1.0;
  float h = landH(pn) + paint * 0.28;
  float landMask = smoothstep(uSea, uSea+0.07, h) * uLand;
  if(landMask > 0.42) discard;
  vec3 n = normalize(vN);
  vec3 view = normalize(-vP);
  float fres = pow(1.0 - abs(dot(n, view)), 2.4);
  float wave = 0.5 + 0.5 * sin(vP.x * 6.0 + uTime * 0.7);
  vec3 col = mix(uOcean * 0.5, uOcean * 1.2, fres);
  col += vec3(0.15, 0.25, 0.3) * wave * 0.12;
  float a = uAlpha * (0.42 + fres * 0.5) * (1.0 - landMask);
  if(a < 0.04) discard;
  gl_FragColor = vec4(col, a);
}
`;

function fallbackPaintTex() {
  const t = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

export function makeWaterShell(radius, oceanColor, crustUni) {
  const ocean = crustUni?.uOcean?.value
    || (oceanColor?.clone ? oceanColor.clone() : new THREE.Color(oceanColor || 0x1a4a6a));
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        uOcean: crustUni?.uOcean || { value: ocean },
        uAlpha: { value: 0.88 },
        uTime: { value: 0 },
        uSea: crustUni?.uSea || { value: 0.52 },
        uLand: crustUni?.uLand || { value: 1 },
        uMolten: crustUni?.uMolten || { value: 0 },
        uSeed: crustUni?.uSeed || { value: 1 },
        uFreq: crustUni?.uFreq || { value: 3.4 },
        uTpl: crustUni?.uTpl || { value: 0 },
        uRidges: crustUni?.uRidges || { value: 0 },
        uPaint: crustUni?.uPaint || { value: fallbackPaintTex() },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
    }),
  );
  mesh.scale.setScalar(radius);
  mesh.renderOrder = 1;
  mesh.userData.kind = "water";
  return mesh;
}

export function makePlanetSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform float uT;
        void main(){
          vec3 n=normalize(vP);
          float h = n.y * 0.5 + 0.5;
          vec3 zen = vec3(0.25, 0.48, 0.82);
          vec3 hor = vec3(0.62, 0.78, 0.92);
          vec3 nad = vec3(0.12, 0.22, 0.34);
          vec3 col = mix(nad, hor, smoothstep(0.0, 0.48, h));
          col = mix(col, zen, smoothstep(0.48, 1.0, h));
          col += vec3(0.08,0.06,0.02) * pow(max(0.0, n.x*0.4+n.y*0.2), 3.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
}

export const ATMOS_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vView;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
export const ATMOS_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vView;
uniform vec3 uCol; uniform float uOp; uniform float uInside;
void main(){
  float ndv = abs(dot(normalize(vN), normalize(vView)));
  float fres = pow(1.0 - ndv, 2.15);
  float a = uOp * mix(0.04 + fres * 0.96, 0.22 + fres * 0.7, uInside);
  if(a < 0.02) discard;
  vec3 col = mix(uCol, vec3(0.78, 0.9, 1.0), fres);
  gl_FragColor = vec4(col, a);
}
`;

export function makeAtmosShell(radius, worldRef, mul = ATMOS) {
  const g = new THREE.Group();
  const atmos = new THREE.Mesh(
    new THREE.SphereGeometry(mul, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: {
        uCol: { value: new THREE.Color(0x7ec8ff) },
        uOp: { value: 0.32 },
        uInside: { value: 0 },
      },
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
    }),
  );
  atmos.scale.setScalar(radius);
  atmos.renderOrder = 2;
  atmos.userData.world = worldRef;
  atmos.userData.kind = "atmos";
  g.add(atmos);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(mul, 0.012, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  ring.scale.setScalar(radius);
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = 3;
  g.add(ring);
  const cage = new THREE.Mesh(
    new THREE.SphereGeometry(mul, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.1, wireframe: true, depthWrite: false }),
  );
  cage.scale.setScalar(radius);
  cage.renderOrder = 3;
  g.add(cage);
  g.userData.atmos = atmos;
  g.userData.ring = ring;
  g.userData.cage = cage;
  return g;
}
