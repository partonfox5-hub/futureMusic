/** Scripted AI workshop tour with on-screen control labels. */

function demoOn() {
  const q = new URLSearchParams(location.search);
  return q.get("demo") === "1" || q.get("demo") === "loop";
}

function looping() {
  return new URLSearchParams(location.search).get("demo") === "loop";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function label(key, sub) {
  const tag = document.getElementById("bb-demo-tag");
  const k = document.getElementById("bb-demo-key");
  const s = document.getElementById("bb-demo-sub");
  if (tag) tag.classList.add("on");
  if (k) k.textContent = key;
  if (s) s.textContent = sub || "";
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
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_800_000 });
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

async function tour(bb) {
  const start = document.getElementById("start");
  if (start) start.style.display = "none";
  document.querySelectorAll("body > button").forEach((b) => {
    if (/XR|VR/i.test(b.textContent || "")) b.style.display = "none";
  });
  document.getElementById("hud")?.setAttribute("data-demo", "1");
  bb.setLook(0.18, -0.72);
  bb.setRig(0.0, 1.22, 0.38);
  bb.setScale(8);
  bb.setPieceScale(1);
  bb.setGravity(true);

  label("WASD · fly", "Move around the table");
  const t0 = performance.now();
  while (performance.now() - t0 < 1400) {
    const u = (performance.now() - t0) / 1400;
    bb.setRig(0.0, 1.22 - u * 0.04, 0.38 - u * 0.06);
    bb.setLook(0.18 + u * 0.12, -0.72 + u * 0.08);
    await sleep(16);
  }

  label("Click · place", "Snap a 2×4 brick to the studs");
  bb.setKind("brick");
  bb.setDim("2x4");
  bb.setColor("red");
  bb.setRot(0);
  for (let i = 0; i < 4; i++) {
    bb.put("2x4", "brick", "red", -4 + i * 4, 0, -2, 0);
    await sleep(320);
  }

  label("X · rotate", "Turn the next piece 90°");
  bb.setRot(1);
  bb.setColor("blue");
  for (let i = 0; i < 3; i++) {
    bb.put("2x4", "brick", "blue", 12, 0, -2 + i * 4, 1);
    await sleep(340);
  }

  label("C · color  ·  V · size", "Blue wall, then a yellow 2×2");
  bb.setDim("2x2");
  bb.setColor("yellow");
  bb.setRot(0);
  bb.put("2x2", "brick", "yellow", -4, 3, -2, 0);
  await sleep(400);
  bb.put("2x2", "brick", "yellow", 0, 3, -2, 0);
  await sleep(400);
  bb.put("2x2", "brick", "yellow", 4, 3, -2, 0);
  await sleep(450);

  label("T · piece scale", "1× then 2× bricks");
  bb.setPieceScale(2);
  bb.setDim("2x4");
  bb.setColor("green");
  bb.put("2x4", "brick", "green", -8, 0, 6, 0);
  await sleep(500);
  bb.setPieceScale(1);
  label("Slopes & plates", "Roof tiles and a base");
  bb.setKind("slope");
  bb.setDim("2x4");
  bb.setColor("orange");
  bb.put("2x4", "slope", "orange", -4, 6, -2, 0);
  await sleep(280);
  bb.put("2x4", "slope", "orange", 0, 6, -2, 0);
  await sleep(280);
  bb.put("2x4", "slope", "orange", 4, 6, -2, 0);
  await sleep(400);
  bb.setKind("plate");
  bb.setColor("lime");
  bb.put("2x8", "plate", "lime", -4, 0, 4, 0);
  await sleep(450);

  label("Fig · minifigure", "Place a little builder");
  bb.placeFig(-0.02, 0.02);
  await sleep(700);

  label("P · dump a pile", "Loose bricks bounce on the table");
  bb.spawnPile();
  await sleep(1400);

  label("Orbit", "Look around the workshop");
  const t1 = performance.now();
  while (performance.now() - t1 < 2600) {
    const u = (performance.now() - t1) / 2600;
    const a = 0.18 + u * 1.05;
    bb.setLook(a, -0.68);
    bb.setRig(Math.sin(a) * 0.12, 1.2, 0.32 + Math.cos(a) * 0.06);
    await sleep(16);
  }

  label("Blockbuild", "Desktop + VR  ·  $5 on the website");
  await sleep(1600);
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
