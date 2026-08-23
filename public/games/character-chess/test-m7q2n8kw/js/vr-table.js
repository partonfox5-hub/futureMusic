/**
 * Creature Chess VR table: army + field setup first, then XR with pieces,
 * parchment HUD, and controller ray selection.
 */
const SPR = "/games/character-chess/sprites/characters/";
const FREE = [
  "emberpaw", "bitpup", "frostkit", "sparklet", "bloomlet", "tidrop", "pebblet",
  "sproutle", "mirepup", "glintmoth", "frogseer", "circuitdog", "wizardcat",
  "pirateowl", "chefcoon", "mushnaut",
];

const RULES = `Draft a champion onto every piece. White moves first. Each turn you have 2 action points. Select a unit, then a highlighted square to move. Captures become duels. Bonus cards spend AP.`;

const CONTROLS = `Trigger / A: select or confirm. Point at a square, pull trigger to pick a unit, pull again on a lit square to move. Stick: look around the table. B or Y: leave VR.`;

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function installDomOverlay() {
  if (installDomOverlay.done) return;
  installDomOverlay.done = true;
  const xr = navigator.xr;
  if (!xr?.requestSession) return;
  const orig = xr.requestSession.bind(xr);
  xr.requestSession = function (mode, opts) {
    const root = document.getElementById("cc-vr-hud");
    opts = Object.assign({}, opts || {});
    const extra = new Set([...(opts.optionalFeatures || []), "local-floor", "dom-overlay"]);
    opts.optionalFeatures = [...extra];
    if (root) opts.domOverlay = { root };
    return orig(mode, opts);
  };
}

function squareList(side) {
  const rank = side === "w" ? "2" : "7";
  const back = side === "w" ? "1" : "8";
  const files = "abcdefgh";
  const roles = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const out = [];
  for (let i = 0; i < 8; i++) out.push({ sq: files[i] + back, role: roles[i] });
  for (let i = 0; i < 8; i++) out.push({ sq: files[i] + rank, role: "p" });
  return out;
}

function hudHtml() {
  return el(`
    <div id="cc-vr-hud">
      <div class="cc-scroll">
        <section class="cc-scroll-top">
          <h2>Controls</h2>
          <p>${CONTROLS}</p>
        </section>
        <section class="cc-scroll-bot">
          <h2>Rules</h2>
          <p>${RULES}</p>
        </section>
      </div>
      <div class="cc-trackers">
        <div class="cc-tk" id="cc-tk-turn">Turn —</div>
        <div class="cc-tk" id="cc-tk-ap">AP —</div>
        <div class="cc-tk" id="cc-tk-timer">Time —</div>
        <div class="cc-tk" id="cc-tk-msg"></div>
      </div>
      <div class="cc-vr-setup" id="cc-vr-setup">
        <h2>Build your army</h2>
        <p class="note">Every slot is filled with a starter champion. Change any, then confirm. Then choose the field. Creatures only appear after setup.</p>
        <div class="cc-slots" id="cc-slots"></div>
        <div class="cc-setup-actions">
          <button type="button" id="cc-vr-confirm-army">Confirm army</button>
          <div id="cc-vr-field" hidden>
            <button type="button" data-scale="1" class="on">8×8 field</button>
            <button type="button" data-scale="2">16×16 field</button>
            <button type="button" id="cc-vr-go">Set board & enter VR</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

function paintSlots(game) {
  const s = game.getState();
  const draft = s.whiteDraft || {};
  const box = document.getElementById("cc-slots");
  if (!box) return;
  box.innerHTML = squareList("w")
    .map((row) => {
      const id = draft[row.sq] || FREE[0];
      return `<button type="button" class="cc-slot" data-sq="${row.sq}">
        <img src="${SPR}${id}.png" alt="">
        <span>${row.sq} · ${id}</span>
      </button>`;
    })
    .join("");
}

function cycleChamp(game, sq) {
  const s = game.getState();
  const cur = (s.whiteDraft || {})[sq];
  const i = Math.max(0, FREE.indexOf(cur));
  const next = FREE[(i + 1) % FREE.length];
  s.assignDraft(sq, next);
  paintSlots(game);
}

function paintTrackers(game) {
  const s = game.getState();
  const turn = document.getElementById("cc-tk-turn");
  const ap = document.getElementById("cc-tk-ap");
  const timer = document.getElementById("cc-tk-timer");
  const msg = document.getElementById("cc-tk-msg");
  if (!turn) return;
  const side = s.turn === "b" ? "Black" : "White";
  turn.textContent = s.phase === "playing" ? `Turn ${side}` : `Phase ${s.phase}`;
  const pts = s.ap ? s.ap[s.turn] : 0;
  ap.textContent = `AP ${pts ?? "—"}`;
  const left = s.turnEndsAt ? Math.max(0, Math.ceil((s.turnEndsAt - Date.now()) / 1000)) : null;
  timer.textContent = left != null ? `Timer ${left}s` : s.busy ? "Resolving…" : "Timer —";
  msg.textContent = s.message || "";
}

function r3fState() {
  const canvas = document.querySelector("canvas");
  const raw = canvas && canvas.__r3f;
  if (!raw) return null;
  try {
    if (typeof raw.getState === "function") return raw.getState();
    if (raw.root && typeof raw.root.getState === "function") return raw.root.getState();
    if (raw.store && typeof raw.store.getState === "function") return raw.store.getState();
  } catch {}
  return null;
}

function bindXrClicks(game) {
  if (bindXrClicks.done) return;
  bindXrClicks.done = true;
  const tryBind = () => {
    const xr = navigator.xr;
    const gl = r3fState()?.gl;
    const sess = gl?.xr?.getSession?.();
    if (!sess || sess.__ccBound) return;
    sess.__ccBound = true;
    sess.addEventListener("select", (ev) => {
      const st = r3fState();
      if (!st) {
        const s = game.getState();
        if (s.selected) s.clickSquare(s.legal?.[0] || s.selected);
        return;
      }
      try {
        const frame = ev.frame;
        const src = ev.inputSource;
        const ref = st.gl.xr.getReferenceSpace();
        const pose = frame.getPose(src.targetRaySpace, ref);
        if (!pose) return;
        const p = pose.transform.position;
        const o = pose.transform.orientation;
        // Board sits near y=0, x/z in meters. Tile ~0.98.
        const qx = o.x, qy = o.y, qz = o.z, qw = o.w;
        const dx = 2 * (qx * qz + qw * qy);
        const dy = 2 * (qy * qz - qw * qx);
        const dz = 1 - 2 * (qx * qx + qy * qy);
        const diry = -dy;
        const dirx = -dx;
        const dirz = -dz;
        if (Math.abs(diry) < 0.02) return;
        const k = (0.22 - p.y) / diry;
        if (k < 0 || k > 8) return;
        const hx = p.x + dirx * k;
        const hz = p.z + dirz * k;
        const n = window.__CC_N || 8;
        const files = "abcdefghijklmnopqrstuvwx".slice(0, n);
        const tile = 0.98;
        const f = Math.round(hx / tile + (n - 1) / 2);
        const r = Math.round((n - 1) / 2 - hz / tile);
        if (f < 0 || r < 0 || f >= n || r >= n) return;
        const sq = files[f] + String(r + 1);
        game.getState().clickSquare(sq);
      } catch (err) {
        console.warn("[cc-vr] select", err);
      }
    });
  };
  setInterval(tryBind, 400);
}

export async function startVrFlow(game) {
  installDomOverlay();
  if (!document.getElementById("cc-vr-hud")) {
    document.body.append(hudHtml());
  }
  const setup = document.getElementById("cc-vr-setup");
  setup.hidden = false;
  const st = game.getState();
  if (st.phase === "title") st.startDraft("cpu", "classic");
  squareList("w").forEach((row, i) => {
    try {
      game.getState().assignDraft(row.sq, FREE[i % FREE.length]);
    } catch {}
  });
  paintSlots(game);
  paintTrackers(game);

  const slots = document.getElementById("cc-slots");
  slots.onclick = (ev) => {
    const b = ev.target.closest("[data-sq]");
    if (b) cycleChamp(game, b.dataset.sq);
  };

  let scale = 1;
  document.getElementById("cc-vr-field").onclick = (ev) => {
    const b = ev.target.closest("[data-scale]");
    if (b) {
      scale = Number(b.dataset.scale);
      document.querySelectorAll("#cc-vr-field [data-scale]").forEach((x) => x.classList.toggle("on", x === b));
    }
  };

  document.getElementById("cc-vr-confirm-army").onclick = () => {
    const s = game.getState();
    s.confirmDraft();
    if (game.getState().phase === "setup" || game.getState().phase === "carddraft") {
      document.getElementById("cc-vr-field").hidden = false;
      document.getElementById("cc-vr-confirm-army").hidden = true;
    }
  };

  document.getElementById("cc-vr-go").onclick = async () => {
    const s = game.getState();
    if (s.phase === "carddraft") {
      s.fillSampleDeck?.();
      s.confirmDraft?.();
    }
    if (game.getState().phase === "setup") {
      s.confirmSetup({
        theme: "battle",
        scale,
        field3d: true,
        breeding: false,
        relics: false,
      });
    }
    setup.hidden = true;
    bindXrClicks(game);
    try {
      await game.getState().enterVr();
    } catch (err) {
      console.warn(err);
    }
  };

  game.subscribe((s) => paintTrackers(game));
  setInterval(() => paintTrackers(game), 400);
}
