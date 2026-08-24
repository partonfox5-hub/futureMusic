import * as THREE from "three";
import { STUD, PLATE } from "./bricks.js";

export const FIG_HEADS = [
  { id: "smile", name: "Smile", skin: 0xf5cd2f, face: "smile" },
  { id: "grin", name: "Grin", skin: 0xf5cd2f, face: "grin" },
  { id: "cool", name: "Shades", skin: 0xf5cd2f, face: "cool" },
  { id: "wink", name: "Wink", skin: 0xf5cd2f, face: "wink" },
  { id: "sleep", name: "Sleepy", skin: 0xf5cd2f, face: "sleep" },
  { id: "alien", name: "Alien", skin: 0x9aca3e, face: "alien" },
  { id: "robot", name: "Robot", skin: 0x9ba3a9, face: "robot" },
  { id: "tan", name: "Tan", skin: 0xe4cd9e, face: "smile" },
  { id: "dark", name: "Deep", skin: 0x6a4a2a, face: "smile" },
  { id: "pale", name: "Pale", skin: 0xf4e4d0, face: "grin" },
];

export const FIG_TORSOS = [
  { id: "blue", name: "Blue shirt", col: 0x0055bf, accent: 0xffffff },
  { id: "red", name: "Red tee", col: 0xc91a09, accent: 0xf5cd2f },
  { id: "green", name: "Green", col: 0x237841, accent: 0xbbe90b },
  { id: "black", name: "Black jacket", col: 0x1b2a34, accent: 0xc91a09 },
  { id: "white", name: "White shirt", col: 0xf2f3f2, accent: 0x0055bf },
  { id: "orange", name: "Safety", col: 0xfe8a18, accent: 0x1b2a34 },
  { id: "purple", name: "Regal", col: 0x81007b, accent: 0xf5cd2f },
  { id: "stripe", name: "Stripes", col: 0x078bc9, accent: 0xffffff },
  { id: "overall", name: "Overalls", col: 0x0055bf, accent: 0xe4cd9e },
  { id: "armor", name: "Armor", col: 0x6a6e74, accent: 0xf5cd2f },
];

export const FIG_LEGS = [
  { id: "blue", name: "Blue pants", col: 0x0055bf },
  { id: "black", name: "Black pants", col: 0x1b2a34 },
  { id: "brown", name: "Brown pants", col: 0x583927 },
  { id: "tan", name: "Tan shorts", col: 0xe4cd9e },
  { id: "green", name: "Green pants", col: 0x237841 },
  { id: "red", name: "Red pants", col: 0xc91a09 },
  { id: "navy", name: "Navy", col: 0x0d325b },
  { id: "grey", name: "Grey", col: 0x9ba3a9 },
  { id: "white", name: "White", col: 0xf2f3f2 },
  { id: "purple", name: "Purple", col: 0x81007b },
];

const _faceCache = new Map();

function faceTex(kind) {
  if (_faceCache.has(kind)) return _faceCache.get(kind);
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#0000";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#1a1208";
  if (kind === "cool") {
    g.fillRect(14, 26, 36, 8);
    g.fillRect(18, 24, 12, 12);
    g.fillRect(34, 24, 12, 12);
  } else if (kind === "sleep") {
    g.strokeStyle = "#1a1208";
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(16, 28); g.quadraticCurveTo(22, 24, 28, 28); g.stroke();
    g.beginPath(); g.moveTo(36, 28); g.quadraticCurveTo(42, 24, 48, 28); g.stroke();
  } else if (kind === "wink") {
    g.beginPath(); g.arc(22, 28, 3, 0, 7); g.fill();
    g.fillRect(36, 26, 10, 3);
  } else if (kind === "alien") {
    g.fillStyle = "#081018";
    g.beginPath(); g.ellipse(20, 28, 6, 8, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(44, 28, 6, 8, 0, 0, 7); g.fill();
  } else if (kind === "robot") {
    g.fillStyle = "#9ee7ff";
    g.fillRect(16, 22, 12, 10);
    g.fillRect(36, 22, 12, 10);
  } else {
    g.beginPath(); g.arc(22, 28, 3.2, 0, 7); g.fill();
    g.beginPath(); g.arc(42, 28, 3.2, 0, 7); g.fill();
  }
  g.strokeStyle = "#1a1208";
  g.lineWidth = 3;
  g.beginPath();
  if (kind === "grin") {
    g.arc(32, 40, 10, 0.15, Math.PI - 0.15);
  } else if (kind === "alien") {
    g.arc(32, 46, 6, Math.PI, 0);
  } else if (kind !== "sleep" && kind !== "robot") {
    g.arc(32, 42, 8, 0.2, Math.PI - 0.2);
  }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _faceCache.set(kind, t);
  return t;
}

function lamb(hex) {
  return new THREE.MeshLambertMaterial({ color: hex });
}

export function defaultFigConfig() {
  return { head: 0, torso: 0, legs: 0 };
}

export function makeFig(cfg, ghost = false) {
  const head = FIG_HEADS[cfg.head % FIG_HEADS.length];
  const torso = FIG_TORSOS[cfg.torso % FIG_TORSOS.length];
  const legs = FIG_LEGS[cfg.legs % FIG_LEGS.length];
  const g = new THREE.Group();
  const op = ghost ? 0.5 : 1;
  const hipH = PLATE * 4;
  const torsoH = PLATE * 3.2;
  const headR = STUD * 0.72;

  const hip = new THREE.Mesh(new THREE.BoxGeometry(STUD * 1.6, hipH * 0.55, STUD * 0.9), lamb(legs.col));
  hip.position.y = hipH * 0.35;
  g.add(hip);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(STUD * 0.7, hipH * 0.7, STUD * 0.8), lamb(legs.col));
  const legR = legL.clone();
  legL.position.set(-STUD * 0.42, hipH * 0.32, 0);
  legR.position.set(STUD * 0.42, hipH * 0.32, 0);
  g.add(legL, legR);

  const bod = new THREE.Mesh(new THREE.BoxGeometry(STUD * 1.55, torsoH, STUD * 0.85), lamb(torso.col));
  bod.position.y = hipH + torsoH * 0.5;
  g.add(bod);
  const print = new THREE.Mesh(new THREE.BoxGeometry(STUD * 0.7, torsoH * 0.45, 0.0006), lamb(torso.accent));
  print.position.set(0, hipH + torsoH * 0.55, STUD * 0.43);
  g.add(print);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(STUD * 0.22, STUD * 0.22, torsoH * 0.95, 6), lamb(torso.col));
  const armR = armL.clone();
  armL.position.set(-STUD * 1.05, hipH + torsoH * 0.4, 0);
  armR.position.set(STUD * 1.05, hipH + torsoH * 0.4, 0);
  g.add(armL, armR);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(STUD * 0.28, 6, 5), lamb(head.skin));
  const handR = handL.clone();
  handL.position.set(-STUD * 1.05, hipH + 0.002, 0);
  handR.position.set(STUD * 1.05, hipH + 0.002, 0);
  g.add(handL, handR);

  const hd = new THREE.Mesh(new THREE.CylinderGeometry(headR, headR, headR * 1.7, 10), lamb(head.skin));
  hd.position.y = hipH + torsoH + headR * 0.95;
  g.add(hd);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(headR * 1.6, headR * 1.6),
    new THREE.MeshBasicMaterial({ map: faceTex(head.face), transparent: true, depthWrite: false }),
  );
  face.position.set(0, hipH + torsoH + headR * 0.9, headR * 1.02);
  g.add(face);
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(STUD * 0.3, STUD * 0.3, STUD * 0.2, 8), lamb(head.skin));
  stud.position.y = hipH + torsoH + headR * 1.7 + STUD * 0.1;
  g.add(stud);

  if (ghost) {
    g.traverse((o) => {
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = op;
      }
    });
  }
  g.userData.kind = "fig";
  g.userData.cfg = { ...cfg };
  g.userData.height = hipH + torsoH + headR * 1.9;
  return g;
}

export function figFootOffset() {
  return STUD * 0.15;
}

/**
 * Walk a fig across a height field. heightAt(x,z) returns local Y of the walkable top.
 * canStep(fromY, toY) allows stairs / 1-2 plate rises.
 */
export function tickFig(fig, dt, heightAt, wanderR) {
  const u = fig.userData;
  if (u.held) return;
  u.walkT = (u.walkT || 0) + dt;
  if (!u.dest || fig.position.distanceTo(u.dest) < STUD * 0.4 || u.walkT > 6) {
    const a = Math.random() * Math.PI * 2;
    const r = (0.2 + Math.random() * 0.8) * wanderR;
    u.dest = new THREE.Vector3(
      THREE.MathUtils.clamp((u.origin?.x || 0) + Math.cos(a) * r, -wanderR, wanderR),
      0,
      THREE.MathUtils.clamp((u.origin?.z || 0) + Math.sin(a) * r, -wanderR, wanderR),
    );
    u.walkT = 0;
  }
  const pos = fig.position;
  const dx = u.dest.x - pos.x;
  const dz = u.dest.z - pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const spd = STUD * 4.5;
  const nx = pos.x + (dx / len) * spd * dt;
  const nz = pos.z + (dz / len) * spd * dt;
  const y0 = heightAt(pos.x, pos.z);
  const y1 = heightAt(nx, nz);
  const step = y1 - y0;
  const maxStep = PLATE * 2.4;
  if (step <= maxStep && step >= -PLATE * 6) {
    pos.x = nx;
    pos.z = nz;
    pos.y = THREE.MathUtils.damp(pos.y, y1, 8, dt);
    fig.rotation.y = Math.atan2(dx, dz);
    const bob = 1 + Math.sin(u.walkT * 10) * 0.04;
    fig.scale.y = bob;
  } else {
    u.dest = null;
  }
}
