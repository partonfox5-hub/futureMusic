import * as THREE from "three";
import { HEADS, TORSOS, LEGS, SIZES, PALETTE, FOOD, PETS, HATS } from "./critters.js";

export const TABS = ["PETS", "FOOD", "BUILD", "PORTAL", "HATS", "MIRA", "HELP"];

const W = 1280;
const H = 800;

export function createState() {
  return {
    tab: "PETS",
    head: 2,
    torso: 0,
    legs: 3,
    size: 2,
    color: 3,
    legCount: 4,
    hint: "Squeeze grip to hide this menu. Trigger clicks a button.",
  };
}

function round(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function hex(n) {
  return "#" + (n >>> 0).toString(16).padStart(6, "0");
}

export function createWorldMenu() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.FrontSide,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.575), mat);
  mesh.renderOrder = 20;
  mesh.name = "hp-menu";
  mesh.userData.kind = "menu";
  const hits = [];
  const state = createState();
  const group = new THREE.Group();
  group.add(mesh);
  group.userData.kind = "menu";

  function addHit(x, y, w, h, action) {
    hits.push({ x, y, w, h, action });
  }

  function button(x, y, w, h, label, action, opt) {
    const on = !!(opt && opt.on);
    const fill = (opt && opt.fill) || (on ? "#7eb6ff" : "#2a2420");
    ctx.fillStyle = fill;
    round(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = on ? "#e8f4ff" : "#8a7a68";
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = on ? "#111" : (opt && opt.ink) || "#f4efe8";
    ctx.font = (opt && opt.font) || "700 22px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    addHit(x, y, w, h, action);
  }

  function paint() {
    hits.length = 0;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(16,12,10,0.94)";
    round(ctx, 8, 8, W - 16, H - 16, 22);
    ctx.fill();
    ctx.strokeStyle = "#7eb6ff";
    ctx.lineWidth = 4;
    round(ctx, 8, 8, W - 16, H - 16, 22);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#7eb6ff";
    ctx.font = "800 18px system-ui,Segoe UI,sans-serif";
    ctx.fillText("HUMANPLUS  ·  MIRA + CRITTER DEN", 36, 48);
    ctx.fillStyle = "#d8d0c6";
    ctx.font = "16px system-ui,Segoe UI,sans-serif";
    ctx.fillText(state.hint, 36, 74);

    const tw = 164, th = 48, ts = 10;
    TABS.forEach((t, i) => {
      button(22 + i * (tw + ts), 96, tw, th, t, { type: "tab", id: t }, { on: state.tab === t, font: "700 18px system-ui,Segoe UI,sans-serif" });
    });

    const y0 = 168;
    if (state.tab === "PETS") drawPets(y0);
    else if (state.tab === "FOOD") drawFood(y0);
    else if (state.tab === "BUILD") drawBuild(y0);
    else if (state.tab === "PORTAL") drawPortal(y0);
    else if (state.tab === "HATS") drawHats(y0);
    else if (state.tab === "MIRA") drawMira(y0);
    else drawHelp(y0);

    tex.needsUpdate = true;
  }

  function drawPets(y0) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "700 22px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Tap a creature. It appears on the floor in front of you.", 36, y0);
    ctx.font = "16px system-ui,Segoe UI,sans-serif";
    ctx.fillStyle = "#c8bfb4";
    ctx.fillText("Each pet has a unique call when summoned. Stroke the top of its head to pet.", 36, y0 + 28);
    const cols = 4;
    const bw = 292, bh = 86, gap = 14;
    PETS.forEach((p, i) => {
      const c = i % cols, r = (i / cols) | 0;
      const x = 36 + c * (bw + gap);
      const y = y0 + 48 + r * (bh + gap);
      ctx.fillStyle = "#241e1a";
      round(ctx, x, y, bw, bh, 12);
      ctx.fill();
      ctx.fillStyle = hex(p.color);
      ctx.beginPath();
      ctx.arc(x + 28, y + bh / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4efe8";
      ctx.font = "700 22px system-ui,Segoe UI,sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(p.name, x + 54, y + 34);
      ctx.font = "15px system-ui,Segoe UI,sans-serif";
      ctx.fillStyle = "#b8b0a6";
      ctx.fillText("likes " + p.likes.join(", "), x + 54, y + 58);
      addHit(x, y, bw, bh, { type: "summon", species: p.id });
    });
  }

  function drawFood(y0) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "700 24px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("FOOD  —  drops on the floor, bounces, sits until a pet eats it", 36, y0);
    ctx.font = "17px system-ui,Segoe UI,sans-serif";
    ctx.fillStyle = "#c8bfb4";
    ctx.fillText("Tap a snack. It falls in front of you and stays on the ground. Pets walk to food they like first.", 36, y0 + 32);
    FOOD.forEach((f, i) => {
      const c = i % 2, r = (i / 2) | 0;
      const x = 36 + c * 604;
      const y = y0 + 56 + r * 118;
      ctx.fillStyle = "#241e1a";
      round(ctx, x, y, 588, 106, 14);
      ctx.fill();
      ctx.fillStyle = hex(f.color);
      round(ctx, x + 16, y + 18, 70, 70, 12);
      ctx.fill();
      ctx.fillStyle = "#f4efe8";
      ctx.font = "800 28px system-ui,Segoe UI,sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(f.name, x + 104, y + 44);
      ctx.font = "16px system-ui,Segoe UI,sans-serif";
      ctx.fillStyle = "#c8bfb4";
      ctx.fillText("Liked by: " + f.hint, x + 104, y + 76);
      addHit(x, y, 588, 106, { type: "food", id: f.id });
    });
  }

  function rowCycle(label, value, y, prev, next) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "700 22px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, 48, y + 34);
    button(280, y, 64, 56, "<", prev, { font: "800 28px system-ui,sans-serif" });
    ctx.fillStyle = "#2a2420";
    round(ctx, 360, y, 520, 56, 10);
    ctx.fill();
    ctx.strokeStyle = "#7eb6ff";
    ctx.stroke();
    ctx.fillStyle = "#7eb6ff";
    ctx.font = "800 24px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(value).toUpperCase(), 620, y + 30);
    button(900, y, 64, 56, ">", next, { font: "800 28px system-ui,sans-serif" });
  }

  function drawBuild(y0) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "700 24px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HOW TO BUILD A CREATURE", 36, y0);
    ctx.font = "17px system-ui,Segoe UI,sans-serif";
    ctx.fillStyle = "#c8bfb4";
    ctx.fillText("1. Cycle HEAD, BODY, LEGS, SIZE, COLOR   2. Tap SUMMON — it appears on the floor 1 m ahead.", 36, y0 + 30);
    const head = HEADS[state.head];
    const torso = TORSOS[state.torso];
    const legs = LEGS[state.legs];
    const size = SIZES[state.size];
    rowCycle("HEAD", head, y0 + 50, { type: "cycle", key: "head", dir: -1 }, { type: "cycle", key: "head", dir: 1 });
    rowCycle("BODY", torso, y0 + 122, { type: "cycle", key: "torso", dir: -1 }, { type: "cycle", key: "torso", dir: 1 });
    rowCycle("LEGS", legs, y0 + 194, { type: "cycle", key: "legs", dir: -1 }, { type: "cycle", key: "legs", dir: 1 });
    rowCycle("SIZE", size, y0 + 266, { type: "cycle", key: "size", dir: -1 }, { type: "cycle", key: "size", dir: 1 });
    rowCycle("COLOR", "#" + PALETTE[state.color].toString(16).padStart(6, "0"), y0 + 338, { type: "cycle", key: "color", dir: -1 }, { type: "cycle", key: "color", dir: 1 });
    button(48, y0 + 420, 280, 56, "LEGS: " + state.legCount, { type: "legs-toggle" }, { on: true, font: "700 20px system-ui,sans-serif" });
    button(360, y0 + 412, 620, 72, "SUMMON THIS CREATURE  (on the floor in front of you)", { type: "summon-build" }, { on: true, font: "800 22px system-ui,sans-serif" });
  }

  function drawPortal(y0) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "800 28px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HOW TO PLACE A DARK PORTAL", 36, y0);
    const lines = [
      "1. Look at the floor (a purple ring follows your laser).",
      "2. Tap PLACE DARK PORTAL — the gate sits on that spot.",
      "3. Dark Horde creatures crawl out and attack pets and Mira.",
      "4. Pull trigger (while not pointing at this menu) to fire the laser.",
      "Laser pops Horde critters and damages the portal. Pets fight back.",
    ];
    ctx.font = "20px system-ui,Segoe UI,sans-serif";
    ctx.fillStyle = "#d8d0c6";
    lines.forEach((ln, i) => ctx.fillText(ln, 36, y0 + 48 + i * 36));
    button(36, y0 + 250, 720, 88, "PLACE DARK PORTAL  ON THE FLOOR AHEAD", { type: "portal" }, { on: true, fill: "#6a20aa", ink: "#fff", font: "800 24px system-ui,sans-serif" });
    ctx.fillStyle = "#b8b0a6";
    ctx.font = "16px system-ui,Segoe UI,sans-serif";
    ctx.fillText("Portals spawn Horde creatures (dark variants of the den pets). Max 8 live at once.", 36, y0 + 370);
  }

  function drawMira(y0) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "800 24px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("MIRA  —  same body as /human2", 36, y0);
    ctx.font = "17px system-ui,Segoe UI,sans-serif";
    ctx.fillStyle = "#c8bfb4";
    ctx.fillText("Arrow through face types and hair. Spawn another Mira with the current sliders, a new face, and a new hair color.", 36, y0 + 32);
    button(36, y0 + 70, 280, 64, "< FACE", { type: "mira-face", dir: -1 }, { font: "800 22px system-ui,sans-serif" });
    button(340, y0 + 70, 280, 64, "FACE >", { type: "mira-face", dir: 1 }, { font: "800 22px system-ui,sans-serif" });
    button(36, y0 + 150, 280, 64, "< HAIR", { type: "mira-hair", dir: -1 }, { font: "800 22px system-ui,sans-serif" });
    button(340, y0 + 150, 280, 64, "HAIR >", { type: "mira-hair", dir: 1 }, { font: "800 22px system-ui,sans-serif" });
    button(36, y0 + 250, 900, 88, "SPAWN ANOTHER MIRA  (new face + hair, same shape)", { type: "mira-spawn" }, { on: true, font: "800 22px system-ui,sans-serif" });
    ctx.fillStyle = "#d8d0c6";
    ctx.font = "16px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Walk jiggle scales with breast/hip size. Floppy foam noodle. Hands collide. Dark hair by default.", 36, y0 + 380);
  }

  function drawHats(y0) {
    ctx.fillStyle = "#f4efe8";
    ctx.font = "700 22px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Tap a hat. It goes on the nearest friendly pet.", 36, y0);
    HATS.forEach((h, i) => {
      const x = 36 + (i % 2) * 604;
      const y = y0 + 40 + ((i / 2) | 0) * 110;
      button(x, y, 588, 92, h.name.toUpperCase(), { type: "hat", id: h.id }, { fill: hex(h.color), on: true, font: "800 26px system-ui,sans-serif" });
    });
  }

  function drawHelp(y0) {
    const lines = [
      "MENU  Text faces you. Squeeze grip to show/hide. Trigger clicks a button.",
      "BUILD  Cycle head / body / legs / size / color, then SUMMON. Pet lands on the floor ahead.",
      "PORTAL  Aim at the floor, tap PLACE DARK PORTAL. Horde creatures crawl out.",
      "FOOD  Open the FOOD tab, tap a snack. It falls, bounces, and sits on the floor until eaten.",
      "TASTES  Different pets prefer different food (listed on each snack). They walk to favorites first.",
      "VOICE  Speak into the mic — pets rally once to a short circle around you. Cooldown ~2.5s.",
      "PET  Stroke the top of a creature with the controller / hand model. Hearts and smiles float up.",
      "TONES  Each species plays its own call when first summoned and a snap when it attacks.",
      "LASER  Trigger while pointing off-menu: beam vs portals and dark Horde.",
      "NOODLE  Grab the blue pool noodle (trigger near it) and swing. Mira flinches from hits.",
      "MIRA  Stands in the den with you. Dark critters will try to reach her.",
    ];
    ctx.font = "18px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "left";
    lines.forEach((ln, i) => {
      ctx.fillStyle = i % 2 ? "#d8d0c6" : "#f4efe8";
      ctx.fillText(ln, 36, y0 + 8 + i * 44);
    });
  }

  function pickUV(uv) {
    const x = uv.x * W;
    const y = (1 - uv.y) * H;
    for (let i = hits.length - 1; i >= 0; i--) {
      const b = hits[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action;
    }
    return null;
  }

  function apply(action) {
    if (!action) return action;
    if (action.type === "tab") state.tab = action.id;
    if (action.type === "cycle") {
      const arr = { head: HEADS, torso: TORSOS, legs: LEGS, size: SIZES, color: PALETTE }[action.key];
      if (arr) {
        const n = arr.length;
        state[action.key] = (state[action.key] + action.dir + n) % n;
      }
    }
    if (action.type === "legs-toggle") state.legCount = state.legCount === 4 ? 2 : 4;
    paint();
    return action;
  }

  paint();
  return { group, mesh, canvas, state, paint, pickUV, apply, tex };
}

export function geneFromState(state) {
  return {
    head: HEADS[state.head],
    torso: TORSOS[state.torso],
    legs: LEGS[state.legs],
    size: SIZES[state.size],
    color: PALETTE[state.color],
    legCount: state.legCount,
  };
}

export function fillDomHud(root, state, act, miraRt) {
  root.innerHTML = "";
  const bar = document.createElement("div");
  bar.className = "tabs";
  TABS.forEach((t) => {
    const b = document.createElement("button");
    b.textContent = t;
    if (state.tab === t) b.classList.add("on");
    b.onclick = () => act({ type: "tab", id: t });
    bar.appendChild(b);
  });
  root.appendChild(bar);
  const body = document.createElement("div");
  body.className = "body";
  if (state.tab === "PETS") {
    const p = document.createElement("p");
    p.textContent = "Tap a creature — it appears on the floor in front of you.";
    body.appendChild(p);
    PETS.forEach((pet) => {
      const b = document.createElement("button");
      b.textContent = pet.name + " · likes " + pet.likes.join(", ");
      b.style.borderColor = hex(pet.color);
      b.onclick = () => act({ type: "summon", species: pet.id });
      body.appendChild(b);
    });
  } else if (state.tab === "FOOD") {
    const p = document.createElement("p");
    p.textContent = "Food falls, bounces, and sits on the floor until a pet eats it. Pets prefer listed likes.";
    body.appendChild(p);
    FOOD.forEach((f) => {
      const b = document.createElement("button");
      b.textContent = f.name + " — " + f.hint;
      b.style.background = hex(f.color);
      b.style.color = "#111";
      b.onclick = () => act({ type: "food", id: f.id });
      body.appendChild(b);
    });
  } else if (state.tab === "BUILD") {
    const p = document.createElement("p");
    p.innerHTML = "<b>How to build:</b> cycle each row, then Summon. The pet lands on the floor 1 meter ahead.";
    body.appendChild(p);
    [["head", HEADS], ["torso", TORSOS], ["legs", LEGS], ["size", SIZES], ["color", PALETTE.map((n) => "#" + n.toString(16).padStart(6, "0"))]].forEach(([key, arr]) => {
      const row = document.createElement("div");
      row.className = "row";
      const lab = document.createElement("span");
      lab.textContent = key.toUpperCase();
      const val = document.createElement("b");
      val.textContent = String(arr[state[key]]).toUpperCase();
      const prev = document.createElement("button");
      prev.textContent = "<";
      prev.onclick = () => act({ type: "cycle", key, dir: -1 });
      const next = document.createElement("button");
      next.textContent = ">";
      next.onclick = () => act({ type: "cycle", key, dir: 1 });
      row.append(lab, prev, val, next);
      body.appendChild(row);
    });
    const legs = document.createElement("button");
    legs.textContent = "Leg count: " + state.legCount;
    legs.onclick = () => act({ type: "legs-toggle" });
    const go = document.createElement("button");
    go.className = "go";
    go.textContent = "SUMMON THIS CREATURE";
    go.onclick = () => act({ type: "summon-build" });
    body.append(legs, go);
  } else if (state.tab === "PORTAL") {
    const p = document.createElement("p");
    p.innerHTML = "<b>How to place a portal:</b> aim at the floor, then tap the button. Dark Horde creatures crawl out. Trigger fires the laser.";
    body.appendChild(p);
    const go = document.createElement("button");
    go.className = "go";
    go.textContent = "PLACE DARK PORTAL";
    go.onclick = () => act({ type: "portal" });
    body.appendChild(go);
  } else if (state.tab === "HATS") {
    HATS.forEach((h) => {
      const b = document.createElement("button");
      b.textContent = h.name;
      b.onclick = () => act({ type: "hat", id: h.id });
      body.appendChild(b);
    });
  } else if (state.tab === "MIRA") {
    const p = document.createElement("p");
    p.innerHTML = "<b>Mira</b> uses the same body system as /human2. Change face and hair, then spawn another with distinct looks.";
    body.appendChild(p);
    const a = miraRt && miraRt.selected;
    const face = document.createElement("p");
    face.textContent = "Face: " + (a ? ["Natural", "Warm", "Cool", "Rosy"][a.faceType] : "—");
    const hair = document.createElement("p");
    hair.textContent = "Hair: " + (a ? ["Black", "Dark brown", "Auburn", "Brunette"][a.hairColor] : "—");
    body.append(face, hair);
    const fp = document.createElement("button"); fp.textContent = "< Face"; fp.onclick = () => act({ type: "mira-face", dir: -1 });
    const fn = document.createElement("button"); fn.textContent = "Face >"; fn.onclick = () => act({ type: "mira-face", dir: 1 });
    const hp = document.createElement("button"); hp.textContent = "< Hair"; hp.onclick = () => act({ type: "mira-hair", dir: -1 });
    const hn = document.createElement("button"); hn.textContent = "Hair >"; hn.onclick = () => act({ type: "mira-hair", dir: 1 });
    const go = document.createElement("button"); go.className = "go"; go.textContent = "SPAWN ANOTHER MIRA"; go.onclick = () => act({ type: "mira-spawn" });
    body.append(fp, fn, hp, hn, go);
  } else {
    const p = document.createElement("p");
    p.innerHTML = "Voice: speak to rally pets around you.<br>Pet: stroke the top of a creature with the controller.<br>Each species has its own summon + attack tone.<br>Noodle: grab the floppy foam stick, swing at Mira.";
    body.appendChild(p);
  }
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = state.hint;
  body.appendChild(hint);
  root.appendChild(body);
}
