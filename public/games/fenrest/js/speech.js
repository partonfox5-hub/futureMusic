/**
 * Fenrest talk: browser Web Speech STT + TTS. No API key, no signup.
 * Humans get a tiny keyword NLP + per-NPC persona. Other species gibber.
 */
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;

function voices() {
  try {
    return window.speechSynthesis?.getVoices?.() || [];
  } catch {
    return [];
  }
}

function pickVoice(seed) {
  const all = voices().filter((v) => /en/i.test(v.lang || "en"));
  const pool = all.length ? all : voices();
  if (!pool.length) return null;
  let h = 0;
  const s = String(seed || "mira");
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

function speak(text, seed) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(seed);
    if (v) u.voice = v;
    u.rate = 0.96;
    u.pitch = 0.9 + ((String(seed).length % 5) * 0.04);
    window.speechSynthesis.speak(u);
    return u;
  } catch {
    return null;
  }
}

function gibber(seed) {
  const syl = ["skra", "iss", "keth", "vorr", "naki", "shu", "tek", "hra", "ool", "zim", "qel"];
  let h = seed.length;
  const n = 4 + (h % 5);
  const out = [];
  for (let i = 0; i < n; i++) out.push(syl[(h + i * 3) % syl.length]);
  return out.join("-") + ".";
}

function intent(text) {
  const t = text.toLowerCase();
  if (/chess|board|creature chess|play a game|game of chess|aether/.test(t)) return "chess";
  if (/follow|come with|walk with|this way/.test(t)) return "follow";
  if (/stop following|stay here|wait/.test(t)) return "stay";
  if (/name|who are you|who're you/.test(t)) return "name";
  if (/hello|hi |hey |good (day|morrow|evening)|well met/.test(t)) return "greet";
  if (/axe|wood|tree|chop/.test(t)) return "wood";
  if (/ore|mine|pick/.test(t)) return "mine";
  if (/raptor|trex|t-rex|mammoth|dinosaur|turtle/.test(t)) return "beasts";
  return "talk";
}

function reply(npc, text) {
  const u = npc.userData;
  if (u.species && u.species !== "human") return gibber(u.name || "issk");
  const it = intent(text);
  if (it === "chess") {
    u.follow = true;
    u.chess = true;
    return `${u.name} here. Creature chess? Aye — walk me to the nearest board and press X on it. I'll keep talking while we play.`;
  }
  if (it === "follow") {
    u.follow = true;
    return `I'll keep to your shoulder, wanderer.`;
  }
  if (it === "stay") {
    u.follow = false;
    u.chess = false;
    return `I'll hold here.`;
  }
  if (it === "name") return `I'm ${u.name}, ${u.role} of Fenrest. ${u.lore || ""}`;
  if (it === "greet") return `Well met. ${u.name}, ${u.role}. What news from the grass?`;
  if (it === "wood") return `Bram's oak takes an axe if you have one. A sword will nibble, not fell.`;
  if (it === "mine") return `Copper hides in the grey veins. A pick sings; a sword only sparks.`;
  if (it === "beasts") return `Raptors hunt the east meadow. A great lizard keeps the south. Mammoths graze if you give them room.`;
  const bits = [
    `The fens remember older kings than we do.`,
    `If you cut the long grass, watch for turtles — jump their shells and they skip like stones.`,
    `Push the boulders aside if they block a path. They're stubborn, not planted.`,
    `There's a chessboard in the square. Ask me to play if you like.`,
    `Keep a woodcutter's axe and a pick. Wrong tools still work. They just take longer.`,
  ];
  return bits[Math.abs(text.length + u.name.length) % bits.length];
}

function nearestNpc(head, maxD = 4.2) {
  const list = window.__FENREST_NPCS__ || [];
  let best = null;
  let bd = maxD;
  for (const n of list) {
    const d = Math.hypot(n.position.x - head.x, n.position.z - head.z);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

export function installSpeech() {
  let rec = null;
  let active = null;
  let lastHeard = 0;

  function listen(npc) {
    if (!Rec) return;
    if (rec && active === npc) return;
    try {
      rec?.stop?.();
    } catch {}
    rec = new Rec();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      if (!last?.isFinal) return;
      const text = last[0].transcript.trim();
      if (!text) return;
      lastHeard = performance.now();
      const n = active;
      if (!n) return;
      n.userData.listening = false;
      n.userData.talking = true;
      if (n.userData.ear) n.userData.ear.visible = false;
      if (n.userData.speak) n.userData.speak.visible = true;
      const line = reply(n, text);
      const utt = speak(line, n.userData.name);
      window.__FENREST_STORE__?.getState?.().setHud?.({ prompt: n.userData.name + ": " + line });
      if (utt) {
        utt.onend = () => {
          n.userData.talking = false;
          if (n.userData.speak) n.userData.speak.visible = false;
        };
      } else {
        setTimeout(() => {
          n.userData.talking = false;
          if (n.userData.speak) n.userData.speak.visible = false;
        }, 2400);
      }
    };
    rec.onerror = () => {};
    try {
      rec.start();
    } catch {}
    active = npc;
  }

  function loop() {
    const head = window.__FENREST_HEAD__;
    if (!head) {
      requestAnimationFrame(loop);
      return;
    }
    const npc = nearestNpc(head, 4.2);
    const list = window.__FENREST_NPCS__ || [];
    list.forEach((n) => {
      const near = n === npc;
      n.userData.listening = near && !n.userData.talking;
      if (n.userData.ear) n.userData.ear.visible = !!n.userData.listening;
      if (n.userData.speak) n.userData.speak.visible = !!n.userData.talking;
    });
    if (npc && npc !== active) listen(npc);
    if (!npc && rec) {
      try {
        rec.stop();
      } catch {}
      rec = null;
      active = null;
    }
    requestAnimationFrame(loop);
  }
  try {
    window.speechSynthesis?.getVoices?.();
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => voices());
  } catch {}
  const kick = () => {
    try {
      rec?.start?.();
    } catch {}
  };
  window.addEventListener("pointerdown", kick, { once: true });
  requestAnimationFrame(loop);
  window.__FENREST_SPEECH__ = { speak, reply, intent };
}

const t = setInterval(() => {
  if (window.__FENREST_ROOT__) {
    clearInterval(t);
    installSpeech();
  }
}, 400);
