/**
 * Creature Chess field VR: drop the title-menu "VR field" button, and start
 * WebXR on the same click as the field HUD button (Quest drops the gesture if
 * we wait for the 3D canvas first). No DOM overlay — that hangs or blacks out
 * in the Quest browser.
 */
const TEST_PATH = "/test-c8w4k2np";
const SESSION_MS = 25000;
const GL_MS = 20000;

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

function hideTitleVr() {
  for (const btn of document.querySelectorAll("button")) {
    if (btn.getAttribute("aria-label") === "Enter VR" || btn.getAttribute("aria-label") === "Exit VR") {
      continue;
    }
    const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    if (label === "VR field" || label === "Starting VR…" || label === "Starting VR..." || label === "Exit VR") {
      btn.classList.add("cc-hide-title-vr");
      btn.hidden = true;
      btn.setAttribute("aria-hidden", "true");
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
        reject(new Error("The 3D field did not finish loading. Stay on the field and try Enter VR again."));
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
    const extra = [...(next.optionalFeatures || [])].filter((f) => f !== "dom-overlay");
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
    const ctx = gl.getContext?.();
    if (ctx?.makeXRCompatible) await ctx.makeXRCompatible();
  } catch {}
  await gl.xr.setSession(session);
  store.setState({ vrBusy: false, vrActive: true, field3d: true, vrError: "" });
  chip("");
}

function inIframe() {
  try {
    return window.top !== window;
  } catch {
    return true;
  }
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
        try {
          window.top.location.href = `${window.location.origin}${TEST_PATH}`;
        } catch {
          resetVr(store, "VR needs this full page. Open the test URL directly in the Quest browser.");
        }
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
      chip("Look at the headset prompt, then keep the field on screen…");

      try {
        const session = await race(
          sessionPromise,
          SESSION_MS,
          "The headset did not start VR. Use this full-page test (not the framed /chess window) and tap Enter VR once."
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
    if (!btn) return;
    const aria = btn.getAttribute("aria-label");
    if (aria === "Enter VR" || aria === "Exit VR") return;
    const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    if (label === "VR field" || label === "Starting VR…" || label === "Starting VR...") {
      ev.preventDefault();
      ev.stopPropagation();
    }
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
});
