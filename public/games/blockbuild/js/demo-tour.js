/** Scripted AI workshop tour: slow orbit + a little house, ~30 seconds. */

function demoOn() {
  const q = new URLSearchParams(location.search);
  return q.get("demo") === "1" || q.get("demo") === "loop";
}

function looping() {
  return new URLSearchParams(location.search).get("demo") === "loop";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PITCH = ["block build for VR", "Try it just $9.99!"];

function label(key) {
  const tag = document.getElementById("bb-demo-tag");
  const k = document.getElementById("bb-demo-key");
  const s = document.getElementById("bb-demo-sub");
  if (tag) tag.classList.add("on");
  if (k) k.textContent = key;
  if (s) s.textContent = "";
}

function startPitch() {
  let i = 0;
  label(PITCH[0]);
  const id = setInterval(() => {
    i = (i + 1) % PITCH.length;
    label(PITCH[i]);
  }, 2400);
  return () => clearInterval(id);
}

function waitBb() {
  return new Promise((res) => {
    const t = setInterval(() => {
      if (window.__bb?.put) {
        clearInterval(t);
        res(window.__bb);
      }
    }, 40);
  });
}

async function recordStart() {
  const canvas = document.getElementById("c");
  if (!canvas || !canvas.captureStream || typeof MediaRecorder === "undefined") return null;
  let mime = "";
  for (const t of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) {
      mime = t;
      break;
    }
  }
  if (!mime) return null;
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_200_000 });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  rec.start(400);
  return { rec, chunks, mime };
}

async function recordStop(job) {
  if (!job) return null;
  const { rec, chunks, mime } = job;
  if (rec.state === "inactive") return null;
  const blob = await new Promise((res) => {
    rec.onstop = () => res(new Blob(chunks, { type: mime || "video/webm" }));
    rec.stop();
  });
  window.__bbDemoBlob = blob;
  return blob;
}

function hideChrome() {
  const start = document.getElementById("start");
  if (start) start.style.display = "none";
  document.getElementById("hud")?.setAttribute("data-demo", "1");
  const killXr = () => {
    document.querySelectorAll("body > button, #XRButton, .xr-button").forEach((b) => {
      b.style.setProperty("display", "none", "important");
    });
  };
  killXr();
  if (!hideChrome._xr) {
    hideChrome._xr = setInterval(killXr, 250);
  }
}

/**
 * Desktop camera sits at local (0, 1.55, 0) on the rig.
 * Keep rig.y near 0 so the camera is only a little above the table and
 * the house reads in 3/4 instead of top-down.
 */
function aimHouse(bb, a, radius) {
  const tz = -0.35;
  const x = Math.sin(a) * radius;
  const z = tz + Math.cos(a) * radius;
  bb.setRig(x, 0.06, z);
  bb.setLook(a, -0.56);
}

function startOrbit(bb, durationMs) {
  let running = true;
  const t0 = performance.now();
  const task = (async () => {
    while (running) {
      const t = performance.now() - t0;
      const u = Math.min(1, t / durationMs);
      const eased = u * u * (3 - 2 * u);
      const a = -0.40 + eased * 2.20;
      const radius = 0.42 - Math.sin(u * Math.PI) * 0.10;
      aimHouse(bb, a, radius);
      await sleep(16);
    }
  })();
  return {
    stop() { running = false; },
    done: task,
  };
}

async function place(bb, dim, kind, col, gx, gy, gz, r, wait) {
  bb.setKind(kind);
  bb.setDim(dim);
  bb.setColor(col);
  bb.setRot(r);
  bb.put(dim, kind, col, gx, gy, gz, r);
  await sleep(wait);
}

async function tour(bb) {
  hideChrome();
  bb.clearWorld();
  bb.setScale(8);
  bb.setPieceScale(1);
  bb.setGravity(true);

  const DURATION = 30000;
  const orbit = startOrbit(bb, DURATION);
  const stopPitch = startPitch();
  const t0 = performance.now();

  await sleep(2400);
  await place(bb, "8x8", "plate", "tan", -4, 0, -4, 0, 1500);
  await place(bb, "2x4", "brick", "red", -4, 1, -4, 1, 820);
  await place(bb, "2x2", "brick", "red", 2, 1, -4, 0, 820);
  await place(bb, "2x4", "brick", "red", -4, 1, -2, 0, 820);
  await place(bb, "2x4", "brick", "red", 2, 1, -2, 0, 820);
  await place(bb, "2x4", "brick", "red", -4, 1, 2, 1, 820);
  await place(bb, "2x4", "brick", "red", 0, 1, 2, 1, 900);
  await place(bb, "2x4", "brick", "yellow", -4, 4, -4, 1, 780);
  await place(bb, "2x4", "brick", "yellow", 0, 4, -4, 1, 780);
  await place(bb, "2x4", "brick", "yellow", -4, 4, -2, 0, 780);
  await place(bb, "2x4", "brick", "yellow", 2, 4, -2, 0, 780);
  await place(bb, "2x4", "brick", "yellow", -4, 4, 2, 1, 780);
  await place(bb, "2x4", "brick", "yellow", 0, 4, 2, 1, 900);
  await place(bb, "4x4", "brick", "orange", -4, 7, -4, 0, 900);
  await place(bb, "4x4", "brick", "orange", 0, 7, -4, 0, 900);
  await place(bb, "4x4", "brick", "orange", -4, 7, 0, 0, 900);
  await place(bb, "4x4", "brick", "orange", 0, 7, 0, 0, 1100);
  bb.setColor("brown");
  await place(bb, "1x2", "brick", "brown", 1, 10, 1, 0, 700);
  bb.placeFig(0.008, -0.058);
  await sleep(1600);
  const used = performance.now() - t0;
  const rest = Math.max(2200, DURATION - used - 400);
  await sleep(rest);

  orbit.stop();
  stopPitch();
  await orbit.done;
}

async function boot() {
  if (!demoOn()) return;
  const bb = await waitBb();
  const rec = await recordStart();
  try {
    do {
      await tour(bb);
    } while (looping() && !rec);
  } finally {
    await recordStop(rec);
    window.__bbDemoDone = true;
    document.dispatchEvent(new Event("bb-demo-done"));
  }
  if (looping()) {
    while (true) await tour(bb);
  }
}

boot();
