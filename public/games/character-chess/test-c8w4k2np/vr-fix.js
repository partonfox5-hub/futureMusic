/**
 * Creature Chess Quest VR:
 * - Request the session on the same tap (Quest drops the gesture if we wait).
 * - Never use DOM overlay (hangs / blacks out in Quest Browser).
 * - Break out of the /chess iframe before starting XR.
 * - Freeze renderer setSize/pixelRatio while presenting so the XR layer stays valid.
 */
const FULL_PATH = "/games/character-chess/chess-static.html";
const SESSION_MS = 25000;
const GL_MS = 25000;

let liveSession = null;
let patched = false;

function chip(text, kind) {
  let el = document.getElementById("cc-vr-chip");
  if (!text) {
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
  el.textContent = text;
}

function isVrButton(btn) {
  if (!btn) return false;
  const aria = (btn.getAttribute("aria-label") || "").trim();
  if (aria === "Enter VR" || aria === "Exit VR") return true;
  const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
  return label === "VR field" || label === "Starting VR…" || label === "Starting VR..." || label === "Exit VR" || label === "ENTER VR";
}

function hideTitleVr() {
  for (const btn of document.querySelectorAll("button")) {
    const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    if (label === "VR field" || label === "Starting VR…" || label === "Starting VR...") {
      btn.classList.add("cc-hide-title-vr");
    }
  }
}

function race(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function getGl() {
  for (const canvas of document.querySelectorAll("canvas")) {
    const raw = canvas.__r3f;
    if (!raw) continue;
    const buckets = [];
    try {
      if (typeof raw.getState === "function") buckets.push(raw.getState());
    } catch {}
    try {
      if (raw.store && typeof raw.store.getState === "function") buckets.push(raw.store.getState());
    } catch {}
    try {
      if (raw.root && typeof raw.root.getState === "function") buckets.push(raw.root.getState());
    } catch {}
    if (raw.gl) buckets.push(raw);
    for (const state of buckets) {
      if (state?.gl?.xr) return state.gl;
    }
  }
  return null;
}

function waitGl(ms) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const gl = getGl();
      if (gl) {
        resolve(gl);
        return;
      }
      if (Date.now() - start > ms) {
        reject(new Error("The 3D board did not finish loading. Stay on the field and tap Enter VR again."));
        return;
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
    const extra = [...(next.optionalFeatures || [])].filter((f) => f !== "dom-overlay" && f !== "hand-tracking");
    if (!extra.includes("local-floor")) extra.push("local-floor");
    next.optionalFeatures = extra;
    delete next.domOverlay;
    return orig(mode, next);
  };
}

function requestVrSession() {
  const xr = navigator.xr;
  if (!xr?.requestSession) {
    return Promise.reject(new Error("WebXR is not available in this browser."));
  }
  stripOverlay(xr);
  return xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
}

function waitGame() {
  return new Promise((resolve) => {
    if (window.__game?.getState) {
      resolve(window.__game);
      return;
    }
    const tick = window.setInterval(() => {
      if (window.__game?.getState) {
        window.clearInterval(tick);
        resolve(window.__game);
      }
    }, 40);
    window.setTimeout(() => {
      window.clearInterval(tick);
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

function resetVr(store, error) {
  const alpha = !!store.getState().alphaUnlocked;
  liveSession = null;
  store.setState({
    vrActive: false,
    vrBusy: false,
    field3d: alpha,
    vrError: error || "",
  });
  chip(error || "", error ? "err" : "");
}

async function attachSession(store, session) {
  liveSession = session;
  session.addEventListener("end", () => {
    if (liveSession === session) liveSession = null;
    const st = store.getState();
    if (st.vrActive || st.vrBusy) resetVr(store, "");
  });
  const gl = await waitGl(GL_MS);
  gl.xr.enabled = true;
  try {
    gl.xr.setReferenceSpaceType("local-floor");
  } catch {}
  try {
    gl.xr.setFramebufferScaleFactor(1);
  } catch {}
  hardenRenderer(gl);
  try {
    const ctx = gl.getContext?.();
    if (ctx?.makeXRCompatible) await ctx.makeXRCompatible();
  } catch {}
  await gl.xr.setSession(session);
  hardenRenderer(gl);
  store.setState({ vrBusy: false, vrActive: true, field3d: true, vrError: "" });
  chip("");
}

function patchStore(store) {
  if (patched) return;
  patched = true;
  stripOverlay(navigator.xr);

  store.setState({
    enterVr: async () => {
      const st = store.getState();
      if (st.vrBusy || st.vrActive) return;

      if (inIframe()) {
        breakOutForVr();
        return;
      }

      let sessionPromise;
      try {
        sessionPromise = requestVrSession();
      } catch (err) {
        resetVr(store, err instanceof Error ? err.message : "Could not start VR");
        return;
      }

      store.setState({
        vrBusy: true,
        vrError: "",
        vrActive: true,
        field3d: true,
      });
      chip("Put the headset on — starting the board in VR…");

      try {
        const session = await race(
          sessionPromise,
          SESSION_MS,
          "The headset did not start VR. Open Creature Chess full-page (not inside the site chrome) and tap Enter VR once."
        );
        await attachSession(store, session);
      } catch (err) {
        try {
          await liveSession?.end();
        } catch {}
        resetVr(store, err instanceof Error ? err.message : "Could not start VR");
      }
    },
    exitVr: async () => {
      const session = liveSession || getGl()?.xr.getSession?.() || null;
      liveSession = null;
      try {
        await session?.end();
      } catch {}
      resetVr(store, "");
    },
  });
}

hideTitleVr();
const watch = new MutationObserver(hideTitleVr);
watch.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener(
  "click",
  (ev) => {
    const btn = ev.target.closest?.("button");
    if (!isVrButton(btn)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const store = window.__game;
    if (!store?.getState) return;
    const st = store.getState();
    const aria = (btn.getAttribute("aria-label") || "").trim();
    const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    if (st.vrActive || aria === "Exit VR" || label === "Exit VR") {
      st.exitVr?.();
      return;
    }
    st.enterVr?.();
  },
  true
);

waitGame().then((store) => {
  if (!store) {
    chip("Creature Chess did not finish loading.", "err");
    return;
  }
  if (navigator.xr) store.setState({ vrSupported: true });
  patchStore(store);
  hideTitleVr();
  const q = new URLSearchParams(location.search);
  if (q.get("vr") === "1" && navigator.xr) {
    window.setTimeout(() => store.getState().enterVr?.(), 400);
  }
});
