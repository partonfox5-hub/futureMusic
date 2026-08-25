import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import JavaScriptObfuscator from "javascript-obfuscator";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function alreadyMinified(src, file) {
  const lines = src.split(/\n/);
  const avg = src.length / Math.max(1, lines.length);
  if (/assets\/(engine-|neweden-|chess-static-|Board3D-|fenrest-static-)/.test(file.replace(/\\/g, "/"))) return true;
  if (lines.length < 8 && src.length > 4000) return true;
  if (avg > 900 && src.includes("function") && !src.includes("  function")) return true;
  return false;
}

function hoistImports(src) {
  const imports = [];
  const body = src.replace(/\bimport[\s*{][^;]+;/g, (m) => {
    imports.push(m.trim());
    return "";
  });
  if (!imports.length) return src;
  return imports.join("\n") + "\n" + body.replace(/^\s+/, "");
}

function obfuscateSource(src) {
  const out = JavaScriptObfuscator.obfuscate(src, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    selfDefending: false,
    stringArray: true,
    stringArrayEncoding: ["none"],
    stringArrayThreshold: 0.6,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    target: "browser",
    ignoreImports: true,
  }).getObfuscatedCode();
  return hoistImports(out);
}

function backupAndWrite(file, out) {
  const srcPath = file.replace(/\.js$/, ".src.js");
  if (!fs.existsSync(srcPath)) fs.copyFileSync(file, srcPath);
  fs.writeFileSync(file, out);
}

const hordeSrc = path.join(root, "public/games/horde/src/game.js");
const hordeOut = path.join(root, "public/games/horde/js/game.js");
fs.mkdirSync(path.dirname(hordeOut), { recursive: true });
const horde = fs.readFileSync(hordeSrc, "utf8");
fs.writeFileSync(hordeOut, obfuscateSource(horde));
console.log("horde", horde.length, "->", fs.statSync(hordeOut).size);

const extras = [
  "public/games/shark/js/game.js",
  "public/games/planmorpher/js/game.js",
  "public/games/planetry/js/game.js",
  "public/games/shared/world-core.js",
  "public/games/shared/vr-warp.js",
  "public/games/shared/coop-hat.js",
  "public/games/shared/realm-bag.js",
  "public/games/shared/voice-coop.js",
  "public/games/neweden/js/coop.js",
  "public/games/neweden/js/portals.js",
  "public/games/neweden/js/portal-boot.js",
  "public/games/fenrest/js/life.js",
  "public/games/fenrest/js/magic.js",
  "public/games/fenrest/js/realm.js",
  "public/games/fenrest/js/speech.js",
  "public/games/fenrest/js/vr-hands.js",
  "public/games/fenrest/js/world-grid.js",
  "public/games/fenrest/js/portal-boot.js",
  "public/games/fenrest-chess/js/overlay.js",
  "public/games/fenrest-chess/js/fenrest-entry.js",
  "public/games/fenrest-chess/js/nx-chess.js",
  "public/games/character-chess/js/overlay.js",
  "public/games/character-chess/js/nx-chess.js",
  "public/games/zoom/js/game.js",
  "public/games/zoom/js/xr.js",
  "public/games/zoom/js/world.js",
  "public/games/zoom/js/weapons.js",
  "public/games/zoom/js/props.js",
  "public/games/zoom/js/sfx.js",
  "public/games/zoom/js/loot.js",
  "public/games/zoom/js/config.js",
  "public/games/zoom/js/mesh.js",
  "public/games/zoom/js/map.js",
  "public/games/zoom/js/proc.js",
  "public/games/zoom/js/robots.js",
  "public/games/zoom/js/tex.js",
  "public/games/zoom/js/store.js",
  "public/games/zoom/js/defaults.js",
  "public/games/zoom/js/editor.js",
  "public/games/zoom/js/npcs.js",
];

for (const rel of extras) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("skip missing", rel);
    continue;
  }
  if (file.endsWith(".src.js")) continue;
  const src = fs.readFileSync(file, "utf8");
  if (alreadyMinified(src, rel)) {
    console.log("skip minified", rel);
    continue;
  }
  const srcBackup = file.replace(/\.js$/, ".src.js");
  const from = fs.existsSync(srcBackup) ? fs.readFileSync(srcBackup, "utf8") : src;
  if (!fs.existsSync(srcBackup)) fs.writeFileSync(srcBackup, src);
  try {
    const out = obfuscateSource(from);
    fs.writeFileSync(file, out);
    console.log("obf", rel, from.length, "->", out.length);
  } catch (err) {
    console.warn("FAIL", rel, err.message);
    try {
      execFileSync(
        process.execPath,
        [
          path.join(root, "node_modules/terser/bin/terser"),
          srcBackup,
          "-c",
          "-m",
          "--module",
          "-o",
          file,
        ],
        { stdio: "pipe" },
      );
      console.log("terser", rel);
    } catch (e2) {
      fs.copyFileSync(srcBackup, file);
      console.warn("restore", rel, e2.message);
    }
  }
}
