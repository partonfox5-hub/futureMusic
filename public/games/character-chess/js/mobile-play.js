/** Phone/tablet play: top-down 8×8 board, pan + pinch, optional isometric. PC is unchanged. */

const SPR = "/games/character-chess/sprites/characters/";
const ORB = "/games/character-chess/sprites/terrain/xp-orb.png";
const FILES = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function isChessMobile() {
  const ua = navigator.userAgent || "";
  if (/Quest|OculusBrowser|Oculus|Pacific|PicoBrowser|Wolvic/i.test(ua)) return false;
  const iPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const phone = /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const androidTab = /Android/i.test(ua) && !/Mobile/i.test(ua);
  return !!(phone || iPad || androidTab);
}

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function sqName(f, r) {
  if (f >= 0 && f < FILES.length && r >= 0 && r < 64) return FILES[f] + (r + 1);
  return "@" + f + "," + r;
}

function parseSq(sq) {
  if (!sq) return null;
  if (sq.startsWith("@")) {
    const [f, r] = sq.slice(1).split(",").map(Number);
    return { f, r };
  }
  return { f: FILES.indexOf(sq[0]), r: (parseInt(sq.slice(1), 10) || 1) - 1 };
}

function dims(st) {
  const n = st.boardScale === "quad" ? 24 : st.boardScale === "double" ? 16 : 8;
  return { files: n, ranks: n };
}

function champArt(c) {
  const id = c.evolved && c.characterId ? c.characterId + "_evo" : c.characterId;
  return SPR + id + ".png";
}

function orbFilter(tint) {
  if (tint === "green") return "hue-rotate(95deg) saturate(1.25)";
  if (tint === "red") return "hue-rotate(-48deg) saturate(1.4)";
  if (tint === "blue") return "hue-rotate(175deg) saturate(1.3)";
  return "none";
}

function hpColor(ratio) {
  if (ratio > 0.5) return "var(--color-hp-high, #5cae6e)";
  if (ratio > 0.2) return "var(--color-hp-mid, #c4a35a)";
  return "var(--color-hp-low, #c45c5c)";
}

function is3dFieldButton(btn) {
  const t = (btn.textContent || "").replace(/\s+/g, " ").trim();
  return t === "3D field" || t.startsWith("3D field");
}

export function bootMobilePlay(game) {
  document.documentElement.classList.add("cc-mobile");
  document.body.classList.add("cc-mobile");

  try {
    game.getState().confirmDesktopVisual?.();
  } catch {}

  const origSetup = game.getState().confirmSetup;
  if (typeof origSetup === "function") {
    game.setState({
      confirmSetup: (opts = {}) => origSetup({ ...opts, scale: "standard", field3d: false }),
    });
  }

  if (!document.getElementById("cc-mob")) {
    document.body.append(
      el(`<div id="cc-mob" hidden>
        <div class="cc-mob-hud">
          <p class="cc-mob-turn" id="cc-mob-turn">White</p>
          <div class="cc-mob-hud-row">
            <span class="cc-mob-ap" id="cc-mob-ap">Actions 2/2</span>
            <button type="button" id="cc-mob-end">End turn</button>
            <button type="button" id="cc-mob-iso" aria-pressed="false">3D field</button>
            <button type="button" id="cc-mob-fit">Fit</button>
            <button type="button" id="cc-mob-back">Menu</button>
          </div>
        </div>
        <div class="cc-mob-port" id="cc-mob-port">
          <div class="cc-mob-world" id="cc-mob-world">
            <div class="cc-mob-board" id="cc-mob-board"></div>
          </div>
        </div>
        <p class="cc-mob-msg" id="cc-mob-msg"></p>
      </div>`),
    );
  }

  const root = document.getElementById("cc-mob");
  if (root && !document.getElementById("cc-mob-end")) {
    const hud = root.querySelector(".cc-mob-hud");
    if (hud) {
      hud.innerHTML = `<p class="cc-mob-turn" id="cc-mob-turn">White</p>
          <div class="cc-mob-hud-row">
            <span class="cc-mob-ap" id="cc-mob-ap">Actions 2/2</span>
            <button type="button" id="cc-mob-end">End turn</button>
            <button type="button" id="cc-mob-iso" aria-pressed="false">3D field</button>
            <button type="button" id="cc-mob-fit">Fit</button>
            <button type="button" id="cc-mob-back">Menu</button>
          </div>`;
    }
  }
  const port = document.getElementById("cc-mob-port");
  const world = document.getElementById("cc-mob-world");
  const boardEl = document.getElementById("cc-mob-board");
  const isoBtn = document.getElementById("cc-mob-iso");
  const apEl = document.getElementById("cc-mob-ap");
  const endBtn = document.getElementById("cc-mob-end");
  let iso = false;
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let pointers = new Map();
  let pinch0 = 0;
  let zoom0 = 1;
  let dragged = false;
  let lastPaint = "";

  function applyXform() {
    const z = iso ? zoom * 0.72 : zoom;
    const isoPart = iso ? " rotateX(58deg) rotateZ(-45deg)" : "";
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${z})${isoPart}`;
    boardEl.classList.toggle("iso", iso);
    root.classList.toggle("iso", iso);
    isoBtn?.setAttribute("aria-pressed", iso ? "true" : "false");
    isoBtn?.classList.toggle("on", iso);
    document.documentElement.classList.toggle("cc-mob-iso", iso);
    document.body.classList.toggle("cc-mob-iso", iso);
  }

  function fit() {
    panX = 0;
    panY = 0;
    zoom = 1;
    applyXform();
  }

  function playPhases(phase, st) {
    if (st.battle || st.outcome) return false;
    return phase === "playing" || phase === "deploy" || phase === "kingflee";
  }

  function hideBigMapButtons() {
    document.querySelectorAll("button").forEach((b) => {
      const t = (b.textContent || "").replace(/\s+/g, " ");
      if (/Medium field|RTS mode|16\s*[×x]\s*16|24\s*[×x]\s*24/.test(t)) {
        b.hidden = true;
      }
    });
    document.querySelectorAll("#cc-scale [data-s='2'], #cc-scale [data-s='3']").forEach((b) => {
      b.hidden = true;
    });
  }

  function paint(st) {
    hideBigMapButtons();
    const on = playPhases(st.phase, st);
    root.hidden = !on;
    document.documentElement.classList.toggle("cc-mob-on", on);
    document.body.classList.toggle("cc-mob-on", on);
    if (!on) {
      root.classList.remove("cc-mob-has-hand");
      return;
    }

    const { files, ranks } = dims(st);
    const legal = new Set((st.legal || []).map((m) => m.to));
    const last = st.lastMove || {};
    const bySq = {};
    for (const c of Object.values(st.champions || {})) {
      if (c.square && !c.fainted) bySq[c.square] = c;
    }
    const terr = {};
    for (const t of st.terrain || []) if (t.square) terr[t.square] = t;
    const orbs = (st.xpOrbs || []).filter((o) => o.square);
    const orbsBy = {};
    for (const o of orbs) (orbsBy[o.square] ||= []).push(o);

    let html = "";
    for (let r = ranks - 1; r >= 0; r--) {
      for (let f = 0; f < files; f++) {
        const sq = sqName(f, r);
        const dark = (f + r) % 2 === 0;
        const unit = bySq[sq];
        const hole = terr[sq]?.kind === "void" || terr[sq]?.kind === "gap";
        const cls = [
          "cc-mob-sq",
          dark ? "dark" : "",
          st.selected === sq ? "sel" : "",
          legal.has(sq) ? "legal" : "",
          last.from === sq || last.to === sq ? "last" : "",
          hole ? "hole" : "",
        ]
          .filter(Boolean)
          .join(" ");
        let inner = "";
        for (const o of orbsBy[sq] || []) {
          inner += `<img class="cc-mob-orb" src="${ORB}" alt="" style="filter:${orbFilter(o.tint)}">`;
        }
        if (unit) {
          const ratio = unit.hp / Math.max(1, unit.maxHp || unit.hp || 1);
          inner += `<div class="cc-mob-unit">
            <img class="cc-mob-piece ${unit.side === "b" ? "black" : ""}" src="${champArt(unit)}" alt="${unit.characterId || ""}">
            <div class="cc-mob-hp"><i style="width:${Math.max(0, Math.min(100, ratio * 100))}%;background:${hpColor(ratio)}"></i></div>
          </div>`;
        }
        html += `<button type="button" class="${cls}" data-sq="${sq}">${inner}</button>`;
      }
    }
    const hpSig = Object.values(bySq)
      .map((c) => (c.hp ?? "") + (c.characterId || ""))
      .join();
    const orbSig = orbs.map((o) => o.square + (o.tint || "")).join();
    const sig = files + ":" + st.selected + ":" + [...legal].join() + ":" + Object.keys(bySq).join() + ":" + hpSig + ":" + orbSig;
    if (sig !== lastPaint) {
      lastPaint = sig;
      boardEl.style.gridTemplateColumns = `repeat(${files}, 1fr)`;
      boardEl.innerHTML = html;
    }
    const side = st.turn === "b" ? "Black" : "White";
    document.getElementById("cc-mob-turn").textContent = (st.message && String(st.message).slice(0, 48)) || `${side} to move`;
    const handSide = st.mode === "cpu" ? "w" : st.turn;
    const hand = (st.hands && st.hands[handSide]) || [];
    const showHand = (st.ruleset === "bonus" || st.boardScale === "quad") && (st.phase === "playing" || st.phase === "battle") && hand.length;
    root.classList.toggle("cc-mob-has-hand", !!showHand);
    const showAp = st.ruleset === "bonus" || st.boardScale === "quad";
    if (apEl) {
      const key = st.turn === "b" ? "b" : "w";
      const extra = st.extraAp?.[key] ?? 0;
      const ap = st.ap?.[key] ?? 0;
      apEl.textContent = `Actions ${ap}/${2 + extra}`;
      apEl.hidden = !showAp;
    }
    if (endBtn) endBtn.hidden = !showAp;
    document.getElementById("cc-mob-msg").textContent = st.busy || st.thinking ? "…" : "";
  }

  function onFieldTap(ev) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    const btn = ev.target.closest("button");
    if (!btn) return;
    if (btn.id === "cc-mob-iso" || is3dFieldButton(btn)) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      iso = !iso;
      applyXform();
    }
  }
  if (!window.__ccMobIsoListen) {
    window.__ccMobIsoListen = true;
    document.addEventListener("pointerup", onFieldTap, true);
    document.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target.closest("button");
        if (!btn) return;
        if (btn.id === "cc-mob-iso" || is3dFieldButton(btn)) {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        }
      },
      true,
    );
  }
  endBtn?.addEventListener("pointerup", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    try {
      (window.__game || game).getState().endTurn?.();
    } catch {}
  });
  document.getElementById("cc-mob-fit").addEventListener("pointerup", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    fit();
  });
  document.getElementById("cc-mob-back").addEventListener("pointerup", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    try {
      (window.__game || game).getState().toTitle?.();
    } catch {}
  });

  boardEl.addEventListener("click", (ev) => {
    if (dragged) return;
    const sq = ev.target.closest("[data-sq]")?.dataset.sq;
    if (!sq) return;
    try {
      game.getState().clickSquare(sq);
    } catch {}
  });

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  port.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = false;
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinch0 = dist(pts[0], pts[1]);
      zoom0 = zoom;
    }
    try {
      port.setPointerCapture(e.pointerId);
    } catch {}
  });
  port.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pointers.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      if (Math.hypot(dx, dy) > 6) dragged = true;
      panX += dx;
      panY += dy;
      applyXform();
    } else if (pointers.size === 2) {
      pointers.set(e.pointerId, cur);
      const pts = [...pointers.values()];
      const d = dist(pts[0], pts[1]);
      if (pinch0 > 8) {
        zoom = Math.min(3.2, Math.max(0.55, zoom0 * (d / pinch0)));
        dragged = true;
        applyXform();
      }
    }
    pointers.set(e.pointerId, cur);
  });
  const endPtr = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
  };
  port.addEventListener("pointerup", endPtr);
  port.addEventListener("pointercancel", endPtr);
  port.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom = Math.min(3.2, Math.max(0.55, zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
      applyXform();
    },
    { passive: false },
  );

  function safePaint() {
    try {
      paint((window.__game || game).getState());
    } catch (err) {
      console.warn("cc-mob paint", err);
    }
  }
  applyXform();
  safePaint();
  game.subscribe(safePaint);
  if (window.__game && window.__game !== game && typeof window.__game.subscribe === "function") {
    window.__game.subscribe(safePaint);
  }
  setInterval(safePaint, 400);
  const mo = new MutationObserver(hideBigMapButtons);
  mo.observe(document.body, { childList: true, subtree: true });
  hideBigMapButtons();
}
