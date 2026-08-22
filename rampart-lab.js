/**
 * Rampart mod-lab: download official source, list forks, upload + validate zips.
 * Static validation always; optional Grok/xAI malice check if XAI_API_KEY is set.
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const multer = require('multer');
const AdmZip = require('adm-zip');
const axios = require('axios');

const ROOT = path.join(__dirname, 'public', 'games', 'rampart-reborn');
const OFFICIAL_DIR = path.join(ROOT, 'official', 'v1');
const OFFICIAL_ZIP = path.join(ROOT, 'official', 'rampart-reborn-v1-source.zip');
const FORKS_DIR = path.join(ROOT, 'forks');
const REGISTRY_PATH = path.join(ROOT, 'registry.json');
const RAW_DIR = path.join(__dirname, 'raw', 'rampart-uploads');

/** Community fork uploads locked for now (game stays live; projects card hidden). */
const RAMPART_FORK_UPLOADS_ENABLED = false;

const MAX_ZIP_MB = 25;
const MAX_FILES = 2000;
const ALLOWED_EXT = new Set([
  '.html', '.htm', '.js', '.mjs', '.css', '.json', '.md', '.txt',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.map', '.wasm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ZIP_MB * 1024 * 1024, files: 1 },
});

function ensureDirs() {
  for (const d of [ROOT, path.join(ROOT, 'official'), FORKS_DIR, RAW_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(
      REGISTRY_PATH,
      JSON.stringify(
        {
          moduleId: 'rampart-reborn',
          official: {
            version: 'v1',
            path: '/games/rampart-reborn/official/v1/index.html',
          },
          forks: [],
        },
        null,
        2
      )
    );
  }
}

function readRegistry() {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return { moduleId: 'rampart-reborn', official: {}, forks: [] };
  }
}

function writeRegistry(reg) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
}

function isPathSafe(entryName) {
  if (!entryName || entryName.includes('\0')) return false;
  const norm = entryName.replace(/\\/g, '/');
  if (norm.startsWith('/') || /^[a-zA-Z]:/.test(norm)) return false;
  if (norm.split('/').some((p) => p === '..')) return false;
  return true;
}

/**
 * @returns {{ ok: boolean, errors: string[], warnings: string[], manifest?: object }}
 */
function validateExtractedTree(rootDir) {
  const errors = [];
  const warnings = [];
  const manifestPath = path.join(rootDir, 'module.manifest.json');
  const indexPath = path.join(rootDir, 'index.html');

  if (!fs.existsSync(indexPath)) errors.push('Missing index.html');
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing module.manifest.json');
    return { ok: false, errors, warnings };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push('module.manifest.json is not valid JSON: ' + e.message);
    return { ok: false, errors, warnings };
  }

  if (manifest.moduleId !== 'rampart-reborn') {
    errors.push('moduleId must be "rampart-reborn" (got ' + manifest.moduleId + ')');
  }
  if (!manifest.multiplayer || typeof manifest.multiplayer.protocolVersion !== 'number') {
    errors.push('multiplayer.protocolVersion must be a number');
  }
  const entryMod = manifest.multiplayer && manifest.multiplayer.entryModule;
  if (entryMod && !fs.existsSync(path.join(rootDir, entryMod))) {
    errors.push('multiplayer.entryModule missing: ' + entryMod);
  }

  // Scan text sources for dangerous patterns
  const scanExt = new Set(['.js', '.mjs', '.html', '.htm', '.css', '.json']);
  let fileCount = 0;
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      fileCount++;
      if (fileCount > MAX_FILES) {
        errors.push('Too many files (max ' + MAX_FILES + ')');
        return;
      }
      const ext = path.extname(name).toLowerCase();
      if (!ALLOWED_EXT.has(ext) && name !== 'module.manifest.json') {
        errors.push('Disallowed file type: ' + path.relative(rootDir, full));
        continue;
      }
      if (!scanExt.has(ext)) continue;
      let text = '';
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      if (/file:\/\//i.test(text)) errors.push('file:// URL in ' + path.relative(rootDir, full));
      if (/\brequire\s*\(\s*['"]fs['"]/.test(text) || /\brequire\s*\(\s*['"]child_process['"]/.test(text)) {
        errors.push('Node require of fs/child_process in ' + path.relative(rootDir, full));
      }
      if (/\bprocess\.env\b/.test(text) && ext === '.js') {
        warnings.push('process.env reference in ' + path.relative(rootDir, full));
      }
      if (/<script[^>]+src=["']http:\/\//i.test(text)) {
        errors.push('Insecure http:// script src in ' + path.relative(rootDir, full));
      }
    }
  }
  walk(rootDir);

  // Heuristic: multiplayer still present
  const mpPath = entryMod ? path.join(rootDir, entryMod) : null;
  if (mpPath && fs.existsSync(mpPath)) {
    const mp = fs.readFileSync(mpPath, 'utf8');
    for (const token of ['ready', 'createRoom', 'joinRoom', 'Peer']) {
      if (!mp.includes(token)) warnings.push('Multiplayer file may be incomplete (missing "' + token + '")');
    }
  }

  return { ok: errors.length === 0, errors, warnings, manifest };
}

async function grokVerify(rootDir, manifest, report) {
  const key = process.env.XAI_API_KEY;
  if (!key) return { skipped: true, verified: 'static-only' };

  // Collect small sample of key files
  const snippets = [];
  for (const rel of ['module.manifest.json', 'index.html', 'js/systems/MultiplayerManager.js']) {
    const p = path.join(rootDir, rel);
    if (fs.existsSync(p)) {
      const body = fs.readFileSync(p, 'utf8').slice(0, 4000);
      snippets.push({ file: rel, body });
    }
  }

  const prompt = {
    role: 'user',
    content:
      'You are a security reviewer for browser game uploads. Reply with ONLY JSON: ' +
      '{"ok":boolean,"isRampart":boolean,"maliceRisk":"low"|"medium"|"high","reasons":string[]}.\n' +
      'Check: is this a Rampart-like static Phaser browser game? Any malware, phishing, crypto miners, ' +
      'credential theft, or server-side node code?\n' +
      'Manifest: ' +
      JSON.stringify(manifest) +
      '\nStatic report: ' +
      JSON.stringify({ errors: report.errors, warnings: report.warnings }) +
      '\nSnippets:\n' +
      snippets.map((s) => '--- ' + s.file + ' ---\n' + s.body).join('\n'),
  };

  try {
    const res = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: process.env.XAI_MODEL || 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: 'Return only valid JSON. No markdown.',
          },
          prompt,
        ],
        temperature: 0,
      },
      {
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );
    const raw = res.data?.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const verdict = jsonMatch ? JSON.parse(jsonMatch[0]) : { ok: false, reasons: ['Unparseable Grok response'] };
    if (verdict.maliceRisk === 'high' || verdict.ok === false) {
      return {
        skipped: false,
        verified: 'grok-rejected',
        ok: false,
        verdict,
      };
    }
    if (verdict.isRampart === false) {
      return {
        skipped: false,
        verified: 'grok-rejected',
        ok: false,
        verdict,
      };
    }
    return { skipped: false, verified: 'grok', ok: true, verdict };
  } catch (e) {
    console.warn('[rampart-lab] Grok verify failed, continuing with static-only:', e.message);
    return { skipped: true, verified: 'static-only', grokError: e.message };
  }
}

function mount(app, { requireLogin }) {
  ensureDirs();

  const requireLoginApi = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    return res.status(401).json({
      error: 'Login required to upload forks',
      login: '/login',
    });
  };

  app.get('/rampart', (req, res) => {
    const seo = require('./lib/seo');
    res.render('rampart', {
      ...seo.page('rampart'),
      forkUploadsEnabled: RAMPART_FORK_UPLOADS_ENABLED,
      user: req.session?.userId
        ? { id: req.session.userId, email: req.session.email || null }
        : null,
    });
  });

  app.get('/api/rampart/download', (req, res) => {
    ensureDirs();
    if (fs.existsSync(OFFICIAL_ZIP)) {
      return res.download(OFFICIAL_ZIP, 'rampart-reborn-source.zip');
    }
    // Fallback: send index as proof path exists
    res.status(404).json({
      error: 'Source zip not built yet. Ask admin to re-sync official package.',
    });
  });

  app.get('/api/rampart/forks', (req, res) => {
    const reg = readRegistry();
    res.json({
      moduleId: reg.moduleId,
      official: reg.official,
      forks: reg.forks || [],
    });
  });

  app.post('/api/rampart/upload', requireLoginApi, (req, res) => {
    if (!RAMPART_FORK_UPLOADS_ENABLED) {
      return res.status(403).json({
        error: 'Fork uploads are temporarily locked. Play the official build while the mod lab is closed.',
        locked: true,
      });
    }
    upload.single('zip')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload error' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Missing zip file (field name: zip)' });
      }

      const author =
        req.session?.username ||
        req.session?.email ||
        (req.session?.userId != null ? 'user-' + req.session.userId : 'player');

      const tmpRoot = path.join(RAW_DIR, 'tmp-' + crypto.randomBytes(8).toString('hex'));
      const rawZipPath = path.join(RAW_DIR, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.zip');

      try {
        fs.mkdirSync(tmpRoot, { recursive: true });
        fs.writeFileSync(rawZipPath, req.file.buffer);

        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        if (entries.length > MAX_FILES) {
          return res.status(400).json({ error: 'Too many files in zip' });
        }

        // Detect single top-level folder
        let stripPrefix = '';
        const tops = new Set();
        for (const e of entries) {
          if (!isPathSafe(e.entryName)) {
            return res.status(400).json({ error: 'Unsafe path in zip: ' + e.entryName });
          }
          const parts = e.entryName.replace(/\\/g, '/').split('/').filter(Boolean);
          if (parts.length) tops.add(parts[0]);
        }
        // If zip has one root folder and no index at root, strip it
        const hasRootIndex = entries.some(
          (e) => e.entryName.replace(/\\/g, '/') === 'index.html'
        );
        if (!hasRootIndex && tops.size === 1) {
          stripPrefix = [...tops][0] + '/';
        }

        for (const e of entries) {
          if (e.isDirectory) continue;
          let rel = e.entryName.replace(/\\/g, '/');
          if (stripPrefix && rel.startsWith(stripPrefix)) rel = rel.slice(stripPrefix.length);
          if (!rel || rel.endsWith('/')) continue;
          const ext = path.extname(rel).toLowerCase();
          if (!ALLOWED_EXT.has(ext) && path.basename(rel) !== 'module.manifest.json') {
            return res.status(400).json({
              error: 'Disallowed file type in zip: ' + rel,
            });
          }
          const dest = path.join(tmpRoot, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, e.getData());
        }

        const report = validateExtractedTree(tmpRoot);
        if (!report.ok) {
          fs.rmSync(tmpRoot, { recursive: true, force: true });
          return res.status(400).json({
            error: 'Validation failed',
            report,
          });
        }

        const grok = await grokVerify(tmpRoot, report.manifest, report);
        if (grok.ok === false) {
          fs.rmSync(tmpRoot, { recursive: true, force: true });
          return res.status(400).json({
            error: 'Grok security review rejected this upload',
            report: { ...report, grok: grok.verdict },
          });
        }

        const forkId =
          (report.manifest.title || 'fork')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 32) +
          '-' +
          crypto.randomBytes(3).toString('hex');
        const version = 'v1';
        const destDir = path.join(FORKS_DIR, forkId, version);
        fs.mkdirSync(destDir, { recursive: true });
        // copy tree
        const copyRecursive = (src, dst) => {
          fs.mkdirSync(dst, { recursive: true });
          for (const name of fs.readdirSync(src)) {
            const s = path.join(src, name);
            const d = path.join(dst, name);
            if (fs.statSync(s).isDirectory()) copyRecursive(s, d);
            else fs.copyFileSync(s, d);
          }
        };
        copyRecursive(tmpRoot, destDir);
        fs.rmSync(tmpRoot, { recursive: true, force: true });

        const playPath = `/games/rampart-reborn/forks/${forkId}/${version}/index.html`;
        const entry = {
          forkId,
          version,
          title: report.manifest.title || forkId,
          author: String(author).slice(0, 64),
          protocolVersion: report.manifest.multiplayer.protocolVersion,
          playPath,
          verified: grok.verified || 'static-only',
          createdAt: new Date().toISOString(),
        };

        const reg = readRegistry();
        reg.forks = reg.forks || [];
        reg.forks.push(entry);
        writeRegistry(reg);

        return res.json({
          ok: true,
          ...entry,
          warnings: report.warnings,
        });
      } catch (e) {
        console.error('[rampart-lab] upload error', e);
        try {
          fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch (_) {}
        return res.status(500).json({ error: 'Server error processing upload' });
      }
    });
  });
}

module.exports = { mount, ensureDirs, validateExtractedTree };
