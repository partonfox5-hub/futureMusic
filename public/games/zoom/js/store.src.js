/** Local + remote map persistence. */
import { deserialize, serialize } from "./map.js?v=zm9";

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
  for (const m of remote) {
    const prev = byId.get(m.id);
    if (!prev || (m.updated || 0) >= (prev.updated || 0)) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

export async function getMap(id) {
  if (id === "preview") {
    try {
      const raw = sessionStorage.getItem("zoom.preview");
      if (raw) return deserialize(JSON.parse(raw));
    } catch {}
  }
  const local = readLocal().find((m) => m.id === id);
  try {
    const r = await fetch(bust(API + "/" + encodeURIComponent(id)), FETCH_OPTS);
    if (r.ok) {
      const m = deserialize(await r.json());
      if (!local || (m.updated || 0) >= (local.updated || 0)) return m;
    }
  } catch {}
  return local || null;
}

export async function saveMap(map) {
  map.updated = Date.now();
  const payload = serialize(map);
  const local = readLocal().filter((m) => m.id !== map.id);
  local.unshift(deserialize(payload));
  writeLocal(local);
  try {
    const r = await fetch(bust(API), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return { ok: false, remote: false, status: r.status, map };
    const body = await r.json().catch(() => ({}));
    return { ok: true, remote: !!body.remote, map, body };
  } catch {
    return { ok: false, remote: false, map };
  }
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
