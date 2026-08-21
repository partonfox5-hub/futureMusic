/**
 * Local wish weaver for futuremusic.online (no eval, data recipe only).
 */
function recipe(prompt) {
  const name = String(prompt || "Wander-beast").slice(0, 28) || "Wander-beast";
  return {
    id: `wish-${Date.now().toString(36)}`,
    kind: "creature",
    name,
    prompt: String(prompt || "").slice(0, 200),
    summary: `A ${name} woven locally.`,
    color: 0x4f8f3e,
    accent: 0xe0b84a,
    silhouette: "beast",
    gait: "hop",
    mood: "chase",
    tame: true,
    stats: { health: 2, damage: 1, range: 1, aoe: 1, rate: 1, speed: 1, armor: 1, special: 1 },
    behavior: "wander",
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
    res.end(JSON.stringify({ ok: true, recipe: recipe(body.prompt), provider: "local" }));
  });
};
