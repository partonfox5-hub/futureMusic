import { createVoicePair } from "/games/shared/voice-coop.js";
import { dyeMaterial, hatHex, mountChip, paintChip, rememberPeer } from "/games/shared/coop-hat.js";

function waitStarleap() {
  return new Promise((res) => {
    const t = setInterval(() => {
      if (window.__starleap?.getScene) {
        clearInterval(t);
        res(window.__starleap);
      }
    }, 200);
    setTimeout(() => {
      clearInterval(t);
      res(window.__starleap || null);
    }, 18000);
  });
}

function humansOf(lobby) {
  return (lobby?.peers || []).filter((p) => p && !p.traveler && !p.bot);
}

function dyePuppets(api, lobby) {
  const hexSelf = hatHex(
    humansOf(lobby).find((p) => p.id === lobby.selfId)?.slot,
    humansOf(lobby).find((p) => p.id === lobby.selfId)?.hat,
  );
  const player = api.getPlayer?.();
  if (player?.capRed) dyeMaterial(player.capRed, hexSelf);
  const mmo = api.getMmo?.();
  const avatars = mmo?.avatars;
  if (!avatars || typeof avatars.forEach !== "function") return;
  avatars.forEach((row, id) => {
    const peer = (lobby.peers || []).find((p) => p.id === id);
    if (!row?.puppet?.capRed || !peer) return;
    dyeMaterial(row.puppet.capRed, hatHex(peer.slot, peer.hat));
  });
}

async function boot() {
  const api = await waitStarleap();
  if (!api) return;
  const chip = mountChip();
  let voice = null;
  let voiceStatus = "idle";
  let lastSelf = "";

  const tick = () => {
    const lobby = api.getLobby?.() || {};
    if (lobby.selfId && lobby.selfId !== lastSelf) {
      lastSelf = lobby.selfId;
      rememberPeer(lobby.selfId);
    }
    const humans = humansOf(lobby);
    const me = humans.find((p) => p.id === lobby.selfId);
    dyePuppets(api, lobby);
    paintChip(chip, {
      humans: humans.length,
      cap: lobby.cap || 2,
      slot: me?.slot ?? 0,
      hat: me?.hat || "red",
      voice: voiceStatus,
      realm: "New Eden",
    });
    if (lobby.selfId && !voice) {
      voice = createVoicePair({
        selfId: lobby.selfId,
        name: me?.name || "Wanderer",
        onStatus: (s) => {
          voiceStatus = s;
          try {
            if (s === "talking") api.setCaption?.("Voice live · two-seat server");
            else if (s === "waiting") api.setCaption?.("Two-seat server · waiting for partner");
            else if (s === "full") api.setCaption?.("Server full (2)");
            else if (s === "no-mic") api.setCaption?.("Allow microphone for voice");
          } catch {}
        },
      });
      const kick = () => voice?.start?.();
      kick();
      window.addEventListener("pointerdown", kick, { once: true });
      window.addEventListener("keydown", kick, { once: true });
    }
  };

  setInterval(tick, 400);
  tick();
  window.addEventListener("beforeunload", () => voice?.close?.());
}

boot();
