/** Skip Fenrest title when arriving through a realm portal. */
(function bootPortalMap() {
  const q = new URLSearchParams(location.search);
  const warp = q.get("portal") === "1" || q.get("map") === "1";
  let from = null;
  try {
    from = JSON.parse(sessionStorage.getItem("fm-realm-warp") || "null");
  } catch {}
  if (!warp && !from) return;
  let n = 0;
  const id = setInterval(() => {
    n++;
    const st = window.__FENREST__?.store;
    if (!st?.getState) {
      if (n > 80) clearInterval(id);
      return;
    }
    clearInterval(id);
    const s = st.getState();
    s.setScreen?.("play");
    s.setPlaying?.(true);
    s.setHud?.({ prompt: "You step through the gate onto the living map." });
  }, 200);
})();
