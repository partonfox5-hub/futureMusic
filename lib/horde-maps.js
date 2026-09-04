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

  function listLocal() {
    try {
      return fs
        .readdirSync(localDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(localDir, f), "utf8"));
          } catch {
            return null;
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
      resumable: false,
      metadata: { cacheControl: "no-store, max-age=0" },
    };
    try {
      await storage.bucket(bucketName).file(prefix + id + ".json").save(payload, opts);
      return true;
    } catch (e) {
      console.warn("[horde] gcs save failed", e.message);
      return false;
    }
  }

  async function listGcs() {
    if (!storage || !bucketName) return [];
    try {
      const [files] = await storage.bucket(bucketName).getFiles({ prefix });
      const out = [];
      const mains = files.filter((f) => /\.json$/.test(f.name) && !/\.r\d+\.json$/.test(f.name));
      for (const f of mains.slice(0, 120)) {
        try {
          const [buf] = await f.download();
          out.push(JSON.parse(buf.toString("utf8")));
        } catch {}
      }
      return out;
    } catch (e) {
      console.warn("[horde] gcs list failed", e.message);
      return [];
    }
  }

  app.get("/api/horde/maps", async (req, res) => {
    noCache(res);
    try {
      const byId = new Map();
      for (const m of listLocal()) if (m && m.id) byId.set(m.id, m);
      for (const m of await listGcs()) if (m && m.id) byId.set(m.id, prefer(byId.get(m.id), m));
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
      if (!id) return res.status(400).json({ error: "bad id" });
      const raw = JSON.stringify(body);
      if (raw.length > 4000000) return res.status(413).json({ error: "too large" });
      const prev = prefer(readLocal(id), await readGcs(id));
      const nextRev = Math.max(revOf(prev) + 1, parseInt(body.rev, 10) || 0);
      const obj = slim({ ...body, id, rev: nextRev, updated: Date.now() });
      writeLocal(id, obj);
      const remote = await writeGcs(id, obj);
      res.json({ ok: true, id, remote, updated: obj.updated, rev: obj.rev });
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
    res.json({ ok: true });
  });
}

module.exports = { mount };
