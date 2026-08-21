/**
 * Wish weaver for futuremusic.online — data recipe only, no eval.
 * Short names like "fox" get habitat, gait, pack, and colors filled in.
 */
function infer(prompt) {
  const p = String(prompt || "").toLowerCase();
  const fox = /\b(fox|vixen|kitsune|fennec)\b/.test(p);
  const canine = fox || /\b(wolf|dog|coyote|dingo|hound)\b/.test(p);
  const feline = /\b(cat|lion|tiger|lynx)\b/.test(p);
  const flyer = /\b(bird|fly|wing|dragon|wasp|moth|owl|eagle)\b/.test(p);
  const hopper = /\b(frog|hop|rabbit|bunny)\b/.test(p);
  const insect = /\b(mantis|bug|spider|centipede)\b/.test(p);
  const bearish = /\b(bear|boar)\b/.test(p);
  let kind = "creature";
  if (/\b(gun|rifle|sword|blade|cannon|pistol|shotgun|laser)\b/.test(p)) kind = "weapon";
  else if (/\b(car|bike|hover|tank|boat|sled|cart|rover|vehicle)\b/.test(p)) kind = "vehicle";
  else if (/\b(heal|potion|ammo|shield|powerup|boost|mushroom)\b/.test(p)) kind = "powerup";
  else if (/\b(npc|friend|ally|merchant|guide|villager)\b/.test(p)) kind = "npc";
  const silhouette = kind === "weapon" ? "blade" : kind === "vehicle" ? "vehicle" : kind === "powerup" ? "orb" : flyer ? "flyer" : hopper ? "hopper" : insect ? "insect" : canine || feline || bearish ? "walker" : "beast";
  const gait = flyer ? "fly" : hopper ? "hop" : insect ? "mantis" : bearish ? "bear" : canine || feline ? "wolf" : "slither";
  const habitat = fox || /\b(wolf|deer|owl|rabbit)\b/.test(p) ? "forest" : /\b(camel|dune|desert)\b/.test(p) ? "desert" : /\b(gull|crab|koi|coast|beach)\b/.test(p) ? "coast" : "any";
  const tame = kind === "npc" || /\b(pet|tame|friend|ally|companion)\b/.test(p);
  const bits = String(prompt || "Wishborn")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 3);
  const name = (bits.join(" ") || "Wishborn").replace(/^\w/, (c) => c.toUpperCase());
  return {
    id: `wish-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    name,
    prompt: String(prompt || "").slice(0, 200),
    summary: fox ? "A wild fox that keeps to the woods." : `A ${kind} woven from "${name}".`,
    color: fox ? 0xc45c28 : 0x4f8f3e,
    accent: fox ? 0xf0c070 : 0xe0b84a,
    silhouette,
    gait,
    mood: "chase",
    tame,
    habitat,
    pack: kind === "creature" ? (fox || canine ? 3 : 2) : 0,
    stats: { health: kind === "creature" || kind === "npc" ? 3 : 0, damage: 1, range: 1.4, aoe: 0, rate: 1, speed: 1.1, armor: 0, special: 1 },
    behavior: kind === "npc" || tame ? "friendly" : kind === "vehicle" ? "mount" : kind === "weapon" ? "wander" : fox || canine ? "wander" : "chase",
    scaled: true,
    scaleNote: "local weaver",
  };
}

module.exports = function starleapWish(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("POST");
    return;
  }
  let buf = "";
  req.on("data", (c) => {
    buf += c;
    if (buf.length > 8000) req.destroy();
  });
  req.on("end", () => {
    let body = {};
    try {
      body = JSON.parse(buf || "{}");
    } catch {
      body = {};
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, recipe: infer(body.prompt), provider: "local" }));
  });
};
