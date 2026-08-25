import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";
import {
  STUD, PLATE, COLORS, KINDS, DIMS,
  colorOf, dimOf, kindOf, shapeSpec, makeBrickMesh,
  rotatedDims, gridToLocal, localToGrid, cellsOf, randomSpec, platesFor,
} from "./bricks.js?v=bb9";
import {
  FIG_HEADS, FIG_TORSOS, FIG_LEGS, defaultFigConfig, makeFig, tickFig,
} from "./figs.js?v=bb9";

const canvas = document.getElementById("c");
const hudEl = document.getElementById("hud");
const hudLine = document.getElementById("hud-line");
const hudHint = document.getElementById("hud-hint");
const startEl = document.getElementById("start");

const TABLE_N = 48;
const TABLE_Y = 0.9;
const MAX_BRICKS = 420;
const MAX_FIGS = 36;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xb8d4f0, 1);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8d4f0);
scene.fog = new THREE.Fog(0xb8d4f0, 28, 90);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 120);
const rig = new THREE.Group();
rig.position.set(0, 0, 0.55);
scene.add(rig);
rig.add(camera);
camera.position.set(0, 1.55, 0);
renderer.xr.addEventListener("sessionstart", () => { camera.position.set(0, 0, 0); });
renderer.xr.addEventListener("sessionend", () => { camera.position.set(0, 1.55, 0); });

scene.add(new THREE.HemisphereLight(0xfff4e8, 0x8aa0b8, 1.05));
const sun = new THREE.DirectionalLight(0xfff2d8, 0.85);
sun.position.set(6, 12, 4);
scene.add(sun);

function makeSky() {
  const g = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){
        vec3 n=normalize(vP);
        float h=n.y*0.5+0.5;
        vec3 zen=vec3(0.45,0.70,0.95);
        vec3 hor=vec3(0.92,0.86,0.78);
        vec3 nad=vec3(0.70,0.78,0.86);
        vec3 col=mix(nad,hor,smoothstep(0.0,0.48,h));
        col=mix(col,zen,smoothstep(0.48,1.0,h));
        gl_FragColor=vec4(col,1.0);
      }`,
    }),
  );
  return g;
}
scene.add(makeSky());

const buildRoot = new THREE.Group();
buildRoot.position.set(0, TABLE_Y, -0.35);
scene.add(buildRoot);

let worldScale = 8;
let pieceScale = 1;
buildRoot.scale.setScalar(worldScale);

function makeTable() {
  const g = new THREE.Group();
  const topW = TABLE_N * STUD;
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(topW + 0.04, 0.018, topW + 0.04),
    new THREE.MeshLambertMaterial({ color: 0xc4a574 }),
  );
  top.position.y = -0.009;
  g.add(top);
  const felt = new THREE.Mesh(
    new THREE.BoxGeometry(topW, 0.002, topW),
    new THREE.MeshLambertMaterial({ color: 0xe8dcc8 }),
  );
  felt.position.y = 0.001;
  g.add(felt);
  const grid = makeGridTex(TABLE_N);
  const gridMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(topW, topW),
    new THREE.MeshBasicMaterial({ map: grid, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  gridMesh.rotation.x = -Math.PI / 2;
  gridMesh.position.y = 0.0025;
  g.add(gridMesh);
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(topW * 1.8, topW * 1.8, 0.012, 32),
    new THREE.MeshLambertMaterial({ color: 0x3aaa3a }),
  );
  floor.visible = false;
  g.add(floor);
  g.userData.floor = floor;
  g.userData.topY = 0;
  g.userData.half = topW / 2;
  return g;
}
function makeGridTex(n) {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(40,50,70,0.45)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    const p = (i / n) * s;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const table = makeTable();
buildRoot.add(table);
const legMat = new THREE.MeshLambertMaterial({ color: 0x6a4a28 });
const worldLegs = [];
for (let i = 0; i < 4; i++) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1, 0.045), legMat);
  scene.add(leg);
  worldLegs.push(leg);
}
function layoutFurniture() {
  const half = TABLE_N * STUD * worldScale * 0.42;
  const top = buildRoot.position;
  const span = TABLE_Y;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  worldLegs.forEach((leg, i) => {
    leg.scale.y = span;
    leg.position.set(top.x + corners[i][0] * half, span / 2, top.z + corners[i][1] * half);
  });
  table.userData.floor.position.y = -TABLE_Y / worldScale;
}
layoutFurniture();

(function makeLegoField() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#2f9a3a";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#3cb54a";
  g.fillRect(4, 4, 120, 120);
  g.fillStyle = "#268832";
  g.beginPath(); g.arc(64, 64, 18, 0, 7); g.fill();
  g.fillStyle = "#46c456";
  g.beginPath(); g.arc(64, 64, 12, 0, 7); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(220, 220);
  tex.colorSpace = THREE.SRGBColorSpace;
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 280),
    new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.002;
  scene.add(field);
})();
rig.position.set(1.65, 0, 0.15);

function labelTex(text, w = 160, h = 36) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.direction = "ltr";
  g.fillStyle = "#2a3140";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#e6b35c";
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, w - 3, h - 3);
  g.fillStyle = "#f4efe4";
  g.font = `bold ${Math.max(18, Math.round(h * 0.52))}px sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = true;
  t.needsUpdate = true;
  return t;
}

function uiMat(map, color) {
  return new THREE.MeshBasicMaterial({
    map: map || null,
    color: color != null ? color : 0xffffff,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    transparent: !!map,
  });
}

const _thumbCache = new Map();
let _thumbR, _thumbS, _thumbCam, _thumbHold;
function catalogThumbTex(kindId, hex) {
  const key = kindId + ":" + (hex || 0);
  if (_thumbCache.has(key)) return _thumbCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  if (kindId.startsWith("beacon:")) {
    const g = c.getContext("2d");
    g.fillStyle = "#243044";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#" + (hex || 0x44aaff).toString(16).padStart(6, "0");
    g.fillRect(34, 52, 60, 48);
    g.beginPath();
    g.moveTo(28, 52);
    g.lineTo(64, 22);
    g.lineTo(100, 52);
    g.closePath();
    g.fill();
    g.fillStyle = "#f4efe4";
    g.fillRect(56, 72, 16, 28);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = true;
    t.needsUpdate = true;
    _thumbCache.set(key, t);
    return t;
  }
  if (!_thumbR) {
    _thumbR = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    _thumbR.setSize(128, 128, false);
    _thumbR.setClearColor(0x000000, 0);
    _thumbS = new THREE.Scene();
    _thumbS.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(2, 5, 3);
    _thumbS.add(sun);
    _thumbCam = new THREE.PerspectiveCamera(28, 1, 0.004, 2);
    _thumbHold = new THREE.Group();
    _thumbS.add(_thumbHold);
  } else {
    _thumbR.setSize(128, 128, false);
  }
  while (_thumbHold.children.length) _thumbHold.remove(_thumbHold.children[0]);
  let mesh;
  if (kindId === "fig") {
    mesh = makeFig(defaultFigConfig());
    mesh.scale.setScalar(1.8);
  } else {
    const dim = DIMS.find((d) => d.id === "2x4") || DIMS[8];
    const spec = shapeSpec(dim, kindId);
    mesh = makeBrickMesh(spec, COLORS.find((c) => c.id === "red") || COLORS[2], false);
  }
  _thumbHold.add(mesh);
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z, 0.01);
  _thumbCam.position.set(mid.x + span * 1.4, mid.y + span * 1.15, mid.z + span * 1.5);
  _thumbCam.lookAt(mid);
  _thumbCam.updateProjectionMatrix();
  _thumbR.render(_thumbS, _thumbCam);
  const copy = document.createElement("canvas");
  copy.width = copy.height = 128;
  copy.getContext("2d").drawImage(_thumbR.domElement, 0, 0);
  const t = new THREE.CanvasTexture(copy);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = true;
  t.needsUpdate = true;
  _thumbCache.set(key, t);
  return t;
}

/** Panel +Z faces the player so canvas text is not mirrored. */
function facePlayer(group, dist) {
  camera.updateMatrixWorld();
  camera.getWorldPosition(_v);
  camera.getWorldDirection(_v2);
  group.position.copy(_v).addScaledVector(_v2, dist || 0.75);
  group.lookAt(_v);
  group.visible = true;
}

let colorI = 2;
let dimI = 8;
let kindI = 0;
let rot = 0;
let gravityOn = true;
let paletteHand = 0;
let figCfg = defaultFigConfig();
let figPanelOpen = false;
let handMode = "brick";
const HAND_MODES = ["brick", "fig", "hands"];
let menuOpen = false;
let nextId = 1;
const SAVE_PREFIX = "blockbuild-slot-";
const bricks = [];
const figs = [];
const balls = [];
const fx = [];
const beacons = [];
let beaconKind = "kitchen";

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _ray = new THREE.Raycaster();

function currentSpec() {
  return shapeSpec(DIMS[dimI], KINDS[kindI].id);
}
function currentCol() {
  return COLORS[colorI];
}

function makePalette() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 28),
    new THREE.MeshLambertMaterial({ color: 0x1c1e24 }),
  );
  plate.rotation.x = -Math.PI / 2;
  g.add(plate);
  const hits = [];
  COLORS.forEach((c, i) => {
    const a = (i / COLORS.length) * Math.PI * 2 - Math.PI / 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshLambertMaterial({ color: c.hex }));
    m.position.set(Math.cos(a) * 0.092, 0.012, Math.sin(a) * 0.092);
    m.userData.pick = { type: "color", i };
    g.add(m);
    hits.push(m);
  });
  const dimHits = [];
  const dimShow = DIMS.slice(0, 12);
  dimShow.forEach((d, i) => {
    const a = (i / dimShow.length) * Math.PI * 2 - Math.PI / 2;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.008, 0.014),
      new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }),
    );
    m.position.set(Math.cos(a) * 0.055, 0.01, Math.sin(a) * 0.055);
    m.userData.pick = { type: "dim", i };
    g.add(m);
    dimHits.push(m);
    const lab = new THREE.Mesh(
      new THREE.PlaneGeometry(0.028, 0.01),
      new THREE.MeshBasicMaterial({ map: labelTex(d.id, 96, 32), transparent: true, depthTest: false }),
    );
    lab.position.set(Math.cos(a) * 0.055, 0.02, Math.sin(a) * 0.055);
    lab.userData.pick = { type: "dim", i };
    g.add(lab);
    hits.push(lab);
  });
  hits.push(...dimHits);

  const tools = [
    { id: "kind", label: "Kind" },
    { id: "grav", label: "Gravity" },
    { id: "swap", label: "Swap hand" },
    { id: "zin", label: "Zoom in" },
    { id: "zout", label: "Zoom out" },
    { id: "figui", label: "Fig studio" },
  ];
  tools.forEach((t, i) => {
    const x = (i % 3) * 0.042 - 0.042;
    const z = Math.floor(i / 3) * 0.032 - 0.016;
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.028),
      new THREE.MeshBasicMaterial({ map: labelTex(t.label, 140, 48), transparent: true, depthTest: false, side: THREE.DoubleSide }),
    );
    pl.position.set(x, 0.018, z);
    pl.rotation.x = -0.15;
    pl.userData.pick = { type: "tool", id: t.id };
    g.add(pl);
    hits.push(pl);
  });
  g.position.set(0, 0.05, 0.12);
  return { group: g, hits, dimHits };
}

function makeFigPanel() {
  const g = new THREE.Group();
  g.visible = false;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.34),
    new THREE.MeshLambertMaterial({ color: 0x16181f, side: THREE.DoubleSide }),
  );
  g.add(board);
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.04),
    new THREE.MeshBasicMaterial({ map: labelTex("FIG STUDIO", 220, 40), transparent: true, depthTest: false }),
  );
  title.position.set(0, 0.14, 0.002);
  g.add(title);
  const preview = new THREE.Group();
  preview.position.set(0, 0.02, 0.03);
  preview.scale.setScalar(2.4);
  g.add(preview);
  const hits = [];
  const rows = [
    { key: "head", y: -0.08, list: FIG_HEADS },
    { key: "torso", y: -0.115, list: FIG_TORSOS },
    { key: "legs", y: -0.15, list: FIG_LEGS },
  ];
  const labels = {};
  rows.forEach((row) => {
    const L = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.028),
      new THREE.MeshBasicMaterial({ map: labelTex("<", 64, 40), transparent: true, depthTest: false }),
    );
    L.position.set(-0.1, row.y, 0.003);
    L.userData.pick = { type: "figspin", key: row.key, dir: -1 };
    const R = L.clone();
    R.material = L.material.clone();
    R.material.map = labelTex(">", 64, 40);
    R.position.set(0.1, row.y, 0.003);
    R.userData.pick = { type: "figspin", key: row.key, dir: 1 };
    const mid = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.028),
      new THREE.MeshBasicMaterial({ map: labelTex(row.list[0].name, 180, 40), transparent: true, depthTest: false }),
    );
    mid.position.set(0, row.y, 0.003);
    g.add(L, R, mid);
    hits.push(L, R);
    labels[row.key] = mid;
  });
  g.position.set(0.22, 0.12, 0.08);
  return { group: g, hits, preview, labels };
}

function refreshFigPanel() {
  while (figPanel.preview.children.length) figPanel.preview.remove(figPanel.preview.children[0]);
  const f = makeFig(figCfg);
  figPanel.preview.add(f);
  const setLab = (key, list, i) => {
    const m = figPanel.labels[key];
    if (m.material.map) m.material.map.dispose();
    m.material.map = labelTex(list[i % list.length].name, 180, 40);
    m.material.needsUpdate = true;
  };
  setLab("head", FIG_HEADS, figCfg.head);
  setLab("torso", FIG_TORSOS, figCfg.torso);
  setLab("legs", FIG_LEGS, figCfg.legs);
}

const palette = makePalette();
const figPanel = makeFigPanel();

const ctrl = {
  0: renderer.xr.getController(0),
  1: renderer.xr.getController(1),
  g0: renderer.xr.getControllerGrip(0),
  g1: renderer.xr.getControllerGrip(1),
};
Object.values(ctrl).forEach((c) => rig.add(c));

function makeHand(col) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: col });
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.08), mat);
  p.position.z = 0.02;
  g.add(p);
  return g;
}
const handL = makeHand(0xc8d0d8);
const handR = makeHand(0xc8d0d8);
ctrl.g0.add(handL);
ctrl.g1.add(handR);

function attachPalette() {
  palette.group.visible = false;
  figPanel.group.visible = false;
  palette.group.parent?.remove(palette.group);
  figPanel.group.parent?.remove(figPanel.group);
}
attachPalette();

const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -0.55)]),
  new THREE.LineBasicMaterial({ color: 0x2a2a30, transparent: true, opacity: 0.45 }),
);
function attachLaser() {
  const c = paletteHand === 0 ? ctrl[1] : ctrl[0];
  c.add(laser);
}
attachLaser();

const flame = new THREE.Group();
for (let i = 0; i < 12; i++) {
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 5),
    new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffee66 : 0xff5511, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  s.position.set((Math.random() - 0.5) * 0.02, Math.random() * 0.04, (Math.random() - 0.5) * 0.02);
  flame.add(s);
}
flame.visible = false;
function attachFlame() {
  const c = paletteHand === 0 ? ctrl[1] : ctrl[0];
  c.add(flame);
  flame.position.set(0, 0.02, -0.04);
}
attachFlame();

let ghost = null;
function rebuildGhost() {
  if (ghost) {
    ghost.parent?.remove(ghost);
    ghost = null;
  }
  if (handMode === "hands") return;
  if (handMode === "beacon") ghost = makeBeaconMesh(beaconKind, true);
  else if (handMode === "fig") ghost = makeFig(figCfg, true);
  else ghost = makeBrickMesh(currentSpec(), currentCol(), true);
  if (ghost) {
    ghost.scale.setScalar(pieceScale);
    if (ghost.userData) ghost.userData.baseScale = pieceScale;
    buildRoot.add(ghost);
  }
}
rebuildGhost();

function setHud() {
  const k = KINDS[kindI].name;
  const d = DIMS[dimI].id;
  const c = COLORS[colorI].name;
  const mode = handMode === "brick"
    ? `${c} · ${d} ${k}`
    : handMode === "fig"
      ? `Fig · ${FIG_HEADS[figCfg.head].name}`
      : handMode === "beacon"
        ? `Beacon · ${beaconKind}`
        : "Empty-handed";
  hudLine.textContent = `${mode} · brick ${pieceScale.toFixed(1)}× · table ${worldScale.toFixed(1)}× · gravity ${gravityOn ? "ON" : "OFF"}`;
}

function xrGamepad(i) {
  const srcs = renderer.xr.getSession()?.inputSources;
  if (!srcs) return null;
  for (const s of srcs) {
    if (s.handedness === (i === 0 ? "left" : "right")) return s.gamepad;
  }
  return srcs[i]?.gamepad || null;
}
function stickXY(gp) {
  if (!gp?.axes) return { x: 0, y: 0 };
  const a = gp.axes;
  if (a.length >= 4) return { x: a[2] || 0, y: a[3] || 0 };
  return { x: a[0] || 0, y: a[1] || 0 };
}

const keys = new Set();
const mouse = { x: 0, y: 0, down: false, locked: false };
let lookYaw = 0;
let lookPitch = -0.42;
const pressed = { t0: false, t1: false, g0: false, g1: false, a: false, b: false, x: false, y: false, rsc: false, lsc: false, lmenu: false, ltrig: false };
let xHold = 0;
const handVel = new THREE.Vector3();
const handVelWorld = new THREE.Vector3();
const velBuf = [];
let handPrev = null;
let handPrevW = null;

function peakHandWorld() {
  let best = handVelWorld.clone();
  let bestL = best.lengthSq();
  for (const v of velBuf) {
    const L = v.lengthSq();
    if (L > bestL) { bestL = L; best = v; }
  }
  return best;
}

function buildCtrl() {
  return paletteHand === 0 ? ctrl[1] : ctrl[0];
}
function paletteCtrl() {
  return paletteHand === 0 ? ctrl[0] : ctrl[1];
}

function worldToLocal(v) {
  return buildRoot.worldToLocal(v.clone());
}
function aimLocal(originW, dirW) {
  const o = worldToLocal(originW);
  const p1 = worldToLocal(originW.clone().add(dirW));
  const d = p1.sub(o);
  if (Math.abs(d.y) > 1e-5) {
    const tHit = (0.004 - o.y) / d.y;
    if (tHit > 0.02 && tHit < 80) {
      const hit = o.clone().addScaledVector(d, tHit);
      hit.y = heightAt(hit.x, hit.z);
      return hit;
    }
  }
  const len = d.length() || 1;
  return o.addScaledVector(d, 0.08 / len);
}

function pushOutFromPlayer(pos, spec) {
  const { bw, bd } = spec ? rotatedDims(spec.w, spec.d, rot) : { bw: 2, bd: 2 };
  const half = Math.max(bw, bd) * STUD * Math.max(pieceScale, 0.2) * 0.55;
  const minDist = half + 0.48 / Math.max(0.25, worldScale);
  const camL = worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
  const away = pos.clone().sub(camL);
  away.y = 0;
  if (away.lengthSq() < 1e-8) away.set(0, 0, 1);
  away.normalize();
  const along = pos.clone().sub(camL);
  along.y = 0;
  const dist = along.dot(away);
  if (dist < minDist) {
    pos.x = camL.x + away.x * minDist;
    pos.z = camL.z + away.z * minDist;
  }
  return pos;
}

function occupancy() {
  const map = new Map();
  const add = (x, z, y0, y1, id) => {
    const k = x + "," + z;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push({ y0, y1, id });
  };
  for (const b of bricks) {
    if (b.loose || b.held) continue;
    for (const c of cellsOf(b.gx, b.gy, b.gz, b.spec, b.rot)) add(c.x, c.z, c.y0, c.y1, b.id);
  }
  return map;
}

function collides(gx, gy, gz, spec, rot, ignoreId) {
  const occ = occupancy();
  for (const c of cellsOf(gx, gy, gz, spec, rot)) {
    const list = occ.get(c.x + "," + c.z) || [];
    for (const o of list) {
      if (o.id === ignoreId) continue;
      if (c.y0 < o.y1 && c.y1 > o.y0) return true;
    }
  }
  return false;
}

function overTable(gx, gz, bw, bd) {
  const h = TABLE_N / 2;
  for (let i = 0; i < bw; i++) {
    for (let j = 0; j < bd; j++) {
      const x = gx + i, z = gz + j;
      if (x < -h || x >= h || z < -h || z >= h) return false;
    }
  }
  return true;
}

function supportY(gx, gz, bw, bd) {
  let best = overTable(gx, gz, bw, bd) ? 0 : null;
  for (const b of bricks) {
    if (b.loose || b.held) continue;
    const { bw: ow, bd: od } = rotatedDims(b.spec.w, b.spec.d, b.rot);
    for (let i = 0; i < bw; i++) {
      for (let j = 0; j < bd; j++) {
        const x = gx + i, z = gz + j;
        if (x >= b.gx && x < b.gx + ow && z >= b.gz && z < b.gz + od) {
          const top = b.gy + b.spec.h;
          if (best == null || top > best) best = top;
        }
      }
    }
  }
  return best;
}

function snapPose(localPos, spec, rotQ) {
  const { bw, bd } = rotatedDims(spec.w, spec.d, rotQ);
  const gx = Math.round(localPos.x / STUD - bw / 2);
  const gz = Math.round(localPos.z / STUD - bd / 2);
  let gy = Math.round(localPos.y / PLATE);
  const sup = supportY(gx, gz, bw, bd);
  if (sup != null && localPos.y < sup * PLATE + PLATE * 10) gy = sup;
  gy = Math.max(0, gy);
  if (collides(gx, gy, gz, spec, rotQ)) {
    for (let lift = 1; lift <= 6; lift++) {
      if (!collides(gx, gy + lift, gz, spec, rotQ)) {
        gy += lift;
        break;
      }
    }
  }
  const p = gridToLocal(gx, gy, gz, spec, rotQ);
  const dist = p.distanceTo(localPos);
  const joined = dist < STUD * 1.35;
  return { gx, gy, gz, rot: rotQ, spec, pos: p, joined, dist };
}

function connectNew(b) {
  b.links = new Set();
  if (b.gy === 0 && overTable(b.gx, b.gz, rotatedDims(b.spec.w, b.spec.d, b.rot).bw, rotatedDims(b.spec.w, b.spec.d, b.rot).bd)) {
    b.onTable = true;
  }
  const topNeed = b.gy;
  for (const o of bricks) {
    if (o === b || o.loose || o.held) continue;
    const oTop = o.gy + o.spec.h;
    if (oTop !== topNeed && b.gy + b.spec.h !== o.gy) continue;
    const { bw, bd } = rotatedDims(b.spec.w, b.spec.d, b.rot);
    const od = rotatedDims(o.spec.w, o.spec.d, o.rot);
    let overlap = false;
    for (let i = 0; i < bw && !overlap; i++) {
      for (let j = 0; j < bd; j++) {
        const x = b.gx + i, z = b.gz + j;
        if (x >= o.gx && x < o.gx + od.bw && z >= o.gz && z < o.gz + od.bd) { overlap = true; break; }
      }
    }
    if (overlap) {
      b.links.add(o.id);
      o.links.add(b.id);
    }
  }
}

function groundedIds() {
  const byId = new Map(bricks.map((b) => [b.id, b]));
  const seen = new Set();
  const q = [];
  for (const b of bricks) {
    if (!b.loose && !b.held && b.onTable) { seen.add(b.id); q.push(b.id); }
  }
  while (q.length) {
    const id = q.pop();
    const b = byId.get(id);
    if (!b) continue;
    for (const n of b.links || []) {
      if (!seen.has(n)) { seen.add(n); q.push(n); }
    }
  }
  return seen;
}

function breakApart(ids, impulse, origin) {
  const set = new Set(ids);
  for (const b of bricks) {
    if (!set.has(b.id)) continue;
    for (const n of [...(b.links || [])]) {
      const o = bricks.find((x) => x.id === n);
      if (o) o.links.delete(b.id);
    }
    b.links = new Set();
    b.onTable = false;
    b.loose = true;
    const dir = b.group.position.clone().sub(origin);
    dir.y += 0.01;
    if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, 1, Math.random() - 0.5);
    dir.normalize();
    b.vel = dir.multiplyScalar(impulse * (0.7 + Math.random() * 0.6));
    b.spin = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(6);
  }
  const g = groundedIds();
  for (const b of bricks) {
    if (b.held || b.loose) continue;
    if (!g.has(b.id)) {
      b.loose = true;
      b.vel = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4);
      b.spin = new THREE.Vector3(0, Math.random() - 0.5, 0);
    }
  }
}

function addBrick(spec, col, gx, gy, gz, rotQ, loose = false) {
  if (bricks.length >= MAX_BRICKS) return null;
  const mesh = makeBrickMesh(spec, col, false);
  const group = new THREE.Group();
  group.add(mesh);
  group.rotation.y = rotQ * Math.PI / 2;
  const pos = gridToLocal(gx, gy, gz, spec, rotQ);
  group.position.copy(pos);
  group.scale.setScalar(pieceScale);
  buildRoot.add(group);
  const b = {
    id: nextId++, spec, col: col.id, gx, gy, gz, rot: rotQ, scale: pieceScale,
    group, mesh, loose, held: false, onTable: false,
    vel: new THREE.Vector3(), spin: new THREE.Vector3(), melt: 0, links: new Set(),
  };
  bricks.push(b);
  if (!loose) connectNew(b);
  return b;
}

function removeBrick(b) {
  for (const n of [...(b.links || [])]) {
    const o = bricks.find((x) => x.id === n);
    if (o) o.links.delete(b.id);
  }
  buildRoot.remove(b.group);
  const i = bricks.indexOf(b);
  if (i >= 0) bricks.splice(i, 1);
}

function addFigAt(localPos, yaw) {
  if (figs.length >= MAX_FIGS) return null;
  const f = makeFig(figCfg);
  const y = heightAt(localPos.x, localPos.z);
  f.position.set(localPos.x, y, localPos.z);
  f.rotation.y = yaw || 0;
  f.scale.setScalar(pieceScale);
  f.userData.baseScale = pieceScale;
  f.userData.origin = f.position.clone();
  f.userData.held = false;
  f.userData.loose = false;
  buildRoot.add(f);
  figs.push(f);
  return f;
}

function heightAt(x, z) {
  const gx = Math.floor(x / STUD + TABLE_N / 2) - TABLE_N / 2;
  const gz = Math.floor(z / STUD + TABLE_N / 2) - TABLE_N / 2;
  let best = 0;
  const half = TABLE_N / 2;
  if (gx < -half || gx >= half || gz < -half || gz >= half) best = -TABLE_Y / worldScale;
  for (const b of bricks) {
    if (b.loose || b.held) continue;
    const { bw, bd } = rotatedDims(b.spec.w, b.spec.d, b.rot);
    if (gx < b.gx || gx >= b.gx + bw || gz < b.gz || gz >= b.gz + bd) continue;
    let top = (b.gy + b.spec.h) * PLATE;
    if (b.spec.kind === "stairs") {
      let u = (gx - b.gx) / Math.max(1, bw);
      let v = (gz - b.gz) / Math.max(1, bd);
      if (b.rot % 4 === 1) v = u;
      else if (b.rot % 4 === 2) v = 1 - v;
      else if (b.rot % 4 === 3) v = 1 - u;
      if (b.rot % 4 === 0) { /* v as-is, rise along +z */ }
      top = b.gy * PLATE + v * b.spec.h * PLATE;
    } else if (b.spec.kind === "slope") {
      let v = (gz - b.gz) / Math.max(1, bd);
      if (b.rot % 4 === 1) v = (gx - b.gx) / Math.max(1, bw);
      top = b.gy * PLATE + v * b.spec.h * PLATE;
    }
    if (top > best) best = top;
  }
  return best;
}

function wallCellSet() {
  const cells = new Set();
  for (const b of bricks) {
    if (b.loose || b.held || b.spec.h < 3) continue;
    const { bw, bd } = rotatedDims(b.spec.w, b.spec.d, b.rot);
    for (let i = 0; i < bw; i++) {
      for (let j = 0; j < bd; j++) cells.add((b.gx + i) + "," + (b.gz + j));
    }
  }
  return cells;
}

function roomAt(gx, gz) {
  const walls = wallCellSet();
  const key = (x, z) => x + "," + z;
  if (walls.has(key(gx, gz))) return null;
  const seen = new Set();
  const q = [[gx, gz]];
  seen.add(key(gx, gz));
  let xmin = gx, xmax = gx, zmin = gz, zmax = gz;
  while (q.length) {
    if (seen.size > 420) return null;
    const [x, z] = q.pop();
    xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
    zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
    const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of nbs) {
      const nx = x + dx, nz = z + dz;
      const k = key(nx, nz);
      if (seen.has(k) || walls.has(k)) continue;
      if (Math.abs(nx - gx) > 16 || Math.abs(nz - gz) > 16) return null;
      seen.add(k);
      q.push([nx, nz]);
    }
  }
  if (seen.size < 6) return null;
  const spanX = xmax - xmin + 1;
  const spanZ = zmax - zmin + 1;
  const edge = (cells) => {
    let w = 0;
    for (const [x, z] of cells) if (walls.has(key(x, z))) w++;
    return cells.length ? w / cells.length : 0;
  };
  const north = [], south = [], east = [], west = [];
  for (let x = xmin; x <= xmax; x++) {
    north.push([x, zmax + 1]);
    south.push([x, zmin - 1]);
  }
  for (let z = zmin; z <= zmax; z++) {
    east.push([xmax + 1, z]);
    west.push([xmin - 1, z]);
  }
  if ([north, south, east, west].some((s) => edge(s) < 0.7)) return null;
  return {
    xmin: xmin * STUD, xmax: (xmax + 1) * STUD,
    zmin: zmin * STUD, zmax: (zmax + 1) * STUD,
    gx, gz, spanX, spanZ,
  };
}

function makeBeaconMesh(kind, ghost = false) {
  const def = BEACONS.find((b) => b.id === kind) || BEACONS[0];
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(STUD * 0.12, STUD * 0.14, STUD * 3.2, 8), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
  pole.position.y = STUD * 1.6;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(STUD * 0.45, 10, 8), new THREE.MeshBasicMaterial({ color: def.col }));
  lamp.position.y = STUD * 3.4;
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(STUD * 2.2, STUD * 1.1),
    new THREE.MeshBasicMaterial({ map: labelTex(def.name, 220, 80), side: THREE.DoubleSide, depthTest: false }),
  );
  flag.position.set(STUD * 1.1, STUD * 2.6, 0);
  g.add(pole, lamp, flag);
  if (ghost) {
    g.traverse((o) => {
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.55;
      }
    });
  }
  g.userData.kind = "beacon";
  g.userData.beacon = def.id;
  return g;
}

function placeBeacon(localPos) {
  const gx = Math.round(localPos.x / STUD);
  const gz = Math.round(localPos.z / STUD);
  const room = roomAt(gx, gz);
  if (!room) {
    hudHint.textContent = "Need four connected walls (up to 30% gaps) to plant a room beacon.";
    return false;
  }
  const mesh = makeBeaconMesh(beaconKind);
  mesh.position.set(gx * STUD, heightAt(gx * STUD, gz * STUD), gz * STUD);
  buildRoot.add(mesh);
  room.type = beaconKind;
  beacons.push({
    type: beaconKind,
    mesh,
    gx, gz,
    xmin: room.xmin, xmax: room.xmax, zmin: room.zmin, zmax: room.zmax,
    room,
  });
  hudHint.textContent = beaconKind + " beacon set — figs will visit this room.";
  return true;
}

function placeFromLocal(localPos, yaw) {
  if (handMode === "hands") return;
  if (handMode === "beacon") {
    placeBeacon(pushOutFromPlayer(localPos.clone(), { w: 2, d: 2 }));
    return;
  }
  if (handMode === "fig" || KINDS[kindI].id === "fig") {
    addFigAt(pushOutFromPlayer(localPos.clone(), { w: 2, d: 2 }), yaw);
    hudHint.textContent = "Fig placed — they wander and climb stairs.";
    return;
  }
  const spec = currentSpec();
  const snap = snapPose(pushOutFromPlayer(localPos.clone(), spec), spec, rot);
  addBrick(spec, currentCol(), snap.gx, snap.gy, snap.gz, snap.rot, !snap.joined && !gravityOn);
}

function spawnPile() {
  const origin = new THREE.Vector3(0, 0.08, 0);
  for (let i = 0; i < 10; i++) {
    const spec = randomSpec();
    const col = COLORS[Math.floor(Math.random() * (COLORS.length - 2))];
    const gx = Math.floor((Math.random() - 0.5) * 10);
    const gz = Math.floor((Math.random() - 0.5) * 10);
    const b = addBrick(spec, col, gx, 8 + i, gz, Math.floor(Math.random() * 4), true);
    if (b) {
      b.vel.set((Math.random() - 0.5) * 0.25, 0.05, (Math.random() - 0.5) * 0.25);
      b.group.position.copy(origin);
      b.group.position.x += (Math.random() - 0.5) * 0.06;
      b.group.position.z += (Math.random() - 0.5) * 0.06;
      b.group.position.y += 0.04 * i * 0.15;
    }
  }
  hudHint.textContent = "A pile of ten random bricks drops on the table.";
}

function nearestThing(localPos, max = 0.04, looseOnly = false) {
  let best = null, bd = max;
  for (const b of bricks) {
    if (b.held) continue;
    if (looseOnly && !b.loose) continue;
    const d = b.group.position.distanceTo(localPos);
    if (d < bd) { bd = d; best = b; }
  }
  for (const f of figs) {
    if (f.userData.held) continue;
    const d = f.position.distanceTo(localPos);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

function detachBrick(b) {
  for (const n of [...(b.links || [])]) {
    const o = bricks.find((x) => x.id === n);
    if (o) o.links.delete(b.id);
  }
  b.links = new Set();
  b.onTable = false;
  b.loose = true;
}

let held = null;
function grab(localPos, any = false) {
  if (held) return;
  const n = nearestThing(localPos, STUD * 8, !any);
  if (!n) return;
  if (n.userData?.kind === "fig") {
    n.userData.held = true;
    n.userData.toss = false;
    n.userData.vel = new THREE.Vector3();
    held = n;
  } else {
    detachBrick(n);
    n.held = true;
    n.loose = true;
    held = n;
  }
}
function dropHeld(snapJoin) {
  if (!held) return;
  const worldV = peakHandWorld();
  const worldSpd = worldV.length();
  const toss = worldSpd > 0.55;
  if (snapJoin == null) snapJoin = !toss;
  const localV = worldV.clone().multiplyScalar(4 / Math.max(0.25, worldScale));
  if (held.userData?.kind === "fig") {
    held.userData.held = false;
    if (!snapJoin && toss) {
      held.userData.toss = true;
      held.userData.vel = localV.clone();
      held.userData.vel.y += 0.28 + worldSpd * 0.08;
    } else {
      const y = heightAt(held.position.x, held.position.z);
      held.position.y = y;
      held.userData.origin = held.position.clone();
      held.userData.toss = false;
      held.userData.vel = new THREE.Vector3();
    }
    held = null;
    return;
  }
  const spec = held.spec;
  const lp = held.group.position.clone();
  if (snapJoin) {
    const snap = snapPose(lp, spec, held.rot);
    held.gx = snap.gx; held.gy = snap.gy; held.gz = snap.gz; held.rot = snap.rot;
    held.group.position.copy(snap.pos);
    held.group.rotation.y = snap.rot * Math.PI / 2;
    held.held = false;
    held.loose = !snap.joined;
    held.vel.set(0, 0, 0);
    if (snap.joined) connectNew(held);
  } else {
    held.held = false;
    held.loose = true;
    if (toss) {
      held.vel.copy(localV);
      held.vel.y += 0.22 + worldSpd * 0.06;
    } else {
      held.vel.set(0, 0, 0);
    }
  }
  held = null;
}

function fireCannon(originWorld, dirWorld) {
  const o = worldToLocal(originWorld);
  const p1 = worldToLocal(originWorld.clone().add(dirWorld));
  const dir = p1.sub(o).normalize();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(STUD * 1.6, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a2c30 }),
  );
  mesh.position.copy(o);
  buildRoot.add(mesh);
  balls.push({ mesh, vel: dir.multiplyScalar(1.6), life: 4 });
}

function explodeBall(ball) {
  const origin = ball.mesh.position.clone();
  const hit = [];
  for (const b of bricks) {
    if (b.held) continue;
    if (b.group.position.distanceTo(origin) < STUD * 6) hit.push(b.id);
  }
  if (hit.length) breakApart(hit, 1.15, origin);
  for (const f of figs) {
    if (f.userData.held) continue;
    const sc = f.userData.baseScale || 1;
    if (f.position.distanceTo(origin) < STUD * 7 * Math.max(1, sc)) {
      f.userData.toss = true;
      const dir = f.position.clone().sub(origin);
      dir.y += 0.02;
      if (dir.lengthSq() < 1e-8) dir.set(Math.random() - 0.5, 1, Math.random() - 0.5);
      f.userData.vel = dir.normalize().multiplyScalar(0.95);
      f.userData.vel.y += 0.45;
    }
  }
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.004, 5, 4),
      new THREE.MeshBasicMaterial({ color: 0x444444 }),
    );
    s.position.copy(origin);
    s.userData.vel = new THREE.Vector3().randomDirection().multiplyScalar(0.4);
    s.userData.life = 0.4;
    buildRoot.add(s);
    fx.push(s);
  }
  buildRoot.remove(ball.mesh);
}

function collapseTable() {
  if (table.userData.dead) return;
  table.userData.dead = true;
  hudHint.textContent = "The table legs give out — it collapses.";
  const start = performance.now();
  const y0 = buildRoot.position.y;
  function fall() {
    const t = Math.min(1, (performance.now() - start) / 900);
    buildRoot.position.y = y0 - t * 0.85;
    table.traverse((o) => {
      if (o.material && o.material.opacity != null) {
        o.material.transparent = true;
        o.material.opacity = 1 - t;
      }
    });
    if (t < 1) requestAnimationFrame(fall);
    else table.visible = false;
  }
  fall();
}

function meltNear(localPos, dt) {
  const world = buildRoot.localToWorld(localPos.clone());
  let standing = 0;
  for (const leg of worldLegs) {
    if (!leg.visible) continue;
    if (leg.position.distanceTo(world) < 0.16) {
      leg.userData.melt = (leg.userData.melt || 0) + dt * 1.15;
      const s = Math.max(0.08, 1 - leg.userData.melt);
      leg.scale.x = s;
      leg.scale.z = s;
      if (leg.material && !leg.material.userData.cloned) {
        leg.material = leg.material.clone();
        leg.material.userData.cloned = true;
      }
      if (leg.material) {
        leg.material.emissive = new THREE.Color(0xff3300);
        leg.material.emissiveIntensity = Math.min(1.4, (leg.userData.melt || 0) * 1.4);
      }
      if (leg.userData.melt >= 1) leg.visible = false;
    }
    if (leg.visible) standing++;
  }
  if (standing === 0) collapseTable();
  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    if (b.held) continue;
    if (b.group.position.distanceTo(localPos) < STUD * 5) {
      b.melt = (b.melt || 0) + dt * 1.6;
      const s = Math.max(0.05, 1 - b.melt);
      b.group.scale.setScalar(s);
      if (!b.mesh.material.userData.cloned) {
        b.mesh.material = b.mesh.material.clone();
        b.mesh.material.userData.cloned = true;
      }
      b.mesh.material.emissive = new THREE.Color(0xff3300);
      b.mesh.material.emissiveIntensity = Math.min(1.4, b.melt * 1.4);
      if (b.melt >= 1) removeBrick(b);
    }
  }
  for (let i = figs.length - 1; i >= 0; i--) {
    const f = figs[i];
    if (f.userData.held) continue;
    const sc = f.userData.baseScale || 1;
    if (f.position.distanceTo(localPos) < STUD * 5.5 * Math.max(1, sc)) {
      f.userData.melt = (f.userData.melt || 0) + dt * 1.6;
      const k = Math.max(0.05, 1 - f.userData.melt);
      f.scale.setScalar((f.userData.baseScale || 1) * k);
      f.traverse((o) => {
        if (o.material && o.material.emissive) {
          if (!o.material.userData.cloned) {
            o.material = o.material.clone();
            o.material.userData.cloned = true;
          }
          o.material.emissive = new THREE.Color(0xff3300);
          o.material.emissiveIntensity = Math.min(1.4, f.userData.melt * 1.4);
        }
      });
      if (f.userData.melt >= 1) {
        buildRoot.remove(f);
        figs.splice(i, 1);
      }
    }
  }
}

function pokePalette(origin, dir) {
  _ray.set(origin, dir);
  _ray.far = 0.7;
  const objs = [...palette.hits];
  if (figPanelOpen) objs.push(...figPanel.hits);
  const hits = _ray.intersectObjects(objs, false);
  const h = hits[0];
  if (!h) return false;
  const p = h.object.userData.pick;
  if (!p) return false;
  if (p.type === "color") colorI = p.i;
  else if (p.type === "dim") dimI = p.i;
  else if (p.type === "tool") {
    if (p.id === "kind") kindI = (kindI + 1) % KINDS.length;
    else if (p.id === "grav") gravityOn = !gravityOn;
    else if (p.id === "swap") swapHands();
    else if (p.id === "zin") setScale(worldScale * 1.25);
    else if (p.id === "zout") setScale(worldScale / 1.25);
    else if (p.id === "figui") {
      figPanelOpen = !figPanelOpen;
      figPanel.group.visible = figPanelOpen;
      kindI = KINDS.findIndex((k) => k.id === "fig");
      if (kindI < 0) kindI = 0;
      if (figPanelOpen) refreshFigPanel();
    }
  } else if (p.type === "figspin") {
    const list = p.key === "head" ? FIG_HEADS : p.key === "torso" ? FIG_TORSOS : FIG_LEGS;
    figCfg[p.key] = (figCfg[p.key] + p.dir + list.length) % list.length;
    refreshFigPanel();
  }
  rebuildGhost();
  setHud();
  return true;
}

function swapHands() {
  palette.group.parent?.remove(palette.group);
  figPanel.group.parent?.remove(figPanel.group);
  laser.parent?.remove(laser);
  flame.parent?.remove(flame);
  paletteHand = paletteHand === 0 ? 1 : 0;
  attachPalette();
  attachLaser();
  attachFlame();
  hudHint.textContent = paletteHand === 0 ? "Palette on left wrist." : "Palette on right wrist.";
}

function setScale(s) {
  worldScale = THREE.MathUtils.clamp(s, 0.12, 48);
  buildRoot.scale.setScalar(worldScale);
  layoutFurniture();
  setHud();
}

function handLocal(ctrlr) {
  ctrlr.updateMatrixWorld();
  ctrlr.getWorldPosition(_v);
  const d = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrlr.getWorldQuaternion(_q));
  const tip = _v.clone().addScaledVector(d, 0.07);
  return { world: tip, dir: d, local: worldToLocal(tip) };
}

function moveRig(dt, xr) {
  const speed = 1.35 * Math.max(0.4, Math.sqrt(worldScale) * 0.45);
  camera.getWorldDirection(_v);
  let fxm = 0, fzm = 0, fy = 0, yaw = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) fzm += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) fzm -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) fxm -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) fxm += 1;
  if (keys.has("KeyQ") || keys.has("Space")) fy += 1;
  if (keys.has("KeyE") || keys.has("ShiftLeft")) fy -= 1;
  if (xr) {
    const l = xrGamepad(0);
    const r = xrGamepad(1);
    const ls = stickXY(l);
    const rs = stickXY(r);
    if (Math.abs(ls.x) > 0.15) fxm += ls.x;
    if (Math.abs(ls.y) > 0.15) fzm += -ls.y;
    if (Math.abs(rs.x) > 0.18) yaw -= rs.x * 1.5 * dt;
    if (Math.abs(rs.y) > 0.18) fy += -rs.y;
  }
  lookYaw += yaw;
  rig.rotation.y = lookYaw;
  if (!xr) {
    camera.rotation.x = lookPitch;
    camera.rotation.order = "YXZ";
  }
  _v.y = 0;
  if (_v.lengthSq() < 1e-6) _v.set(0, 0, -1);
  _v.normalize();
  _v2.crossVectors(_v, new THREE.Vector3(0, 1, 0)).normalize();
  rig.position.addScaledVector(_v, fzm * speed * dt);
  rig.position.addScaledVector(_v2, fxm * speed * dt);
  rig.position.y += fy * speed * dt;
}

function tickPhysics(dt) {
  const g = gravityOn ? 2.4 : 0;
  const floorY = -TABLE_Y + 0.012;
  const half = table.userData.half;
  for (const b of bricks) {
    if (b.held || !b.loose) continue;
    b.vel.y -= g * dt;
    b.vel.multiplyScalar(0.992);
    b.group.position.addScaledVector(b.vel, dt);
    b.group.rotation.x += b.spin.x * dt;
    b.group.rotation.z += b.spin.z * dt;
    b.group.rotation.y += b.spin.y * dt;
    const p = b.group.position;
    let ground = floorY;
    if (Math.abs(p.x) <= half && Math.abs(p.z) <= half) ground = Math.max(ground, 0);
    const top = heightAt(p.x, p.z);
    if (top > ground) ground = top;
    if (p.y < ground) {
      p.y = ground;
      if (b.vel.y < 0) b.vel.y *= -0.15;
      b.vel.x *= 0.7; b.vel.z *= 0.7;
      b.spin.multiplyScalar(0.7);
      if (b.vel.length() < 0.05 && gravityOn) {
        b.vel.set(0, 0, 0);
        b.spin.set(0, 0, 0);
        b.group.rotation.x = 0;
        b.group.rotation.z = 0;
      }
    }
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];
    ball.vel.y -= g * dt;
    ball.mesh.position.addScaledVector(ball.vel, dt);
    ball.life -= dt;
    let hit = false;
    for (const b of bricks) {
      if (b.held) continue;
      if (b.group.position.distanceTo(ball.mesh.position) < STUD * 3.2) { hit = true; break; }
    }
    if (!hit) {
      for (const f of figs) {
        if (f.userData.held) continue;
        const sc = f.userData.baseScale || 1;
        if (f.position.distanceTo(ball.mesh.position) < STUD * 3.4 * Math.max(1, sc)) { hit = true; break; }
      }
    }
    if (hit || ball.life <= 0 || ball.mesh.position.y < floorY - 0.2) {
      if (hit) explodeBall(ball);
      else buildRoot.remove(ball.mesh);
      balls.splice(i, 1);
    }
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i];
    p.userData.life -= dt;
    p.position.addScaledVector(p.userData.vel, dt);
    if (p.userData.life <= 0) { buildRoot.remove(p); fx.splice(i, 1); }
  }
  const wander = table.userData.half * 0.9;
  for (const f of figs) {
    if (f.userData.held) continue;
    if (f.userData.toss) {
      const vel = f.userData.vel || new THREE.Vector3();
      vel.y -= g * dt;
      vel.multiplyScalar(0.995);
      f.position.addScaledVector(vel, dt);
      f.rotation.y += vel.x * dt * 4;
      const ground = heightAt(f.position.x, f.position.z);
      if (f.position.y <= ground) {
        f.position.y = ground;
        f.userData.toss = false;
        vel.set(0, 0, 0);
        f.userData.origin = f.position.clone();
      }
      continue;
    }
    tickFig(f, dt, heightAt, wander, beacons.map((b) => b.room).filter(Boolean));
  }
}

function updateGhost() {
  if (handMode === "hands" || !ghost) {
    if (ghost) ghost.visible = false;
    if (held) {
      const h = renderer.xr.isPresenting ? handLocal(buildCtrl()) : { local: aimLocal(camera.getWorldPosition(_v), camera.getWorldDirection(_v2)) };
      if (held.userData?.kind === "fig") held.position.copy(h.local);
      else {
        held.group.position.copy(h.local);
        held.group.rotation.y = held.rot * Math.PI / 2;
      }
    }
    return;
  }
  const xr = renderer.xr.isPresenting;
  let local;
  let yaw = lookYaw;
  if (held) {
    ghost.visible = false;
    const h = xr ? handLocal(buildCtrl()) : { local: aimLocal(camera.getWorldPosition(_v), camera.getWorldDirection(_v2)) };
    if (held.userData?.kind === "fig") {
      held.position.copy(h.local);
    } else {
      const snap = snapPose(h.local, held.spec, held.rot);
      held.group.position.copy(snap.joined ? snap.pos : h.local);
      held.group.rotation.y = held.rot * Math.PI / 2;
    }
    return;
  }
  ghost.visible = true;
  let handDir = new THREE.Vector3(0, 0, -1);
  if (xr) {
    const h = handLocal(buildCtrl());
    local = h.local.clone();
    handDir = h.dir || handDir;
    const e = new THREE.Euler().setFromQuaternion(buildCtrl().getWorldQuaternion(_q), "YXZ");
    yaw = e.y;
  } else {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_v2);
    local = aimLocal(_v, _v2);
    handDir = _v2.clone();
  }
  if (handMode === "beacon") {
    local = pushOutFromPlayer(local, { w: 2, d: 2 });
    local.y = heightAt(local.x, local.z);
    ghost.position.copy(local);
    ghost.rotation.y = yaw;
    const gx = Math.round(local.x / STUD);
    const gz = Math.round(local.z / STUD);
    const ok = !!roomAt(gx, gz);
    ghost.traverse((o) => {
      if (o.material && o.material.color && o.geometry?.type === "SphereGeometry") {
        o.material.color.setHex(ok ? 0x44ee66 : 0xee3344);
      }
    });
  } else if (handMode === "fig" || KINDS[kindI].id === "fig") {
    local = pushOutFromPlayer(local, { w: 2, d: 2 });
    local.y = heightAt(local.x, local.z);
    ghost.position.copy(local);
    ghost.rotation.y = yaw;
    ghost.scale.setScalar(pieceScale);
  } else {
    local = pushOutFromPlayer(local, currentSpec());
    const snap = snapPose(local, currentSpec(), rot);
    ghost.position.copy(snap.pos);
    ghost.rotation.y = rot * Math.PI / 2;
    ghost.scale.setScalar(pieceScale);
    ghost.material && (ghost.material.opacity = snap.joined ? 0.72 : 0.35);
    if (ghost.material) ghost.material.color.setHex(snap.joined ? currentCol().hex : 0x9ee7ff);
  }
}

function cycle(arrI, arr, d) {
  return (arrI + d + arr.length) % arr.length;
}

function brickKindIndex(dir) {
  const ids = KINDS.filter((k) => k.id !== "fig");
  let i = ids.findIndex((k) => k.id === KINDS[kindI].id);
  if (i < 0) i = 0;
  i = (i + dir + ids.length) % ids.length;
  kindI = KINDS.findIndex((k) => k.id === ids[i].id);
}

function cycleHandMode() {
  handMode = HAND_MODES[(HAND_MODES.indexOf(handMode) + 1) % HAND_MODES.length];
  if (held) dropHeld(false);
  rebuildGhost();
  setHud();
  hudHint.textContent = handMode === "brick"
    ? "Brick placing — A color picker, B piece catalog."
    : handMode === "fig"
      ? "Minifig placing — A color, B catalog."
      : "Empty-handed — grab, toss if you swing, else place.";
}

const KIND_TABS = [
  { id: "basic", name: "Basic", kinds: ["brick", "plate", "tile"] },
  { id: "slopes", name: "Slopes", kinds: ["slope", "invslope", "cheese", "wedge"] },
  { id: "round", name: "Round", kinds: ["round", "cone", "cylinder"] },
  { id: "build", name: "Build", kinds: ["arch", "stairs", "jumper", "grille", "corner", "window", "door", "log", "base"] },
  { id: "fig", name: "Figs", kinds: ["fig"] },
  { id: "rooms", name: "Rooms", kinds: [], beacons: true },
];
let catalogTab = 0;

function spawnWorldPanel(group, dist) {
  facePlayer(group, dist || 0.7);
}

const BEACONS = [
  { id: "kitchen", name: "Kitchen", col: 0xff9944 },
  { id: "living", name: "Living", col: 0x44aaff },
  { id: "bedroom", name: "Bedroom", col: 0xcc77ee },
  { id: "bath", name: "Bath", col: 0x66dde8 },
  { id: "dining", name: "Dining", col: 0xe8c44a },
  { id: "garden", name: "Garden", col: 0x44cc66 },
  { id: "workshop", name: "Workshop", col: 0xaa7744 },
];

function makeCatalog() {
  const root = new THREE.Group();
  root.visible = false;
  root.frustumCulled = false;
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.86), uiMat(null, 0xe6b35c));
  frame.position.z = -0.004;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.82), uiMat(null, 0x4d5d73));
  board.position.z = 0;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.05), uiMat(labelTex("PIECE CATALOG", 320, 48)));
  title.position.set(0, 0.365, 0.012);
  title.renderOrder = 8;
  root.add(frame, board, title);
  const hits = [];
  KIND_TABS.forEach((tab, i) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.048), uiMat(labelTex(tab.name, 220, 64)));
    pl.position.set(-0.28 + i * 0.115, 0.3, 0.012);
    pl.renderOrder = 8;
    pl.userData.catTab = i;
    root.add(pl);
    hits.push(pl);
  });
  const items = [];
  function fill() {
    while (items.length) {
      const m = items.pop();
      m.traverse((o) => {
        const ix = hits.indexOf(o);
        if (ix >= 0) hits.splice(ix, 1);
      });
      m.parent?.remove(m);
    }
    const tab = KIND_TABS[catalogTab];
    const list = tab.beacons ? BEACONS.map((b) => ({ id: "beacon:" + b.id, name: b.name })) : tab.kinds.map((id) => {
      const k = KINDS.find((x) => x.id === id);
      return { id, name: k ? k.name : id };
    });
    list.forEach((it, i) => {
      const wrap = new THREE.Group();
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), uiMat(null, 0x243044));
      const beacon = BEACONS.find((b) => "beacon:" + b.id === it.id);
      const thumb = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 0.1),
        uiMat(catalogThumbTex(it.id, beacon?.col)),
      );
      thumb.position.set(-0.105, 0, 0.003);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), uiMat(labelTex(it.name, 260, 80)));
      pl.position.set(0.07, 0, 0.003);
      wrap.add(bg, thumb, pl);
      wrap.position.set(-0.17 + (i % 2) * 0.35, 0.16 - Math.floor(i / 2) * 0.13, 0.012);
      wrap.renderOrder = 8;
      const tag = it.id.startsWith("beacon:")
        ? { catBeacon: it.id.slice(7) }
        : { catKind: it.id };
      Object.assign(pl.userData, tag);
      Object.assign(bg.userData, tag);
      Object.assign(thumb.userData, tag);
      root.add(wrap);
      hits.push(pl, bg, thumb);
      items.push(wrap);
    });
  }
  fill();
  scene.add(root);
  return {
    root,
    hits,
    fill,
    setTab(i) {
      catalogTab = i;
      fill();
    },
  };
}
const catalog = makeCatalog();

function hsvCanvas() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 176;
  const g = c.getContext("2d");
  g.direction = "ltr";
  for (let x = 0; x < 256; x++) {
    for (let y = 0; y < 176; y++) {
      const h = x / 256;
      const s = 1;
      const v = 1 - y / 176;
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      let r, gc, b;
      if (i % 6 === 0) { r = v; gc = t; b = p; }
      else if (i % 6 === 1) { r = q; gc = v; b = p; }
      else if (i % 6 === 2) { r = p; gc = v; b = t; }
      else if (i % 6 === 3) { r = p; gc = q; b = v; }
      else if (i % 6 === 4) { r = t; gc = p; b = v; }
      else { r = v; gc = p; b = q; }
      g.fillStyle = `rgb(${(r * 255) | 0},${(gc * 255) | 0},${(b * 255) | 0})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  tex.needsUpdate = true;
  return { canvas: c, tex };
}

function makeHexPicker() {
  const root = new THREE.Group();
  root.visible = false;
  root.frustumCulled = false;
  const hsv = hsvCanvas();
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.42), uiMat(null, 0xe6b35c));
  frame.position.z = -0.003;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.29), uiMat(hsv.tex));
  pl.position.y = 0.03;
  pl.position.z = 0.004;
  pl.userData.hexPick = true;
  const cap = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTex("tap a color", 280, 48),
    depthTest: false,
    depthWrite: false,
  }));
  cap.position.set(0, -0.175, 0.03);
  cap.scale.set(0.36, 0.06, 1);
  cap.renderOrder = 9;
  root.add(frame, pl, cap);
  scene.add(root);
  return { root, hits: [pl], canvas: hsv.canvas };
}
const hexPicker = makeHexPicker();

function makeSizeSlider() {
  const root = new THREE.Group();
  root.visible = false;
  root.frustumCulled = false;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.028, 0.028), new THREE.MeshBasicMaterial({ color: 0x1a1d24 }));
  bar.userData.sliderBar = true;
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, depthWrite: false }),
  );
  track.userData.sliderBar = true;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 12), new THREE.MeshBasicMaterial({ color: 0xe6b35c }));
  knob.userData.sliderKnob = true;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.065), uiMat(labelTex("SIZE 1.0x", 240, 64)));
  lab.position.set(0, 0.09, 0.02);
  lab.renderOrder = 8;
  root.add(bar, track, knob, lab);
  scene.add(root);
  return { root, knob, lab, hits: [bar, track, knob] };
}
const sizeSlider = makeSizeSlider();
let sliderArmed = false;
let sliderGrab = false;
let sliderNear = false;

function syncSliderKnob() {
  const t = THREE.MathUtils.clamp((pieceScale - 0.1) / 9.9, 0, 1);
  sizeSlider.knob.position.x = (t - 0.5) * 0.32;
  if (sizeSlider.lab.material.map) sizeSlider.lab.material.map.dispose();
  sizeSlider.lab.material.map = labelTex("SIZE " + pieceScale.toFixed(1) + "x", 240, 64);
  sizeSlider.lab.material.needsUpdate = true;
}
syncSliderKnob();

function showSizeSlider(xr) {
  sliderArmed = true;
  if (xr) {
    const left = ctrl[0];
    if (sizeSlider.root.parent !== left) {
      sizeSlider.root.parent?.remove(sizeSlider.root);
      left.add(sizeSlider.root);
    }
    sizeSlider.root.position.set(0, 0.08, -0.2);
    sizeSlider.root.rotation.set(-0.55, 0, 0);
  } else {
    if (sizeSlider.root.parent !== scene) {
      sizeSlider.root.parent?.remove(sizeSlider.root);
      scene.add(sizeSlider.root);
    }
    spawnWorldPanel(sizeSlider.root, 0.55);
  }
  sizeSlider.root.visible = true;
  syncSliderKnob();
  hudHint.textContent = "Grab the gold knob and drag left/right to set size.";
}

function hideSizeSlider() {
  sliderArmed = false;
  sliderGrab = false;
  sliderNear = false;
  sizeSlider.root.visible = false;
  if (sizeSlider.root.parent !== scene) {
    sizeSlider.root.parent?.remove(sizeSlider.root);
    scene.add(sizeSlider.root);
  }
  rebuildGhost();
  setHud();
}

function applyPickedHex(hex) {
  const id = "hex" + hex.toString(16).padStart(6, "0");
  let col = COLORS.find((c) => c.id === id);
  if (!col) {
    col = { id, name: "#" + id.slice(3), hex };
    COLORS.push(col);
  }
  colorI = COLORS.indexOf(col);
  hexPicker.root.visible = false;
  rebuildGhost();
  setHud();
  hudHint.textContent = "Color set to " + col.name;
}

function pokeUi(origin, dir) {
  _ray.set(origin, dir);
  _ray.far = 2.6;
  if (hexPicker.root.visible) {
    const hits = _ray.intersectObjects(hexPicker.hits, false);
    const h = hits[0];
    if (h && h.uv) {
      const x = Math.max(0, Math.min(255, (h.uv.x * 256) | 0));
      const y = Math.max(0, Math.min(175, ((1 - h.uv.y) * 176) | 0));
      const ctx = hexPicker.canvas.getContext("2d");
      const d = ctx.getImageData(x, y, 1, 1).data;
      applyPickedHex((d[0] << 16) | (d[1] << 8) | d[2]);
      return true;
    }
  }
  if (catalog.root.visible) {
    const hits = _ray.intersectObjects(catalog.hits, false);
    const obj = hits[0]?.object;
    if (obj?.userData?.catTab != null) {
      catalogTab = obj.userData.catTab;
      catalog.fill();
      return true;
    }
    if (obj?.userData?.catBeacon) {
      beaconKind = obj.userData.catBeacon;
      handMode = "beacon";
      catalog.root.visible = false;
      rebuildGhost();
      setHud();
      hudHint.textContent = "Beacon: " + beaconKind + " — place in a 4-wall room (up to 30% gaps).";
      return true;
    }
    if (obj?.userData?.catKind) {
      const id = obj.userData.catKind;
      kindI = KINDS.findIndex((k) => k.id === id);
      if (id === "fig") handMode = "fig";
      else handMode = "brick";
      catalog.root.visible = false;
      rebuildGhost();
      setHud();
      return true;
    }
  }
  return false;
}

function clearWorld() {
  if (held) dropHeld(false);
  while (bricks.length) removeBrick(bricks[0]);
  while (figs.length) {
    const f = figs.pop();
    buildRoot.remove(f);
  }
  while (beacons.length) {
    const b = beacons.pop();
    b.mesh.parent?.remove(b.mesh);
  }
}

function saveSlot(n) {
  const data = {
    v: 1,
    scale: worldScale,
    gravity: gravityOn,
    bricks: bricks.map((b) => ({
      dim: b.spec.dimId,
      kind: b.spec.kind,
      col: b.col,
      gx: b.gx, gy: b.gy, gz: b.gz, rot: b.rot, loose: !!b.loose,
      x: b.group.position.x, y: b.group.position.y, z: b.group.position.z,
    })),
    figs: figs.map((f) => ({
      cfg: f.userData.cfg,
      scale: f.userData.baseScale || 1,
      x: f.position.x, y: f.position.y, z: f.position.z, yaw: f.rotation.y,
    })),
    beacons: beacons.map((b) => ({
      type: b.type, gx: b.gx, gz: b.gz,
      xmin: b.xmin, xmax: b.xmax, zmin: b.zmin, zmax: b.zmax,
    })),
  };
  try {
    localStorage.setItem(SAVE_PREFIX + n, JSON.stringify(data));
    hudHint.textContent = "Saved map to slot " + n + ".";
    return true;
  } catch {
    hudHint.textContent = "Could not save (storage full).";
    return false;
  }
}

function loadSlot(n) {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_PREFIX + n) || "null"); } catch { data = null; }
  if (!data) {
    hudHint.textContent = "Slot " + n + " is empty.";
    return false;
  }
  clearWorld();
  if (data.scale) setScale(data.scale);
  gravityOn = data.gravity !== false;
  for (const b of data.bricks || []) {
    const spec = shapeSpec(dimOf(b.dim || "2x4"), b.kind || "brick");
    const nb = addBrick(spec, colorOf(b.col), b.gx || 0, b.gy || 0, b.gz || 0, b.rot || 0, !!b.loose);
    if (nb && b.loose && b.x != null) nb.group.position.set(b.x, b.y, b.z);
  }
  const keepScale = pieceScale;
  for (const f of data.figs || []) {
    figCfg = { ...defaultFigConfig(), ...(f.cfg || {}) };
    pieceScale = f.scale || 1;
    addFigAt(new THREE.Vector3(f.x || 0, f.y || 0, f.z || 0), f.yaw || 0);
  }
  pieceScale = keepScale;
  for (const b of data.beacons || []) {
    beaconKind = b.type || "kitchen";
    const mesh = makeBeaconMesh(beaconKind);
    mesh.position.set((b.gx || 0) * STUD, heightAt((b.gx || 0) * STUD, (b.gz || 0) * STUD), (b.gz || 0) * STUD);
    buildRoot.add(mesh);
    beacons.push({
      type: beaconKind, mesh, gx: b.gx, gz: b.gz,
      xmin: b.xmin, xmax: b.xmax, zmin: b.zmin, zmax: b.zmax,
      room: { xmin: b.xmin, xmax: b.xmax, zmin: b.zmin, zmax: b.zmax, type: beaconKind },
    });
  }
  figCfg = defaultFigConfig();
  rebuildGhost();
  setHud();
  hudHint.textContent = "Loaded map from slot " + n + ".";
  return true;
}

const MENU_ITEMS = [
  { id: "resume", label: "Resume" },
  { id: "save1", label: "Save slot 1" },
  { id: "save2", label: "Save slot 2" },
  { id: "save3", label: "Save slot 3" },
  { id: "load1", label: "Load slot 1" },
  { id: "load2", label: "Load slot 2" },
  { id: "load3", label: "Load slot 3" },
  { id: "pile", label: "Dump a pile" },
  { id: "new", label: "New table" },
  { id: "grav", label: "Toggle gravity" },
];

function makeVrMenu() {
  const root = new THREE.Group();
  root.visible = false;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.78),
    new THREE.MeshLambertMaterial({ color: 0x1a1d24, side: THREE.DoubleSide }),
  );
  root.add(board);
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.05),
    new THREE.MeshBasicMaterial({ map: labelTex("WORKSHOP MENU", 320, 48), transparent: true, side: THREE.DoubleSide }),
  );
  title.position.set(0, 0.34, 0.008);
  root.add(title);
  const hits = [];
  MENU_ITEMS.forEach((it, i) => {
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.052),
      new THREE.MeshBasicMaterial({ map: labelTex(it.label, 320, 48), transparent: true, side: THREE.DoubleSide }),
    );
    pl.position.set(0, 0.27 - i * 0.058, 0.008);
    pl.userData.menu = it.id;
    root.add(pl);
    hits.push(pl);
  });
  scene.add(root);
  return { root, hits };
}
const vrMenu = makeVrMenu();
const htmlMenu = document.getElementById("bb-menu");

function onMenuPick(id) {
  if (id === "resume") { closeMenu(); return; }
  if (id === "pile") spawnPile();
  if (id === "new") { clearWorld(); closeMenu(); return; }
  if (id === "grav") { gravityOn = !gravityOn; setHud(); }
  if (id.startsWith("save")) saveSlot(Number(id.slice(4)));
  if (id.startsWith("load")) { loadSlot(Number(id.slice(4))); closeMenu(); }
}

function openMenu() {
  menuOpen = true;
  if (renderer.xr.isPresenting) {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_v2);
    vrMenu.root.position.copy(_v).addScaledVector(_v2, 0.8);
    vrMenu.root.lookAt(_v);
    vrMenu.root.visible = true;
    if (htmlMenu) htmlMenu.hidden = true;
  } else if (htmlMenu) {
    htmlMenu.hidden = false;
    document.exitPointerLock?.();
  }
}

function closeMenu() {
  menuOpen = false;
  vrMenu.root.visible = false;
  if (htmlMenu) htmlMenu.hidden = true;
}

function pokeVrMenu(origin, dir) {
  _ray.set(origin, dir);
  _ray.far = 2.4;
  const hits = _ray.intersectObjects(vrMenu.hits, false);
  const h = hits[0];
  if (!h?.object?.userData?.menu) return false;
  onMenuPick(h.object.userData.menu);
  return true;
}

if (htmlMenu) {
  htmlMenu.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-m]");
    if (b) onMenuPick(b.dataset.m);
  });
}

function trackBuildHand(dt) {
  const xr = renderer.xr.isPresenting;
  const ctrlr = buildCtrl();
  const h = xr ? handLocal(ctrlr) : { local: aimLocal(camera.getWorldPosition(_v), camera.getWorldDirection(_v2)), world: null };
  const world = h.world || buildRoot.localToWorld(h.local.clone());
  if (handPrevW) {
    handVelWorld.copy(world).sub(handPrevW).multiplyScalar(1 / Math.max(dt, 0.008));
    velBuf.push(handVelWorld.clone());
    if (velBuf.length > 12) velBuf.shift();
  }
  handPrevW = world.clone();
  if (handPrev) {
    handVel.copy(h.local).sub(handPrev).multiplyScalar(1 / Math.max(dt, 0.008));
  }
  handPrev = h.local.clone();
}

let last = 0;
function loop(t) {
  const now = t * 0.001;
  const dt = Math.min(0.05, last ? now - last : 0.016);
  last = now;
  const xr = renderer.xr.isPresenting;
  if (!menuOpen) moveRig(dt, xr);
  trackBuildHand(dt);

  const gpR = xrGamepad(1);
  const gpL = xrGamepad(0);
  const bldGp = paletteHand === 0 ? gpR : gpL;
  const trig = !!(bldGp?.buttons?.[0]?.pressed) || (!xr && mouse.down);
  const gripB = !!(bldGp?.buttons?.[1]?.pressed);
  const aBtn = !!(gpR?.buttons?.[4]?.pressed);
  const bBtn = !!(gpR?.buttons?.[5]?.pressed);
  const xBtn = !!(gpL?.buttons?.[4]?.pressed);
  const yBtn = !!(gpL?.buttons?.[5]?.pressed);
  const rStick = !!(gpR?.buttons?.[3]?.pressed);
  const lStick = !!(gpL?.buttons?.[3]?.pressed);
  const lMenu = !!(gpL?.buttons?.[2]?.pressed || gpL?.buttons?.[6]?.pressed || gpL?.buttons?.[16]?.pressed);
  const lTrig = !!(gpL?.buttons?.[0]?.pressed);

  if (xr) {
    if (lMenu && !pressed.lmenu) {
      if (menuOpen) closeMenu();
      else openMenu();
    }
    if (lStick && !pressed.lsc && !menuOpen) {
      rot = (rot + 1) % 4;
      if (held && held.rot != null) held.rot = rot;
      rebuildGhost();
    }
    if (rStick && !pressed.rsc && !menuOpen) cycleHandMode();

    const aimCtrl = buildCtrl();
    aimCtrl.updateMatrixWorld();
    const aimO = aimCtrl.getWorldPosition(_v).clone();
    const aimD = new THREE.Vector3(0, 0, -1).applyQuaternion(aimCtrl.getWorldQuaternion(_q)).normalize();

    if (lTrig && !pressed.ltrig) {
      if (sliderArmed) hideSizeSlider();
      else showSizeSlider(true);
    }
    sliderNear = false;
    if (sliderArmed && sizeSlider.root.visible) {
      const right = ctrl[1];
      right.updateMatrixWorld();
      const tip = handLocal(right);
      const local = sizeSlider.root.worldToLocal(tip.world.clone());
      sliderNear = Math.abs(local.y) < 0.16 && Math.abs(local.z) < 0.16 && Math.abs(local.x) < 0.28;
      if ((trig || gripB) && (sliderGrab || sliderNear)) {
        sliderGrab = true;
        const t = THREE.MathUtils.clamp((local.x + 0.19) / 0.38, 0, 1);
        pieceScale = 0.1 + t * 9.9;
        if (ghost) {
          ghost.scale.setScalar(pieceScale);
          if (ghost.userData) ghost.userData.baseScale = pieceScale;
        }
        syncSliderKnob();
        setHud();
      }
      if (!trig && !gripB) sliderGrab = false;
    }

    if (menuOpen) {
      if (trig && !pressed.t1) pokeVrMenu(aimO, aimD);
    } else {
      if (aBtn && !pressed.a) {
        if (pokeUi(aimO, aimD) || (menuOpen && pokeVrMenu(aimO, aimD)) || pokePalette(aimO, aimD)) {
          /* A confirms whatever the laser is on */
        } else if (hexPicker.root.visible) {
          hexPicker.root.visible = false;
        } else {
          spawnWorldPanel(hexPicker.root, 0.7);
        }
      }
      if (bBtn && !pressed.b) {
        if (catalog.root.visible) catalog.root.visible = false;
        else {
          catalog.fill();
          spawnWorldPanel(catalog.root, 0.9);
        }
      }
      if (trig && !pressed.t1) {
        if (sliderGrab || sliderNear) {
          /* dragging size */
        } else if (pokeUi(aimO, aimD)) {
          /* picked */
        } else if (handMode === "hands" || held) {
          if (held) dropHeld(null);
          else grab(handLocal(buildCtrl()).local, true);
        } else placeFromLocal(handLocal(buildCtrl()).local, lookYaw);
      }
      if (gripB && !pressed.g1) {
        if (!(sliderGrab || sliderNear) && !held) grab(handLocal(buildCtrl()).local, true);
      }
      if (!gripB && pressed.g1 && held) dropHeld(null);
      if (yBtn && !pressed.y) {
        const h = handLocal(buildCtrl());
        fireCannon(h.world, h.dir);
      }
      if (xBtn) {
        xHold += dt;
        flame.visible = xHold > 0.28;
        if (xHold > 0.28) {
          flame.children.forEach((c, i) => {
            c.position.y = 0.01 + Math.abs(Math.sin(now * 8 + i)) * 0.05;
            c.scale.setScalar(0.6 + Math.sin(now * 12 + i) * 0.3);
          });
          meltNear(handLocal(buildCtrl()).local, dt);
        }
      } else {
        xHold = 0;
        flame.visible = false;
      }
    }
    pressed.t1 = trig;
    pressed.g1 = gripB;
    pressed.a = aBtn;
    pressed.b = bBtn;
    pressed.x = xBtn;
    pressed.y = yBtn;
    pressed.rsc = rStick;
    pressed.lsc = lStick;
    pressed.lmenu = lMenu;
    pressed.ltrig = lTrig;
  } else if (mouse.down || pressed.t1) {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_v2);
    if (mouse.down && !pressed.t1 && !menuOpen) {
      const lp = aimLocal(_v.clone(), _v2.clone());
      if (hexPicker.root.visible || catalog.root.visible) {
        camera.getWorldPosition(_v);
        camera.getWorldDirection(_v2);
        pokeUi(_v.clone(), _v2.clone());
      } else if (handMode === "hands" || held) {
        if (held) dropHeld(null);
        else grab(lp, true);
      } else placeFromLocal(lp, lookYaw);
    }
    pressed.t1 = mouse.down;
  }

  updateGhost();
  tickPhysics(dt);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(loop);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "Escape") { if (menuOpen) closeMenu(); else openMenu(); return; }
  if (menuOpen) return;
  if (e.code === "Tab") { e.preventDefault(); cycleHandMode(); return; }
  if (e.code === "BracketLeft" || e.code === "Minus") setScale(worldScale / 1.2);
  if (e.code === "BracketRight" || e.code === "Equal") setScale(worldScale * 1.2);
  if (e.code === "KeyG") { gravityOn = !gravityOn; setHud(); }
  if (e.code === "KeyH") swapHands();
  if (e.code === "KeyR") { rot = (rot + 1) % 4; rebuildGhost(); }
  if (e.code === "KeyC") {
    if (hexPicker.root.visible) hexPicker.root.visible = false;
    else spawnWorldPanel(hexPicker.root, 0.7);
  }
  if (e.code === "KeyV") { dimI = cycle(dimI, DIMS, 1); rebuildGhost(); setHud(); }
  if (e.code === "KeyB") {
    if (catalog.root.visible) catalog.root.visible = false;
    else { catalog.fill(); spawnWorldPanel(catalog.root, 0.9); }
  }
  if (e.code === "KeyT") {
    if (sliderArmed) hideSizeSlider();
    else showSizeSlider(false);
  }
  if (e.code === "Comma") {
    pieceScale = Math.max(0.1, pieceScale / 1.25);
    if (ghost) { ghost.scale.setScalar(pieceScale); if (ghost.userData) ghost.userData.baseScale = pieceScale; }
    syncSliderKnob(); setHud();
  }
  if (e.code === "Period") {
    pieceScale = Math.min(10, pieceScale * 1.25);
    if (ghost) { ghost.scale.setScalar(pieceScale); if (ghost.userData) ghost.userData.baseScale = pieceScale; }
    syncSliderKnob(); setHud();
  }
  if (e.code === "KeyF") {
    const lp = worldToLocal(camera.getWorldPosition(_v).add(camera.getWorldDirection(_v2).multiplyScalar(0.4)));
    if (held) dropHeld(handMode === "hands" ? false : true);
    else grab(lp, handMode === "hands");
  }
  if (e.code === "KeyY") {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_v2);
    fireCannon(_v.clone(), _v2.clone());
  }
  if (e.code === "KeyX") {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_v2);
    meltNear(worldToLocal(_v.addScaledVector(_v2, 0.4)), 0.4);
  }
  if (e.code === "KeyP" || e.code === "Digit0") spawnPile();
  if (e.code === "KeyM") { if (menuOpen) closeMenu(); else openMenu(); }
  if (e.code === "Digit1") saveSlot(1);
  if (e.code === "Digit2") saveSlot(2);
  if (e.code === "Digit3") saveSlot(3);
  if (e.code === "Digit4") loadSlot(1);
  if (e.code === "Digit5") loadSlot(2);
  if (e.code === "Digit6") loadSlot(3);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
canvas.addEventListener("click", () => {
  if (startEl.style.display === "none" && !menuOpen) canvas.requestPointerLock?.();
});
document.addEventListener("pointerlockchange", () => {
  mouse.locked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (e) => {
  if (mouse.locked) {
    lookYaw -= e.movementX * 0.0025;
    lookPitch -= e.movementY * 0.0025;
    lookPitch = THREE.MathUtils.clamp(lookPitch, -1.2, 1.2);
  } else {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
});
document.addEventListener("mousedown", () => { mouse.down = true; });
document.addEventListener("mouseup", () => { mouse.down = false; });

function beginDesktop() {
  startEl.style.display = "none";
  canvas.requestPointerLock?.();
}
document.getElementById("go-desk").onclick = beginDesktop;
document.getElementById("go-vr").onclick = async () => {
  startEl.style.display = "none";
  const xr = navigator.xr;
  if (!xr?.requestSession) { beginDesktop(); return; }
  try {
    const session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
    await renderer.xr.setSession(session);
  } catch {
    try {
      const session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
      await renderer.xr.setSession(session);
    } catch { beginDesktop(); }
  }
};
const btn = XRButton.createButton(renderer, { optionalFeatures: ["local-floor"] });
btn.style.display = "none";
document.body.append(btn);
setHud();

(function seedTable() {
  const put = (dim, kind, col, gx, gz, r = 0) => {
    addBrick(shapeSpec(dimOf(dim), kind), colorOf(col), gx, 0, gz, r, false);
  };
  put("2x4", "brick", "red", -4, -2);
  put("2x4", "brick", "blue", 0, -2);
  put("2x2", "brick", "yellow", 4, -2);
  put("2x8", "plate", "green", -6, 2);
  put("6x6", "stairs", "tan", 4, 4);
  put("2x4", "slope", "orange", -8, 4, 1);
  figCfg = { head: 0, torso: 0, legs: 0 };
  addFigAt(new THREE.Vector3(0.05, 0, 0.06), 0.4);
  figCfg = { head: 2, torso: 3, legs: 1 };
  addFigAt(new THREE.Vector3(-0.04, 0, 0.03), -0.6);
  figCfg = defaultFigConfig();
})();

window.__bb = {
  bricks, figs, beacons, spawnPile, setScale, addBrick, saveSlot, loadSlot, clearWorld,
  catalog, hexPicker, sizeSlider, roomAt, placeBeacon,
  placeFig: (x, z) => addFigAt(new THREE.Vector3(x || 0, 0, z || 0), 0),
  openCatalog: () => { catalog.fill(); spawnWorldPanel(catalog.root, 0.9); },
  openHex: () => spawnWorldPanel(hexPicker.root, 0.7),
  openSlider: () => showSizeSlider(false),
  setPieceScale: (s) => { pieceScale = s; syncSliderKnob(); rebuildGhost(); setHud(); },
  get scale() { return worldScale; },
  get pieceScale() { return pieceScale; },
  get gravity() { return gravityOn; },
  peakHand: peakHandWorld,
};
