"use strict";

const path = require("path");
const fs = require("fs");

function safeId(id) {
  const s = String(id || "").toLowerCase();
  if (!/^[a-z0-9_-]{3,48}$/.test(s)) return null;
  return s;
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

function noCache(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function metaOf(m) {
  if (!m || !m.id) return null;
  return {
    id: String(m.id),
    name: String(m.name || m.id).slice(0, 64),
    updated: m.updated || 0,
    rev: revOf(m),
  };
}

function slim(map) {
  const out = { ...map };
  out.name = String(map.name || "Untitled").slice(0, 64);
  out.v = Math.max(1, parseInt(map.v, 10) || 1);
  out.rev = Math.max(0, parseInt(map.rev, 10) || 0);
  out.updated = Date.now();
  return out;
}

function mount(app, { storage, bucketName }) {
  const prefix = "horde/maps/";
  const indexName = "_index.json";
  const localDir = path.join(__dirname, "..", "public", "games", "horde", "saved");
  try {
    fs.mkdirSync(localDir, { recursive: true });
  } catch {}

  function localPath(id) {
    return path.join(localDir, id + ".json");
  }

  function readLocal(id) {
    try {
      return JSON.parse(fs.readFileSync(localPath(id), "utf8"));
    } catch {
      return null;
    }
  }

  function writeLocal(id, obj) {
    fs.writeFileSync(localPath(id), JSON.stringify(obj));
  }

  function listLocalMeta() {
    try {
      return fs
        .readdirSync(localDir)
        .filter((f) => f.endsWith(".json") && f !== indexName)
        .map((f) => {
          try {
            return metaOf(JSON.parse(fs.readFileSync(path.join(localDir, f), "utf8")));
          } catch {
            return { id: f.replace(/\.json$/, ""), name: f.replace(/\.json$/, ""), updated: 0, rev: 0 };
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async function readGcs(id) {
    if (!storage || !bucketName) return null;
    try {
      const [buf] = await storage.bucket(bucketName).file(prefix + id + ".json").download();
      return JSON.parse(buf.toString("utf8"));
    } catch {
      return null;
    }
  }

  async function writeGcs(id, obj) {
    if (!storage || !bucketName) return false;
    const payload = JSON.stringify(obj);
    const opts = {
      contentType: "application/json",
      resumable: payload.length > 5000000,
      metadata: {
        cacheControl: "no-store, max-age=0",
        metadata: {
          mapName: String(obj.name || id).slice(0, 64),
          rev: String(obj.rev || 0),
          updated: String(obj.updated || Date.now()),
        },
      },
    };
    try {
      await storage.bucket(bucketName).file(prefix + id + ".json").save(payload, opts);
      return true;
    } catch (e) {
      console.warn("[horde] gcs save failed", e.message);
      return false;
    }
  }

  async function readIndex() {
    if (!storage || !bucketName) return [];
    try {
      const [buf] = await storage.bucket(bucketName).file(prefix + indexName).download();
      const data = JSON.parse(buf.toString("utf8"));
      return Array.isArray(data.maps) ? data.maps.map(metaOf).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  async function writeIndex(maps) {
    if (!storage || !bucketName) return;
    const body = JSON.stringify({ maps: maps.slice(0, 80) });
    try {
      await storage.bucket(bucketName).file(prefix + indexName).save(body, {
        contentType: "application/json",
        resumable: false,
        metadata: { cacheControl: "no-store, max-age=0" },
      });
    } catch (e) {
      console.warn("[horde] gcs index save failed", e.message);
    }
  }

  async function listGcsMeta() {
    if (!storage || !bucketName) return [];
    const out = [];
    try {
      const [files] = await storage.bucket(bucketName).getFiles({ prefix, autoPaginate: true });
      for (const f of files) {
        const base = path.posix.basename(f.name);
        if (!base.endsWith(".json") || base === indexName || /\.r\d+\.json$/.test(base)) continue;
        const id = base.replace(/\.json$/, "");
        if (!safeId(id)) continue;
        const md = (f.metadata && f.metadata.metadata) || {};
        out.push({
          id,
          name: md.mapName || id,
          updated: Date.parse(md.updated || (f.metadata && f.metadata.updated) || 0) || 0,
          rev: parseInt(md.rev, 10) || 0,
        });
      }
    } catch (e) {
      console.warn("[horde] gcs list failed", e.message);
    }
    return out;
  }

  async function upsertIndex(meta) {
    const byId = new Map();
    for (const m of await readIndex()) if (m && m.id) byId.set(m.id, m);
    byId.set(meta.id, prefer(byId.get(meta.id), meta));
    const maps = [...byId.values()].sort((a, b) => (b.updated || 0) - (a.updated || 0));
    await writeIndex(maps);
  }

  app.get("/api/horde/maps", async (req, res) => {
    noCache(res);
    try {
      const byId = new Map();
      for (const m of listLocalMeta()) if (m && m.id) byId.set(m.id, m);
      for (const m of await readIndex()) if (m && m.id) byId.set(m.id, prefer(byId.get(m.id), m));
      for (const m of await listGcsMeta()) if (m && m.id) byId.set(m.id, prefer(byId.get(m.id), m));
      const maps = [...byId.values()].sort((a, b) => (b.updated || 0) - (a.updated || 0));
      res.json({ maps });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/horde/maps/:id", async (req, res) => {
    noCache(res);
    const id = safeId(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });
    const gcs = await readGcs(id);
    const loc = readLocal(id);
    const m = prefer(loc, gcs);
    if (!m) return res.status(404).json({ error: "missing" });
    res.json(m);
  });

  app.post("/api/horde/maps", async (req, res) => {
    noCache(res);
    try {
      const body = req.body || {};
      const id = safeId(body.id);
      if (!id) return res.status(400).json({ error: "bad id", got: String(body.id || "") });
      const raw = JSON.stringify(body);
      if (raw.length > 8000000) return res.status(413).json({ error: "too large" });
      const prev = prefer(readLocal(id), await readGcs(id));
      const nextRev = Math.max(revOf(prev) + 1, parseInt(body.rev, 10) || 0);
      const obj = slim({ ...body, id, rev: nextRev, updated: Date.now() });
      try {
        writeLocal(id, obj);
      } catch (e) {
        console.warn("[horde] local save failed", e.message);
      }
      const remote = await writeGcs(id, obj);
      await upsertIndex(metaOf(obj));
      res.json({ ok: true, id, remote, updated: obj.updated, rev: obj.rev, name: obj.name });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/horde/maps/:id", async (req, res) => {
    noCache(res);
    const id = safeId(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });
    try {
      fs.unlinkSync(localPath(id));
    } catch {}
    try {
      if (storage && bucketName) await storage.bucket(bucketName).file(prefix + id + ".json").delete({ ignoreNotFound: true });
    } catch {}
    try {
      const maps = (await readIndex()).filter((m) => m.id !== id);
      await writeIndex(maps);
    } catch {}
    res.json({ ok: true });
  });
}

module.exports = { mount };
