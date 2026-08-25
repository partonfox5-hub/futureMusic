/**
 * Fenrest → Creature Chess: skip the title hall, start a VR table,
 * and keep the NPC talking via Web Speech TTS.
 */
function npcFromQuery() {
  try {
    return JSON.parse(sessionStorage.getItem("fm-chess-npc") || "null") || {};
  } catch {
    return {};
  }
}

function speak(text, seed) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const vs = (window.speechSynthesis.getVoices() || []).filter((v) => /en/i.test(v.lang || "en"));
    if (vs.length) {
      let h = 0;
      const s = String(seed || "mira");
      for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
      u.voice = vs[h % vs.length];
    }
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

function waitGame() {
  return new Promise((res) => {
    const t = setInterval(() => {
      if (window.__game?.getState) {
        clearInterval(t);
        res(window.__game);
      }
    }, 80);
    setTimeout(() => {
      clearInterval(t);
      res(window.__game || null);
    }, 18000);
  });
}

function banter(npc) {
  if (npc.species && npc.species !== "human") {
    const syl = ["skra", "iss", "keth", "vorr", "naki"];
    return syl.map((s, i) => s + (npc.name || "")[i % 3] || "").join("-");
  }
  const lines = [
    `Your move, wanderer. ${npc.name || "I"} still hear you from across the board.`,
    `Don't rush the champion on e4. Fenrest taught me patience.`,
    `If you capture my piece, it becomes a duel — that's the old rule.`,
    `The grass outside still waves. This table is just another meadow.`,
    `Ask me anything. Talking does not spend your turn.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

async function boot() {
  const q = new URLSearchParams(location.search);
  if (q.get("from") !== "fenrest") return;
  const npc = npcFromQuery();
  npc.name = npc.name || q.get("npc") || "Mira Reed";
  npc.role = npc.role || q.get("role") || "innkeeper";
  npc.species = npc.species || q.get("species") || "human";
  const game = await waitGame();
  if (!game) return;
  try {
    document.getElementById("cc-shell")?.classList.remove("on");
    document.getElementById("cc-lobby")?.classList.remove("on");
  } catch {}
  const st = game.getState();
  try {
    game.setState({ alphaUnlocked: true });
    st.startDraft?.("cpu", "classic");
  } catch {}
  setTimeout(() => {
    try {
      const s = game.getState();
      if (s.enterVr && !s.vrActive) s.enterVr();
    } catch {}
  }, 400);
  speak(`${npc.name} sits across from you. The board is live. I can still hear your voice.`, npc.name);
  setInterval(() => {
    if (document.hidden) return;
    speak(banter(npc), npc.name);
  }, 22000);
}

boot();
