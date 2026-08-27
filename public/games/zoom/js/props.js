/** Props, 4-direction enemy sprites, spawners. */
import * as THREE from "three";
import { ENEMIES, ENEMY_BY_ID } from "./config.js?v=zm11";
import { sdf3, floorY } from "./map.js?v=zm11";
import { doomSteer, makeRobot } from "./robots.js?v=zm12";
import { hurtFoe } from "./weapons.js?v=zm11";
import { sfx } from "./sfx.js?v=zm11";

const TEX = {};
const loader = new THREE.TextureLoader();

function loadTex(url, sheet) {
  if (TEX[url]) return TEX[url];
  const t = loader.load(url, (tex) => {
    if (sheet) {
      tex.repeat.set(0.25, 0.25);
      tex.offset.set(0, 0.75);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = sheet ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = t.magFilter;
  t.transparent = true;
  if (sheet) {
    t.repeat.set(0.25, 0.25);
    t.offset.set(0, 0.75);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  }
  TEX[url] = t;
  return t;
}

function mat(hex, extra) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72, metalness: 0.08, ...extra });
}

function lit(hex) {
  return new THREE.MeshBasicMaterial({ color: hex });
}

function addGlow(g, y, color, scale) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  s.position.y = y;
  s.scale.set(scale, scale, 1);
  g.add(s);
  return s;
}

function crackOverlay(g, h) {
  const cracks = [];
  const dark = new THREE.MeshBasicMaterial({
    color: 0x1a120c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.04 + i * 0.01, h * (0.28 + i * 0.08), 0.05), dark.clone());
    m.position.set((i % 2 ? 0.18 : -0.16) + i * 0.02, h * (0.25 + i * 0.12), 0.22 + (i % 3) * 0.04);
    m.rotation.z = (i - 2) * 0.22;
    m.visible = false;
    g.add(m);
    cracks.push(m);
  }
  g.userData.cracks = cracks;
  g.userData.statue = true;
  g.userData.hp = 12;
  g.userData.maxHp = 12;
}

function buildStatue(g, kind, add, s) {
  const marble = mat(kind === "statue-angel" ? 0xd8d0c4 : kind === "statue-gargoyle" ? 0x5a584e : kind === "statue-idol" ? 0xc4a060 : kind === "statue-serpent" ? 0x6a7a58 : 0x9a968c);
  const dark = mat(0x3a3832);
  const bronze = mat(0x8a6a30, { metalness: 0.45 });
  if (kind === "statue-knight") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 8), marble), 0, 0.08, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.28), marble), 0, 0.62, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), marble), 0, 1.08, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.24), marble), 0, 1.22, 0.02);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), marble), 0, 1.34, 0.04);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.06), bronze), -0.32, 0.7, 0.06);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), dark), 0.28, 0.72, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.04), dark), 0.28, 1.12, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.12), marble), -0.12, 0.28, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.12), marble), 0.12, 0.28, 0);
  } else if (kind === "statue-angel") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.14, 10), marble), 0, 0.07, 0);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 10), marble), 0, 0.68, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), marble), 0, 1.28, 0);
    const wingL = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.55), marble), -0.38, 1.05, -0.08);
    wingL.rotation.z = 0.45;
    wingL.rotation.y = 0.35;
    const wingR = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.55), marble), 0.38, 1.05, -0.08);
    wingR.rotation.z = -0.45;
    wingR.rotation.y = -0.35;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), marble), -0.28, 1.35, 0).rotation.z = 0.8;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), marble), 0.28, 1.35, 0).rotation.z = -0.8;
  } else if (kind === "statue-gargoyle") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.5), dark), 0, 0.12, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), marble), 0, 0.42, 0.04).scale.set(1.15, 0.7, 1);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.14), marble), -0.18, 0.22, 0.12);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.14), marble), 0.18, 0.22, 0.12);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), marble), 0, 0.72, 0.18);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), marble), -0.1, 0.9, 0.12).rotation.z = 0.4;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), marble), 0.1, 0.9, 0.12).rotation.z = -0.4;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), marble), 0, 0.66, 0.34).rotation.x = 1.2;
    const gwL = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.7), dark), -0.34, 0.62, -0.12);
    gwL.rotation.y = 0.4;
    gwL.rotation.z = 0.35;
    const gwR = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.7), dark), 0.34, 0.62, -0.12);
    gwR.rotation.y = -0.4;
    gwR.rotation.z = -0.35;
  } else if (kind === "statue-idol") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 10), bronze), 0, 0.08, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), marble), 0, 0.48, 0).scale.set(1.15, 0.7, 1);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), marble), 0, 0.95, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.16, 8), bronze), 0, 1.16, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.08), bronze), 0, 1.26, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), marble), -0.32, 0.62, 0.16);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), marble), 0.32, 0.62, 0.16);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), bronze), 0, 0.88, 0.2);
  } else {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.14, 10), marble), 0, 0.07, 0);
    for (let i = 0; i < 5; i++) {
      const coil = add(new THREE.Mesh(new THREE.TorusGeometry(0.22 - i * 0.012, 0.08, 8, 16), marble), 0, 0.22 + i * 0.16, 0);
      coil.rotation.x = Math.PI / 2;
      coil.rotation.z = i * 0.5;
    }
    add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), marble), 0.08, 1.12, 0.18);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), dark), 0.08, 1.22, 0.32).rotation.x = 1.1;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mat(0x201008, { emissive: 0x441800 })), 0.02, 1.16, 0.28);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mat(0x201008, { emissive: 0x441800 })), 0.14, 1.16, 0.28);
  }
  crackOverlay(g, kind === "statue-gargoyle" ? 1.1 : kind === "statue-idol" ? 1.35 : 1.55);
}

export function makeProp(kind, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  const wood = mat(0x6a4424);
  const dark = mat(0x2a2218);
  const iron = mat(0x6a6e74, { metalness: 0.55, roughness: 0.4 });
  const gold = mat(0xc4a050, { metalness: 0.6, roughness: 0.35 });
  const stone = mat(0x7a7870);
  const bone = mat(0xd8d0c0);
  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  if (kind === "torch") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6), wood), 0, 0.45, 0);
    const flame = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lit(0xffcc66)), 0, 0.88, 0);
    flame.userData.flame = true;
    addGlow(g, 0.9, 0xffaa55, 0.85);
    g.userData.lightColor = 0xffaa66;
    g.userData.lightDist = 12;
    g.userData.lightIntensity = 70;
    g.userData.lightY = 1.1;
  } else if (kind === "crate") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), wood), 0, 0.35, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.74), dark), 0, 0.35, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), iron), 0.32, 0.35, 0.32);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), iron), -0.32, 0.35, 0.32);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), iron), 0.32, 0.35, -0.32);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), iron), -0.32, 0.35, -0.32);
  } else if (kind === "barrel") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.8, 12), wood), 0, 0.4, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 12), iron), 0, 0.18, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 12), iron), 0, 0.4, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 12), iron), 0, 0.62, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 8), iron), 0, 0.82, 0);
  } else if (kind === "chest") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 0.55), wood), 0, 0.22, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.55), wood), 0, 0.52, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.58), dark), 0, 0.42, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), gold), 0, 0.4, 0.28);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.08), iron), 0, 0.08, 0.24);
  } else if (kind === "pillar") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.4, 8), stone), 0, 1.7, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 8), stone), 0, 0.1, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 8), stone), 0, 3.35, 0);
  } else if (kind === "bones") {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), bone), 0, 0.18, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 5), bone), 0.12, 0.2, 0.05).rotation.z = 0.8;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 5), bone), -0.1, 0.16, -0.08).rotation.z = -0.5;
  } else if (kind === "crystal") {
    const cmat = mat(0x8844dd, { emissive: 0x331166, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.92 });
    add(new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), cmat), 0, 0.55, 0).scale.set(0.7, 1.6, 0.7);
    add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), cmat), 0.18, 0.35, 0.1).scale.set(0.5, 1.2, 0.5);
    g.userData.lightColor = 0xaa66ff;
    g.userData.lightDist = 6;
    g.userData.lightIntensity = 1.6;
    g.userData.lightY = 0.55;
  } else if (kind === "table") {
    add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.7), wood), 0, 0.72, 0);
    for (const [x, z] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), wood), x, 0.35, z);
    }
  } else if (kind === "chair") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), wood), 0, 0.42, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.07), wood), 0, 0.72, -0.18);
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), wood), x, 0.2, z);
    }
  } else if (kind === "banner") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), wood), 0, 1.3, 0);
    add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), mat(0x8a2028, { side: THREE.DoubleSide })), 0.05, 1.55, 0);
  } else if (kind === "mushroom") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6), mat(0xd8c8a8)), 0, 0.18, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0xc44a3a)), 0, 0.4, 0).scale.y = 0.55;
  } else if (kind === "stalagmite") {
    add(new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.3, 7), stone), 0, 0.65, 0);
  } else if (kind === "altar") {
    add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.7), stone), 0, 0.35, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.85), stone), 0, 0.74, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8), gold), 0, 0.92, 0);
  } else if (kind === "cage") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.5, 10, 1, true), iron), 0, 0.75, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 5, 12), iron), 0, 1.5, 0).rotation.x = Math.PI / 2;
  } else if (kind === "coffin") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 1.8), dark), 0, 0.25, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 1.84), wood), 0, 0.5, 0);
  } else if (kind === "bookshelf") {
    add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.35), wood), 0, 0.9, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.12), mat(0x4a2030)), 0, 1.2, 0.12);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.12), mat(0x2a3048)), 0, 0.5, 0.12);
  } else if (kind === "walllamp") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), iron), 0, 1.35, -0.12);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), dark), 0, 1.5, -0.08);
    const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lit(0xf4f8ff)), 0, 1.38, 0.02);
    bulb.userData.flame = true;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.16), iron), 0, 1.22, 0);
    addGlow(g, 1.38, 0xe8f0ff, 0.9);
    g.userData.lightColor = 0xe8f0ff;
    g.userData.lightDist = 14;
    g.userData.lightIntensity = 90;
    g.userData.lightY = 1.4;
  } else if (kind === "ceilinglight") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.08, 12), iron), 0, 0.04, 0);
    add(new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), lit(0xfff6d8)), 0, 0, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), dark), 0, 0.14, 0);
    addGlow(g, -0.02, 0xfff4cc, 1.15);
    g.userData.lightColor = 0xf4f0e0;
    g.userData.lightDist = 16;
    g.userData.lightIntensity = 110;
    g.userData.lightY = "ceil";
  } else if (kind === "chandelier") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), iron), 0, 0.4, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 16), gold), 0, 0.08, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 12), gold), 0, 0.22, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lit(0xffe8a0)), Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.16, 5), dark), Math.cos(a) * 0.42, 0.12, Math.sin(a) * 0.42);
    }
    addGlow(g, 0.08, 0xffd090, 1.4);
    g.userData.lightColor = 0xffd090;
    g.userData.lightDist = 20;
    g.userData.lightIntensity = 140;
    g.userData.lightY = "hang";
  } else if (kind === "campfire") {
    add(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 10), stone), 0, 0.08, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 6), lit(0xff6620)), 0, 0.3, 0);
    addGlow(g, 0.35, 0xff7722, 1.0);
    g.userData.lightColor = 0xff8844;
    g.userData.lightDist = 12;
    g.userData.lightIntensity = 65;
    g.userData.lightY = 0.45;
  } else if (kind === "anvil") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35), iron), 0, 0.2, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.32), iron), 0, 0.45, 0);
  } else if (kind === "spikes") {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 4), iron), Math.cos(a) * 0.22, 0.22, Math.sin(a) * 0.22);
    }
    g.userData.hazard = 12;
  } else if (kind === "fountain") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.25, 12), stone), 0, 0.12, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), stone), 0, 0.55, 0);
    add(new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), mat(0x3a6aaa, { roughness: 0.2 })), 0, 0.26, 0).rotation.x = -Math.PI / 2;
  } else if (kind && kind.startsWith("statue-")) {
    buildStatue(g, kind, add, s);
  } else {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), stone), 0, 0.2, 0);
  }
  g.scale.setScalar(s);
  g.userData.kind = kind;
  const PHYS = {
    crate: { mass: 6, r: 0.42, h: 0.7 },
    barrel: { mass: 7, r: 0.36, h: 0.82 },
    chest: { mass: 10, r: 0.48, h: 0.55 },
    table: { mass: 14, r: 0.62, h: 0.8 },
    chair: { mass: 4, r: 0.28, h: 0.9 },
    coffin: { mass: 16, r: 0.55, h: 0.55 },
    cage: { mass: 11, r: 0.5, h: 1.5 },
    anvil: { mass: 22, r: 0.4, h: 0.55 },
    bones: { mass: 3, r: 0.28, h: 0.4 },
    bookshelf: { mass: 18, r: 0.55, h: 1.8 },
    campfire: { mass: 5, r: 0.4, h: 0.4 },
    mushroom: { mass: 2, r: 0.22, h: 0.5 },
    crystal: { mass: 8, r: 0.3, h: 0.9 },
    fountain: { mass: 20, r: 0.7, h: 0.7 },
    altar: { mass: 24, r: 0.7, h: 0.9 },
  };
  const spec = PHYS[kind];
  if (spec) {
    g.userData.phys = {
      mass: spec.mass,
      r: spec.r * s,
      h: spec.h * s,
      vx: 0,
      vy: 0,
      vz: 0,
      held: false,
    };
  }
  return g;
}

export function stepSheet(sprite, dt, moving, dx, dz) {
  const map = sprite.material?.map;
  const u = sprite.userData;
  if (!map || !u?.sheet) return;
  u.animT = (u.animT || 0) + dt * (moving ? 8 : 2.2);
  const frame = Math.floor(u.animT) % 4;
  let row = 2;
  if (Math.abs(dx) > Math.abs(dz)) row = dx < 0 ? 1 : 2;
  else row = dz > 0 ? 0 : 3;
  map.repeat.set(0.25, 0.25);
  map.offset.set(frame * 0.25, 0.75 - row * 0.25);
}

export function makeEnemy(def) {
  const base = loadTex(def.file, def.sheet);
  const map = def.sheet && base.clone ? base.clone() : base;
  if (def.sheet) {
    map.repeat.set(0.25, 0.25);
    map.offset.set(0, 0.75);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.needsUpdate = true;
  }
  const g = new THREE.Group();
  const w = def.w || 1.2;
  const h = def.h || 2;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(Math.max(0.16, w * 0.2), Math.max(0.28, h * 0.38), 8, 16),
    new THREE.MeshLambertMaterial({ color: 0x2a2420, emissive: 0x151210, emissiveIntensity: 0.2 }),
  );
  body.position.y = h * 0.42;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h, 6, 8),
    new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.12, side: THREE.DoubleSide }),
  );
  face.position.set(0, h * 0.5, w * 0.14);
  g.add(body, face);
  g.userData = {
    foe: true,
    def,
    kind: def.id,
    hp: def.hp,
    maxHp: def.hp,
    sheet: !!def.sheet,
    flash: 0,
    cool: 0,
    hitR: Math.max(0.7, w * 0.45),
    baseW: w,
    baseH: h,
    animT: Math.random() * 4,
    sprite: face,
    billboard: true,
    foot: true,
  };
  face.userData = g.userData;
  return g;
}

export function spawnFrom(spawner, map, sdf2, existing) {
  const def = ENEMY_BY_ID[spawner.enemy] || ENEMIES[0];
  const r = Math.max(1, spawner.radius || 6);
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r * 0.85;
    const x = spawner.x + Math.cos(a) * d;
    const z = spawner.z + Math.sin(a) * d;
    const y = floorY(x, z, map, sdf2);
    if (y < -500) continue;
    const e = def.robot ? makeRobot(def) : makeEnemy(def);
    e.position.set(x, y, z);
    e.userData.home = { x: spawner.x, z: spawner.z, r };
    e.userData.spawner = spawner;
    existing.push(e);
    return e;
  }
  return null;
}

export function tickFoes(foes, dt, player, map, sdf2, onHit) {
  const px = player.x;
  const pz = player.z;
  for (const f of foes) {
    const u = f.userData;
    if (!f.visible || u.hp <= 0 || u.robot) continue;
    if (u.flung) {
      u.vy = (u.vy || 0) - 24 * dt;
      f.position.x += (u.vx || 0) * dt;
      f.position.y += u.vy * dt;
      f.position.z += (u.vz || 0) * dt;
      u.vx = (u.vx || 0) * 0.99;
      u.vz = (u.vz || 0) * 0.99;
      const fy = floorY(f.position.x, f.position.z, map, sdf2);
      const stand = fy + (u.foot || u.robot ? 0.02 : (u.baseH || 2) * 0.48);
      if (fy > -500 && f.position.y <= stand) {
        f.position.y = stand;
        if (u.vy < -3 && u.slam) hurtFoe(f, u.slam, null);
        u.vy = 0;
        u.vx *= 0.4;
        u.vz *= 0.4;
        u.flung = false;
        u.slam = 0;
      }
      if (u.flash > 0) u.flash -= dt;
      continue;
    }
    if (u.recoil > 0) {
      u.recoil -= dt;
      f.position.x += (u.kx || 0) * dt;
      f.position.z += (u.kz || 0) * dt;
    }
    if (u.flash > 0) {
      u.flash -= dt;
      const col = u.flash > 0 ? 0xff3333 : 0xffffff;
      if (f.material?.color) f.material.color.setHex(col);
      f.traverse?.((o) => {
        if (o.material?.color) o.material.color.setHex(col);
      });
    }
    const dx = px - f.position.x;
    const dz = pz - f.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const home = u.home;
    const inRadius = !home || Math.hypot(px - home.x, pz - home.z) <= (home.r || 8);
    let mx = 0;
    let mz = 0;
    const spd = u.def.spd;
    if (inRadius && dist < 22) {
      const st = doomSteer(u, dx, dz, dist, dt, spd, player);
      mx = st.mx;
      mz = st.mz;
    } else if (home) {
      const hx = home.x - f.position.x;
      const hz = home.z - f.position.z;
      const hd = Math.hypot(hx, hz) || 1;
      if (hd > home.r * 0.55) {
        mx = (hx / hd) * spd * 0.55;
        mz = (hz / hd) * spd * 0.55;
      } else {
        u.wander = (u.wander || Math.random() * 6.28) + dt * 0.6;
        mx = Math.cos(u.wander) * spd * 0.35;
        mz = Math.sin(u.wander) * spd * 0.35;
      }
    }
    const nx = f.position.x + mx * dt;
    const nz = f.position.z + mz * dt;
    const okX = sdf3(nx, f.position.y, f.position.z, map, sdf2) < -0.2;
    const okZ = sdf3(f.position.x, f.position.y, nz, map, sdf2) < -0.2;
    if (okX) f.position.x = nx;
    if (okZ) f.position.z = nz;
    if ((!okX || !okZ) && inRadius) u.moveT = 0;
    if (home) {
      const hd = Math.hypot(f.position.x - home.x, f.position.z - home.z);
      if (hd > home.r) {
        f.position.x = home.x + ((f.position.x - home.x) / hd) * home.r;
        f.position.z = home.z + ((f.position.z - home.z) / hd) * home.r;
      }
    }
    const fy = floorY(f.position.x, f.position.z, map, sdf2, undefined, f.position.y);
    if (fy > -500) f.position.y = fy + (u.floatY || 0);
    else {
      f.position.y -= 16 * dt;
      if (f.position.y < -12) {
        f.visible = false;
        u.hp = 0;
      }
    }
    const moving = Math.hypot(mx, mz) > 0.05;
    if (u.billboard) f.lookAt(px, f.position.y, pz);
    const spr = u.sprite || f;
    if (u.sheet) stepSheet(spr, dt, moving, mx, mz);
    else if (spr.material && spr.isSprite) {
      u.animT = (u.animT || 0) + dt * (moving ? 6 : 2);
      spr.material.rotation = Math.sin(u.animT) * (moving ? 0.08 : 0.03);
    }
    u.cool = Math.max(0, (u.cool || 0) - dt);
    if (dist < 1.55 + u.hitR * 0.15 && u.cool <= 0) {
      u.cool = 0.9;
      sfx("melee");
      onHit(u.def.dmg, u.kind);
    }
  }
}

export function strikeFoes(foes, origin, dir, range, dmg) {
  let hit = 0;
  for (const f of foes) {
    const u = f.userData;
    if (!f.visible || u.hp <= 0) continue;
    const dx = f.position.x - origin.x;
    const dy = f.position.y - origin.y;
    const dz = f.position.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > range + u.hitR) continue;
    const nd = dist || 1;
    const dot = (dx / nd) * dir.x + (dz / nd) * dir.z;
    if (dot < 0.35) continue;
    hurtFoe(f, dmg, dir);
    hit++;
  }
  return hit;
}
