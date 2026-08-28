/**
 * Creature Chess Quest VR:
 * The 3D WebGL canvas only mounts when vrActive is true. Requesting an
 * immersive session first, then creating that canvas, deadlocks Quest Browser
 * (infinite headset loading). Warm the canvas behind 2D on Quest only, then attach XR.
 * Desktop/PC never preloads the Three.js board.
 */
const BOARD3D = "/games/character-chess/assets/Board3D-c8w4k2np.js?v=tilehand3";
const FULL_PATH = "/games/character-chess/chess-static.html";
const SESSION_MS = 20000;
const GL_MS = 20000;

let liveSession = null;
let patched = false;
let getContextPatched = false;

function isHeadsetBrowser() {
  return /Quest|OculusBrowser|Oculus|Pacific/i.test(navigator.userAgent || "");
}

function chip(msg, kind) {
  let el = document.getElementById("cc-vr-chip");
  if (!msg) {
    if (el) el.hidden = true;
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "cc-vr-chip";
    document.body.append(el);
  }
  el.hidden = false;
  el.dataset.kind = kind || "info";
  el.textContent = msg;
}

function patchGetContext() {
  if (getContextPatched) return;
  getContextPatched = true;
  const proto = HTMLCanvasElement.prototype;
  const orig = proto.getContext;
  proto.getContext = function (type, attrs) {
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
      attrs = Object.assign({}, attrs || {}, { xrCompatible: true });
    }
    return orig.call(this, type, attrs);
  };
}

function isVrButton(el) {
  if (!el) return false;
  const aria = (el.getAttribute("aria-label") || "").trim();
  if (aria === "Enter VR" || aria === "Exit VR") return true;
  const t = (el.textContent || "").replace(/\s+/g, " ").trim();
  return t === "VR field" || t === "Starting VR…" || t === "Starting VR..." || t === "Exit VR" || t === "ENTER VR";
}

function hideTitleVr() {
  for (const el of document.querySelectorAll("button")) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t === "VR field" || t === "Starting VR…" || t === "Starting VR...") el.classList.add("cc-hide-title-vr");
  }
}

function race(promise, ms, message) {
  let id;
  const timeout = new Promise((_, reject) => {
    id = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(id));
}

function pushGl(out, root) {
  if (!root) return;
  try {
    if (typeof root.getState === "function") out.push(root.getState());
  } catch {}
  try {
    if (root.store && typeof root.store.getState === "function") out.push(root.store.getState());
  } catch {}
  try {
    if (root.root && typeof root.root.getState === "function") out.push(root.root.getState());
  } catch {}
  try {
    if (root.internal?.store && typeof root.internal.store.getState === "function") out.push(root.internal.store.getState());
  } catch {}
  if (root.gl) out.push(root);
}

function getGl() {
  for (const canvas of document.querySelectorAll("canvas")) {
    const found = [];
    pushGl(found, canvas.__r3f);
    pushGl(found, canvas.__r3f?.root);
    for (const st of found) if (st?.gl?.xr) return st.gl;
  }
  return null;
}

function waitGl(ms) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const gl = getGl();
      if (gl) return resolve(gl);
      if (Date.now() - start > ms) {
        return reject(new Error("The 3D board did not finish loading. Stay on the field and tap Enter VR again."));
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function stripOverlay(xr) {
  if (!xr?.requestSession || xr.__ccVrFix) return;
  xr.__ccVrFix = true;
  const orig = xr.requestSession.bind(xr);
  xr.requestSession = function (mode, opts) {
    const next = Object.assign({}, opts || {});
    const optional = [...(next.optionalFeatures || [])].filter((f) => f !== "dom-overlay" && f !== "hand-tracking" && f !== "bounded-floor");
    if (!optional.includes("local-floor")) optional.push("local-floor");
    next.optionalFeatures = optional;
    delete next.domOverlay;
    return orig(mode, next);
  };
}

function requestVrSession() {
  const xr = navigator.xr;
  if (!xr?.requestSession) return Promise.reject(new Error("WebXR is not available in this browser."));
  stripOverlay(xr);
  return xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
}

function waitGame() {
  return new Promise((resolve) => {
    if (window.__game?.getState) return resolve(window.__game);
    const id = window.setInterval(() => {
      if (window.__game?.getState) {
        window.clearInterval(id);
        resolve(window.__game);
      }
    }, 40);
    window.setTimeout(() => {
      window.clearInterval(id);
      resolve(window.__game || null);
    }, 20000);
  });
}

function inIframe() {
  try {
    return window.top !== window;
  } catch {
    return true;
  }
}

function breakOutForVr() {
  const url = `${window.location.origin}${FULL_PATH}?vr=1`;
  try {
    window.top.location.href = url;
  } catch {
    window.location.href = url;
  }
}

function hardenRenderer(gl) {
  try {
    gl.setPixelRatio(1);
  } catch {}
  if (!gl.__ccSizeGuard && typeof gl.setSize === "function") {
    gl.__ccSizeGuard = true;
    const orig = gl.setSize.bind(gl);
    gl.setSize = function (...args) {
      if (gl.xr && gl.xr.isPresenting) return;
      return orig(...args);
    };
  }
}

function resetVr(game, err) {
  const alpha = !!game.getState().alphaUnlocked;
  liveSession = null;
  game.setState({
    vrActive: false,
    vrBusy: false,
    field3d: alpha,
    vrWarm: true,
    vrError: err || "",
  });
  chip(err || "", err ? "err" : "");
}

function warmBoard(game) {
  if (!game.getState().vrWarm) game.setState({ vrWarm: true });
}

async function attachSession(game, gl, session) {
  liveSession = session;
  session.addEventListener("end", () => {
    if (liveSession === session) liveSession = null;
    const st = game.getState();
    if (st.vrActive || st.vrBusy) resetVr(game, "");
  });
  gl.xr.enabled = true;
  try {
    gl.xr.setReferenceSpaceType("local-floor");
  } catch {}
  try {
    gl.xr.setFramebufferScaleFactor(1);
  } catch {}
  hardenRenderer(gl);
  const ctx = gl.getContext?.();
  if (ctx?.makeXRCompatible && ctx.getContextAttributes?.()?.xrCompatible !== true) {
    try {
      await ctx.makeXRCompatible();
    } catch {}
  }
  await race(gl.xr.setSession(session), 15000, "The headset started VR but the board never presented a frame. Tap Exit VR, then Enter VR once.");
  hardenRenderer(gl);
  game.setState({ vrBusy: false, vrActive: true, field3d: true, vrWarm: true, vrError: "" });
  chip("");
}

function patchStore(game) {
  if (patched) return;
  patched = true;
  stripOverlay(navigator.xr);
  game.setState({
    enterVr: async () => {
      const st = game.getState();
      if (st.vrBusy || st.vrActive) return;
      if (inIframe()) {
        breakOutForVr();
        return;
      }
      game.setState({ vrBusy: true, vrError: "", vrWarm: true });
      let gl = getGl();
      if (!gl) {
        chip("Preparing the 3D field behind the board…");
        try {
          gl = await waitGl(GL_MS);
        } catch (err) {
          resetVr(game, err instanceof Error ? err.message : "Could not start VR");
          return;
        }
        game.setState({ vrBusy: false, vrWarm: true });
        chip("3D field is ready — tap Enter VR once more.");
        return;
      }
      chip("Put the headset on — starting the board in VR…");
      try {
        const session = await race(
          requestVrSession(),
          SESSION_MS,
          "The headset did not start VR. Open Creature Chess full-page in Quest Browser and tap Enter VR once.",
        );
        await attachSession(game, gl, session);
      } catch (err) {
        try {
          await liveSession?.end();
        } catch {}
        resetVr(game, err instanceof Error ? err.message : "Could not start VR");
      }
    },
    exitVr: async () => {
      const session = liveSession || getGl()?.xr.getSession?.() || null;
      liveSession = null;
      try {
        await session?.end();
      } catch {}
      resetVr(game, "");
    },
  });
}

if (isHeadsetBrowser()) {
  patchGetContext();
  import(/* webpackIgnore: true */ BOARD3D).catch(() => {});
  hideTitleVr();
  const watch = new MutationObserver(hideTitleVr);
  watch.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest?.("button");
      if (!isVrButton(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      const game = window.__game;
      if (!game?.getState) return;
      const st = game.getState();
      const aria = (btn.getAttribute("aria-label") || "").trim();
      const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
      if (st.vrActive || aria === "Exit VR" || text === "Exit VR") st.exitVr?.();
      else st.enterVr?.();
    },
    true,
  );
  waitGame().then((game) => {
    if (!game) {
      chip("Creature Chess did not finish loading.", "err");
      return;
    }
    game.setState({ vrSupported: true });
    patchStore(game);
    hideTitleVr();
    warmBoard(game);
    game.subscribe?.(() => warmBoard(game));
    if (new URLSearchParams(location.search).get("vr") === "1") {
      window.setTimeout(() => game.getState().enterVr?.(), 500);
    }
  });
}
