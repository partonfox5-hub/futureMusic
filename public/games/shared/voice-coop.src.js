/** Two-person WebRTC voice for the combined New Eden / Fenrest server. */

const STUN = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const ROOM = "edenfen";

function idOk(s) {
  return typeof s === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(s);
}

export function createVoicePair({ selfId, name = "Wanderer", room = ROOM, onStatus } = {}) {
  const state = {
    selfId,
    name: String(name || "Wanderer").slice(0, 32),
    room,
    closed: false,
    since: 0,
    stream: null,
    pc: null,
    remoteId: null,
    audio: null,
    timer: 0,
    status: "idle",
    talking: false,
  };

  function setStatus(s, extra) {
    state.status = s;
    try {
      onStatus?.(s, { remoteId: state.remoteId, talking: state.talking, ...extra });
    } catch {}
  }

  async function ensureMic() {
    if (state.stream) return state.stream;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("no-mic");
      throw new Error("no mic");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    state.stream = stream;
    return stream;
  }

  function playRemote(stream) {
    let el = state.audio;
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.style.display = "none";
      document.body.appendChild(el);
      state.audio = el;
    }
    el.srcObject = stream;
    el.volume = 1;
    el.play().catch(() => {});
    state.talking = true;
    setStatus("talking");
  }

  async function post(body) {
    await fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function signal(kind, payload, to) {
    if (!to || !state.selfId) return;
    post({ op: "signal", room: state.room, from: state.selfId, to, kind, payload }).catch(() => {});
  }

  async function teardownPc() {
    if (state.pc) {
      try {
        state.pc.close();
      } catch {}
    }
    state.pc = null;
    state.remoteId = null;
    state.talking = false;
    if (state.audio) state.audio.srcObject = null;
  }

  async function ensurePc(remoteId) {
    if (state.pc && state.remoteId === remoteId) return state.pc;
    if (state.pc) await teardownPc();
    const stream = await ensureMic();
    const pc = new RTCPeerConnection(STUN);
    state.pc = pc;
    state.remoteId = remoteId;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) signal("ice", e.candidate, remoteId);
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") setStatus("talking");
      else if (st === "failed" || st === "disconnected") setStatus("lost");
      else if (st === "connecting") setStatus("calling");
    };
    pc.ontrack = (e) => {
      const s = e.streams && e.streams[0];
      if (s) playRemote(s);
    };
    if (state.selfId < remoteId) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      signal("offer", pc.localDescription, remoteId);
      setStatus("calling");
    } else {
      setStatus("waiting-answer");
    }
    return pc;
  }

  async function onSignal(msg) {
    const from = msg.from;
    if (!from || from === state.selfId) return;
    try {
      if (msg.kind === "offer") {
        const pc = await ensurePc(from);
        if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") {
          /* glare: we are the smaller id (offerer) — ignore remote offer */
          if (state.selfId < from) return;
        }
        await pc.setRemoteDescription(msg.payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal("answer", pc.localDescription, from);
      } else if (msg.kind === "answer") {
        const pc = state.pc && state.remoteId === from ? state.pc : await ensurePc(from);
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(msg.payload);
        }
      } else if (msg.kind === "ice") {
        const pc = state.pc && state.remoteId === from ? state.pc : null;
        if (pc && msg.payload) await pc.addIceCandidate(msg.payload).catch(() => {});
      }
    } catch {
      /* signaling races are expected */
    }
  }

  async function poll() {
    if (state.closed || !idOk(state.selfId) || !idOk(state.room)) return;
    const q = new URLSearchParams({
      room: state.room,
      peer: state.selfId,
      name: state.name,
      since: String(state.since),
    });
    let data;
    try {
      const res = await fetch(`/api/rtc?${q}`);
      data = await res.json();
    } catch {
      return;
    }
    if (data.error === "full") {
      setStatus("full");
      return;
    }
    const remotes = (data.peers || []).map((p) => p.id).filter((id) => id !== state.selfId);
    const other = remotes[0] || null;
    if (!other) {
      if (state.pc) await teardownPc();
      setStatus("waiting");
    } else if (other !== state.remoteId) {
      try {
        await ensurePc(other);
      } catch (err) {
        if (String(err?.message || err).includes("no mic") || err?.name === "NotAllowedError") setStatus("no-mic");
        else setStatus("mic-error");
      }
    }
    for (const s of data.signals || []) {
      if (s.id > state.since) state.since = s.id;
      await onSignal(s);
    }
  }

  async function start() {
    if (state.closed) return;
    try {
      await ensureMic();
      if (state.status === "idle" || state.status === "no-mic" || state.status === "mic-error") setStatus("waiting");
    } catch {
      setStatus("no-mic");
    }
    if (state.looping) return;
    state.looping = true;
    const tick = async () => {
      if (state.closed) return;
      await poll();
      state.timer = window.setTimeout(tick, 800);
    };
    tick();
  }

  function close() {
    state.closed = true;
    window.clearTimeout(state.timer);
    teardownPc();
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
    if (state.audio) {
      try {
        state.audio.remove();
      } catch {}
      state.audio = null;
    }
    if (idOk(state.selfId)) {
      post({ op: "leave", room: state.room, peer: state.selfId }).catch(() => {});
    }
    setStatus("closed");
  }

  return { start, close, state, ensureMic };
}
