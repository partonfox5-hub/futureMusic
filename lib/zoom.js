"use strict";

const path = require("path");
const fs = require("fs");

function safeId(id) {
  const s = String(id || "").toLowerCase();
  if (!/^[a-z0-9_-]{3,48}$/.test(s)) return null;
  return s;
}

function slim(map) {
  const out = { ...map };
  out.name = String(map.name || "Untitled").slice(0, 64);
  out.v = 2;
  out.spheres = Array.isArray(map.spheres) ? map.spheres.slice(0, 400) : [];
  out.objects = Array.isArray(map.objects) ? map.objects.slice(0, 400) : [];
  out.spawners = Array.isArray(map.spawners) ? map.spawners.slice(0, 80) : [];
  out.pickups = Array.isArray(map.pickups) ? map.pickups.slice(0, 200) : [];
  out.keys = Array.isArray(map.keys) ? map.keys.slice(0, 80) : [];
  out.openings = Array.isArray(map.openings) ? map.openings.slice(0, 200) : [];
  out.portals = Array.isArray(map.portals) ? map.portals.slice(0, 40) : [];
  out.ropes = Array.isArray(map.ropes) ? map.ropes.slice(0, 80) : [];
  out.crushers = Array.isArray(map.crushers) ? map.crushers.slice(0, 40) : [];
  out.turrets = Array.isArray(map.turrets) ? map.turrets.slice(0, 40) : [];
  out.climbs = Array.isArray(map.climbs) ? map.climbs.slice(0, 80) : [];
  out.boulders = Array.isArray(map.boulders) ? map.boulders.slice(0, 40) : [];
  out.vendors = Array.isArray(map.vendors) ? map.vendors.slice(0, 40) : [];
  out.arrows = Array.isArray(map.arrows) ? map.arrows.slice(0, 80) : [];
  out.npcs = Array.isArray(map.npcs) ? map.npcs.slice(0, 40) : [];
  out.ridges = Array.isArray(map.ridges) ? map.ridges.slice(0, 200) : [];
  out.ultimatums = Array.isArray(map.ultimatums) ? map.ultimatums.slice(0, 40) : [];
  out.updated = Date.now();
  return out;
}

function noCache(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function mount(app, { storage, bucketName }) {
  const prefix = "zoom/maps/";
  const localDir = path.join(__dirname, "..", "public", "games", "zoom", "saved");
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
    try {
      await storage
        .bucket(bucketName)
        .file(prefix + id + ".json")
        .save(JSON.stringify(obj), {
          contentType: "application/json",
          resumable: false,
          metadata: { cacheControl: "no-store" },
        });
      return true;
    } catch (e) {
      console.warn("[zoom] gcs save failed", e.message);
      return false;
    }
  }

  async function listGcs() {
    if (!storage || !bucketName) return [];
    try {
      const [files] = await storage.bucket(bucketName).getFiles({ prefix });
      const out = [];
      for (const f of files.slice(0, 120)) {
        try {
          const [buf] = await f.download();
          out.push(JSON.parse(buf.toString("utf8")));
        } catch {}
      }
      return out;
    } catch (e) {
      console.warn("[zoom] gcs list failed", e.message);
      return [];
    }
  }

  app.get("/api/zoom/maps", async (req, res) => {
    noCache(res);
    try {
      const byId = new Map();
      for (const m of listLocal()) if (m && m.id) byId.set(m.id, m);
      for (const m of await listGcs()) if (m && m.id) byId.set(m.id, m);
      res.json({ maps: [...byId.values()] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/zoom/maps/:id", async (req, res) => {
    noCache(res);
    const id = safeId(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });
    const gcs = await readGcs(id);
    const loc = readLocal(id);
    const m = !gcs ? loc : !loc ? gcs : (gcs.updated || 0) >= (loc.updated || 0) ? gcs : loc;
    if (!m) return res.status(404).json({ error: "missing" });
    res.json(m);
  });

  app.post("/api/zoom/maps", async (req, res) => {
    noCache(res);
    try {
      const body = req.body || {};
      const id = safeId(body.id);
      if (!id) return res.status(400).json({ error: "bad id" });
      if (!body.cells || typeof body.cells !== "string") return res.status(400).json({ error: "cells" });
      if (body.cells.length > 2000000) return res.status(413).json({ error: "too large" });
      const obj = slim({ ...body, id, updated: Date.now() });
      writeLocal(id, obj);
      const remote = await writeGcs(id, obj);
      res.json({ ok: true, id, remote, updated: obj.updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/zoom/maps/:id", async (req, res) => {
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
