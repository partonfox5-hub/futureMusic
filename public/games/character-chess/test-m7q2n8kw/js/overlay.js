import { makeGame } from "./nx-chess.js";
import { startVrFlow } from "./vr-table.js";

const SPR = "/games/character-chess/sprites/characters/";
const PEER_KEY = "cc-lobby-peer";

const TILES = [
  { id: "cpu", cls: "cc-cpu", img: "emberlancer.png", label: "Play vs CPU", sub: "Classic field" },
  { id: "bonus", cls: "cc-bonus", img: "hexweaver.png", label: "Spells & traps", sub: "Bonus rules" },
  { id: "hot", cls: "cc-hot", img: "wizardcat.png", label: "Pass & play", sub: "One device" },
  { id: "multi", cls: "cc-multi", img: "primarch.png", label: "Two-player lobby", sub: "See your rival at once" },
  { id: "how", cls: "cc-how", img: "frogseer.png", label: "How to play", sub: "Draft · move · battle" },
  { id: "alpha", cls: "cc-alpha", img: "voidseraph.png", label: "Alpha pack", sub: "$1 unlock" },
  { id: "vr", cls: "cc-vr", img: "skyrazor.png", label: "VR table", sub: "Quest browser" },
];

function peerId() {
  try {
    const e = sessionStorage.getItem(PEER_KEY);
    if (e) return e;
  } catch {}
  const id = "c-" + Math.random().toString(36).slice(2, 10);
  try {
    sessionStorage.setItem(PEER_KEY, id);
  } catch {}
  return id;
}

function waitGame() {
  return new Promise((res) => {
    const t = setInterval(() => {
      if (window.__game?.getState) {
        clearInterval(t);
        res(window.__game);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(t);
      res(window.__game || null);
    }, 15000);
  });
}

async function post(body) {
  const res = await fetch("/api/chess-lobby", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function mount() {
  if (document.getElementById("cc-shell")) return;
  const shell = el(`<div id="cc-shell"></div>`);
  shell.innerHTML = `
    <div class="cc-veil"></div>
    <div class="cc-bento">
      <div class="cc-brand">
        <p class="kicker">Aetherboard rest hall</p>
        <h1>Creature<br/>Chess</h1>
        <p>Champions on every piece. Captures become duels. One lobby, two seats — the first to enter hosts the field.</p>
      </div>
      ${TILES.map(
        (t) => `<button type="button" class="cc-tile ${t.cls}" data-act="${t.id}">
          <img src="${SPR}${t.img}" alt="">
          <span class="shade"></span>
          <span class="label">${t.label}<span class="sub">${t.sub}</span></span>
        </button>`,
      ).join("")}
    </div>
  `;
  const lobby = el(`<div id="cc-lobby"></div>`);
  lobby.innerHTML = `
    <h2>The waiting stones</h2>
    <p class="cc-note">One lobby. Two players. You appear here the moment you sit down.</p>
    <div class="cc-seats">
      <div class="cc-seat" id="cc-seat-w"><div class="empty">White seat</div></div>
      <div class="cc-seat" id="cc-seat-b"><div class="empty">Waiting for a rival…</div></div>
    </div>
    <div class="cc-board-set" id="cc-scale">
      <button type="button" data-s="1" class="on">Original 8×8</button>
      <button type="button" data-s="2">2× field (16×16)</button>
      <button type="button" data-s="3">3× field (24×24) · mountains</button>
    </div>
    <p class="cc-note" id="cc-host-note">The first player is host and chooses board size at start.</p>
    <div class="cc-lobby-actions">
      <button type="button" class="back" id="cc-leave">Leave lobby</button>
      <button type="button" id="cc-start">Start match</button>
    </div>
  `;
  const chip = el(`<div class="cc-chip" id="cc-chip"></div>`);
  document.body.append(shell, lobby, chip);
}

function paintSeat(node, p, hostId) {
  if (!p) {
    node.innerHTML = `<div class="empty">${node.id.endsWith("w") ? "White seat" : "Waiting for a rival…"}</div>`;
    return;
  }
  const img = SPR + (p.portrait || "primarch") + ".png";
  node.innerHTML = `<img src="${img}" alt=""><div class="meta">${p.name}${p.id === hostId ? " · Host" : ""}<small>${p.seat === "w" ? "White" : "Black"}</small></div>`;
}

function setScaleUi(scale, isHost) {
  document.querySelectorAll("#cc-scale button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.s) === scale);
    b.disabled = !isHost;
  });
  document.getElementById("cc-start").style.display = isHost ? "" : "none";
}

function applyBoardConfig(scale, mountains) {
  const n = scale >= 3 ? 24 : scale >= 2 ? 16 : 8;
  window.__CC_N = n;
  window.__CC_FILES = "abcdefghijklmnopqrstuvwx".slice(0, n);
  window.__CC_MOUNTAINS = mountains || [];
}

function startLocal(game, mode, ruleset) {
  window.__CC_MULTI = false;
  window.__CC_SEAT = null;
  window.__CC_N = 8;
  window.__CC_FILES = "abcdefgh";
  window.__CC_MOUNTAINS = [];
  document.getElementById("cc-shell").classList.remove("on");
  document.getElementById("cc-lobby").classList.remove("on");
  game.getState().startDraft(mode, ruleset);
}

async function boot() {
  mount();
  const game = await waitGame();
  if (!game) return;
  if (window.Pt) window.__CC_Pt = window.Pt;
  window.__ccMkH = function () {
    const n = window.__CC_N || 8;
    if (n <= 8 && window.__CC_Pt) return new window.__CC_Pt();
    return makeGame(n);
  };

  const shell = document.getElementById("cc-shell");
  const lobbyEl = document.getElementById("cc-lobby");
  const chip = document.getElementById("cc-chip");
  const self = peerId();
  let inLobby = false;
  let scale = 1;
  let lastStartSeq = 0;
  let lastMoveSeq = 0;
  let applying = false;

  function syncChrome(s) {
    const title = s.phase === "title";
    if (title && !inLobby && !window.__CC_MULTI) {
      window.__CC_N = 8;
      window.__CC_FILES = "abcdefgh";
      window.__CC_MOUNTAINS = [];
      window.__CC_SEAT = null;
    }
    shell.classList.toggle("on", title && !inLobby);
    document.body.classList.toggle("cc-hide-stock-title", title);
    if (!title) lobbyEl.classList.remove("on");
  }
  syncChrome(game.getState());
  game.subscribe((s) => syncChrome(s));

  shell.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const st = game.getState();
    if (act === "cpu") startLocal(game, "cpu", "classic");
    else if (act === "bonus") startLocal(game, "cpu", "bonus");
    else if (act === "hot") startLocal(game, "hotseat", "classic");
    else if (act === "how") st.setHowTo(true);
    else if (act === "alpha") st.openAlphaModal();
    else if (act === "vr") {
      if (st.vrActive) st.exitVr();
      else startVrFlow(game);
    }
    else if (act === "multi") openLobby();
  });

  async function openLobby() {
    inLobby = true;
    shell.classList.remove("on");
    lobbyEl.classList.add("on");
    const portraits = ["primarch", "emberlancer", "voidseraph", "griffonair", "stormcrown"];
    const portrait = portraits[Math.floor(Math.random() * portraits.length)];
    const joined = await post({ op: "join", peer: self, name: "Challenger " + self.slice(-3), portrait });
    if (joined && joined.ok === false) {
      inLobby = false;
      lobbyEl.classList.remove("on");
      shell.classList.add("on");
      window.alert(joined.error || "Lobby is full.");
      return;
    }
    tickLobby();
  }

  async function tickLobby() {
    if (!inLobby && !window.__CC_MULTI) return;
    try {
      const q = new URLSearchParams({ peer: self });
      const data = await (await fetch("/api/chess-lobby?" + q)).json();
      const w = (data.peers || []).find((p) => p.seat === "w");
      const b = (data.peers || []).find((p) => p.seat === "b");
      paintSeat(document.getElementById("cc-seat-w"), w, data.hostId);
      paintSeat(document.getElementById("cc-seat-b"), b, data.hostId);
      scale = data.scale || 1;
      const isHost = data.hostId === self;
      setScaleUi(scale, isHost);
      document.getElementById("cc-host-note").textContent = isHost
        ? "You are host. Pick a field size, then start when both seats are filled."
        : "Host chooses the field. You will sit Black.";
      document.getElementById("cc-start").disabled = !isHost || (data.peers || []).length < 2;

      if (data.started && inLobby) {
        const startEv = (data.events || []).filter((e) => e.kind === "start").pop();
        const seq = startEv?.seq || 1;
        const isHost = data.hostId === self;
        if (seq !== lastStartSeq && (isHost || data.snapshot)) {
          lastStartSeq = seq;
          beginMatch(data);
        }
      }
      if (window.__CC_MULTI && data.events) {
        for (const ev of data.events) {
          if (ev.kind === "move" && ev.seq > lastMoveSeq && ev.by !== self) {
            lastMoveSeq = ev.seq;
            replayMove(ev.from, ev.to);
          } else if (ev.kind === "move" && ev.by === self) lastMoveSeq = Math.max(lastMoveSeq, ev.seq);
        }
      }
      const other = (data.peers || []).find((p) => p.id !== self);
      if (other && game.getState().phase === "playing") {
        chip.classList.add("on");
        chip.innerHTML = `<img src="${SPR}${other.portrait || "primarch"}.png" alt=""> <span>${other.name} · ${other.seat === "w" ? "White" : "Black"}</span>`;
      } else if (game.getState().phase !== "playing") chip.classList.remove("on");
    } catch {}
  }
  setInterval(tickLobby, 450);

  document.getElementById("cc-scale").addEventListener("click", async (ev) => {
    const b = ev.target.closest("button");
    if (!b || b.disabled) return;
    scale = Number(b.dataset.s);
    await post({ op: "settings", peer: self, scale });
    tickLobby();
  });
  document.getElementById("cc-leave").onclick = async () => {
    inLobby = false;
    window.__CC_MULTI = false;
    await post({ op: "leave", peer: self });
    lobbyEl.classList.remove("on");
    if (game.getState().phase === "title") shell.classList.add("on");
  };
  document.getElementById("cc-start").onclick = async () => {
    const data = await post({ op: "start", peer: self, scale });
    if (data?.ok) beginMatch(data);
  };

  function sliceState(s) {
    return {
      phase: s.phase,
      mode: "hotseat",
      ruleset: s.ruleset,
      champions: s.champions,
      bySquare: s.bySquare,
      terrain: s.terrain,
      turn: s.turn,
      history: s.history,
      lastMove: s.lastMove,
      traps: s.traps,
      ap: s.ap,
      hands: s.hands,
      decks: s.decks,
      message: s.message,
      field3d: false,
    };
  }

  function beginMatch(data) {
    inLobby = false;
    lobbyEl.classList.remove("on");
    shell.classList.remove("on");
    const me = (data.peers || []).find((p) => p.id === self);
    window.__CC_MULTI = true;
    window.__CC_SEAT = me?.seat || "w";
    applyBoardConfig(data.scale || 1, data.mountains || []);
    const isHost = data.hostId === self;
    if (isHost) {
      game.setState({ alphaUnlocked: true });
      game.getState().startDraft("hotseat", "classic");
      game.setState({ draftSide: "b", alphaUnlocked: true });
      game.getState().confirmDraft();
      setTimeout(() => {
        post({ op: "sync", peer: self, snapshot: sliceState(game.getState()) }).catch(() => {});
      }, 80);
    } else if (data.snapshot && data.snapshot.champions) {
      if (typeof window.__ccBindH === "function") window.__ccBindH(makeGame(window.__CC_N));
      window.__game.setState({ ...data.snapshot, selected: null, legal: [], busy: false, thinking: false });
    }
  }

  const moveQ = [];
  function replayMove(from, to) {
    if (!from || !to) return;
    moveQ.push([from, to]);
    drainMoves();
  }
  function drainMoves() {
    if (applying || !moveQ.length) return;
    const s = game.getState();
    if (s.phase !== "playing" || s.busy || s.battle) return;
    const [from, to] = moveQ.shift();
    applying = true;
    window.__CC_FORCE = true;
    try {
      game.getState().clickSquare(from);
      game.getState().clickSquare(to);
    } catch {}
    window.__CC_FORCE = false;
    applying = false;
  }

  let hist = "";
  game.subscribe((s) => {
    drainMoves();
    if (!window.__CC_MULTI || applying) return;
    const h = (s.history || []).join(",");
    if (h === hist) return;
    const prev = hist;
    hist = h;
    if (!s.lastMove) return;
    if ((s.history || []).length <= (prev ? prev.split(",").filter(Boolean).length : 0)) return;
    post({ op: "move", peer: self, from: s.lastMove.from, to: s.lastMove.to }).catch(() => {});
  });
}

boot();
