/** Hat colors for the combined two-seat server. Slot 0 red, slot 1 green. */

export const HAT_RED = 0xc31f2a;
export const HAT_GREEN = 0x2ea24a;
export const HAT_RED_ENGINE = 12787498;

export function hatHex(slot, hat) {
  if (hat === "green" || slot === 1) return HAT_GREEN;
  return HAT_RED;
}

export function peerId() {
  try {
    const existing = sessionStorage.getItem("fm-coop-peer");
    if (existing && /^[a-zA-Z0-9_-]{1,64}$/.test(existing)) return existing;
  } catch {}
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `p-${crypto.randomUUID().slice(0, 8)}`
      : `p-${Math.random().toString(36).slice(2, 10)}`;
  try {
    sessionStorage.setItem("fm-coop-peer", id);
  } catch {}
  return id;
}

export function rememberPeer(id) {
  if (!id) return;
  try {
    sessionStorage.setItem("fm-coop-peer", id);
  } catch {}
}

export function dyeMaterial(mat, hex) {
  if (!mat) return;
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) {
    if (m?.color?.setHex) m.color.setHex(hex);
  }
}

export function mountChip() {
  let el = document.getElementById("fm-coop-chip");
  if (el) return el;
  el = document.createElement("div");
  el.id = "fm-coop-chip";
  el.setAttribute("aria-live", "polite");
  Object.assign(el.style, {
    position: "fixed",
    left: "12px",
    bottom: "12px",
    zIndex: "48",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontSize: "12px",
    letterSpacing: "0.04em",
    color: "#f4efe4",
    background: "rgba(12,14,12,0.72)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "999px",
    padding: "7px 12px",
    pointerEvents: "none",
    backdropFilter: "blur(8px)",
  });
  el.textContent = "Party 0/2";
  document.body.appendChild(el);
  return el;
}

export function paintChip(el, { humans = 0, cap = 2, slot = 0, hat = "red", voice = "idle", realm = "" } = {}) {
  if (!el) return;
  const who = slot === 1 || hat === "green" ? "green hat" : "red hat";
  const v =
    voice === "talking"
      ? " · voice live"
      : voice === "waiting" || voice === "calling" || voice === "waiting-answer"
        ? " · voice waiting"
        : voice === "no-mic"
          ? " · mic blocked"
          : voice === "full"
            ? " · full"
            : "";
  const place = realm ? ` · ${realm}` : "";
  el.textContent = `Party ${humans}/${cap} · you ${who}${v}${place}`;
}
