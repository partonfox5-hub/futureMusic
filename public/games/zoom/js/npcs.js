/** Articulated NPCs and dialogue trees. */
import * as THREE from "three";

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

function hashHue(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function limb(len, thick, col, extra = 0) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(thick, Math.max(0.08, len - thick * 2), 3, 6), mat(col));
  m.position.y = -len * 0.5;
  const g = new THREE.Group();
  g.add(m);
  if (extra) {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.85, 6, 5), mat(col));
    tip.position.y = -len;
    g.add(tip);
  }
  g.userData.len = len;
  return g;
}

export function defaultNpc(x, z) {
  return {
    id: "n" + Math.random().toString(36).slice(2, 8),
    name: "Wanderer",
    x,
    z,
    yaw: 0,
    opener: "Hello, traveler.",
    options: [
      { text: "Who are you?", reply: "A friend in these tunnels.", options: [] },
      { text: "Any advice?", reply: "Watch the lava. It bites.", options: [] },
      { text: "Farewell.", reply: "Walk in light.", options: [] },
    ],
  };
}

export function makeNpc(def) {
  const h = hashHue(def.name || def.id || "npc");
  const skin = new THREE.Color().setHSL(((h % 40) + 12) / 360, 0.28, 0.55);
  const cloth = new THREE.Color().setHSL(((h >> 5) % 360) / 360, 0.45, 0.32);
  const cloth2 = new THREE.Color().setHSL(((h >> 9) % 360) / 360, 0.4, 0.22);
  const hair = new THREE.Color().setHSL(0.08, 0.35, (h % 2) ? 0.12 : 0.45);
  const g = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  g.add(hips);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(cloth2.getHex()));
  hips.add(pelvis);
  const torso = new THREE.Group();
  torso.position.y = 0.16;
  hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 4, 8), mat(cloth.getHex()));
  chest.position.y = 0.22;
  torso.add(chest);
  const head = new THREE.Group();
  head.position.y = 0.52;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 7), mat(skin.getHex()));
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 6), mat(hair.getHex()));
  hairM.scale.set(1.05, 0.7, 1.05);
  hairM.position.y = 0.07;
  head.add(skull, hairM);
  const mkArm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.22, 0.34, 0);
    const upper = limb(0.28, 0.045, skin.getHex());
    upper.rotation.z = side * 0.18;
    const lower = limb(0.26, 0.04, skin.getHex(), 1);
    lower.position.y = -0.28;
    upper.add(lower);
    sh.add(upper);
    sh.userData.upper = upper;
    sh.userData.lower = lower;
    torso.add(sh);
    return sh;
  };
  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, -0.04, 0);
    const upper = limb(0.34, 0.055, cloth2.getHex());
    const lower = limb(0.32, 0.048, skin.getHex(), 1);
    lower.position.y = -0.34;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.16), mat(0x2a2218));
    boot.position.set(0, -0.34, 0.03);
    lower.add(boot);
    upper.add(lower);
    hip.add(upper);
    hip.userData.upper = upper;
    hip.userData.lower = lower;
    hips.add(hip);
    return hip;
  };
  g.userData.lArm = mkArm(-1);
  g.userData.rArm = mkArm(1);
  g.userData.lLeg = mkLeg(-1);
  g.userData.rLeg = mkLeg(1);
  g.userData.torso = torso;
  g.userData.head = head;
  g.userData.phase = (h % 100) / 16;
  g.userData.kind = "npc";
  g.userData.npc = def;
  const tag = makeNameTag(def.name || "NPC");
  tag.position.y = 2.05;
  g.add(tag);
  g.userData.tag = tag;
  return g;
}

function makeNameTag(name) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(12,10,8,0.72)";
  g.fillRect(8, 10, 240, 44);
  g.strokeStyle = "#d4b070";
  g.strokeRect(8, 10, 240, 44);
  g.fillStyle = "#e8dcc0";
  g.font = "700 22px Cinzel, serif";
  g.textAlign = "center";
  g.fillText((name || "NPC").slice(0, 18), 128, 40);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.7, 0.18, 1);
  return spr;
}

export function tickNpcPose(mesh, t) {
  if (!mesh?.userData) return;
  const u = mesh.userData;
  const w = t * 2.2 + (u.phase || 0);
  if (u.lArm?.userData.upper) u.lArm.userData.upper.rotation.x = Math.sin(w) * 0.18;
  if (u.rArm?.userData.upper) u.rArm.userData.upper.rotation.x = Math.sin(w + Math.PI) * 0.18;
  if (u.lLeg?.userData.upper) u.lLeg.userData.upper.rotation.x = Math.sin(w + Math.PI) * 0.08;
  if (u.rLeg?.userData.upper) u.rLeg.userData.upper.rotation.x = Math.sin(w) * 0.08;
  if (u.torso) u.torso.rotation.y = Math.sin(w * 0.5) * 0.06;
  if (u.head) u.head.rotation.y = Math.sin(w * 0.35) * 0.12;
}

export function nearNpc(list, player, r = 1.85) {
  let best = null;
  let bd = r;
  for (const n of list || []) {
    if (!n.mesh) continue;
    const d = Math.hypot(player.x - n.x, player.z - n.z);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}
