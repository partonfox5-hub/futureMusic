// Quest-side playback later. Same pattern as assets/dog/bark.mp3.
// Do not import Chatterbox on device.

export function playVoiceLine(voiceId, lineId, { audio } = {}) {
  const url = new URL(`../assets/voice/${voiceId}/${lineId}.ogg`, import.meta.url);
  const el = new Audio(url.href);
  el.play().catch(() => {});
  return el;
}

// Example:
//   playVoiceLine('mira', 'greet_01');
//   playVoiceLine('dog', 'need_food');
