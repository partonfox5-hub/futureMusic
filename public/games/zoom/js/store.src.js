/** Local + remote map persistence. */
import { deserialize, serialize } from "./map.js?v=zm10";

const LS = "zoom.maps.v1";
const API = "/api/zoom/maps";

function bust(path) {
  return path + (path.includes("?") ? "&" : "?") + "t=" + Date.now();
}

const FETCH_OPTS = { cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } };

function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || "[]");
    return raw.map((m) => deserialize(m));
  } catch {
    return [];
  }
}

function writeLocal(maps) {
  const slim = maps.map((m) => serialize(m));
  localStorage.setItem(LS, JSON.stringify(slim));
}

function revOf(m) {
  return (m && (m.rev | 0)) || 0;
}

function prefer(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ra = revOf(a);
  const rb = revOf(b);
  if (ra !== rb) return ra > rb ? a : b;
  return (a.updated || 0) >= (b.updated || 0) ? a : b;
}

export async function listMaps() {
  const local = readLocal();
  let remote = [];
  try {
    const r = await fetch(bust(API), FETCH_OPTS);
    if (r.ok) {
      const data = await r.json();
      remote = (data.maps || data || []).map((m) => deserialize(m));
    }
  } catch {
    /* offline */
  }
  const byId = new Map();
  for (const m of local) byId.set(m.id, m);
  for (const m of remote) byId.set(m.id, prefer(byId.get(m.id), m));
  return [...byId.values()].sort((a, b) => (revOf(b) - revOf(a)) || ((b.updated || 0) - (a.updated || 0)));
}

export async function getMap(id, rev) {
  if (id === "preview") {
    try {
      const raw = sessionStorage.getItem("zoom.preview");
      if (raw) return deserialize(JSON.parse(raw));
    } catch {}
  }
  const local = readLocal().find((m) => m.id === id);
  try {
    let url = API + "/" + encodeURIComponent(id);
    if (rev != null && rev !== "") url += "?rev=" + encodeURIComponent(rev);
    const r = await fetch(bust(url), FETCH_OPTS);
    if (r.ok) {
      const m = deserialize(await r.json());
      return prefer(local, m);
    }
  } catch {}
  return local || null;
}

async function postMap(payload) {
  const r = await fetch(bust(API), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

export async function saveMap(map) {
  map.rev = (map.rev | 0) + 1;
  map.updated = Date.now();
  const payload = serialize(map);
  const local = readLocal().filter((m) => m.id !== map.id);
  const saved = deserialize(payload);
  local.unshift(saved);
  writeLocal(local);
  stashPreview(saved);
  let last = { ok: false, remote: false, map: saved };
  for (let i = 0; i < 3; i++) {
    try {
      const r = await postMap(payload);
      if (!r.ok) {
        last = { ok: false, remote: false, status: r.status, map: saved, body: r.body };
        continue;
      }
      const remoteOk = !!r.body.remote && ((r.body.rev | 0) >= revOf(saved) || r.body.rev == null);
      if (!remoteOk && i < 2) {
        last = { ok: true, remote: false, map: saved, body: r.body };
        continue;
      }
      Object.assign(map, saved);
      return { ok: true, remote: remoteOk, confirmed: remoteOk, map: saved, body: r.body };
    } catch {
      last = { ok: false, remote: false, map: saved };
    }
  }
  Object.assign(map, saved);
  return last;
}

export async function deleteMap(id) {
  writeLocal(readLocal().filter((m) => m.id !== id));
  try {
    await fetch(API + "/" + encodeURIComponent(id), { method: "DELETE" });
  } catch {}
}

export function stashPreview(map) {
  sessionStorage.setItem("zoom.preview", JSON.stringify(serialize(map)));
}
