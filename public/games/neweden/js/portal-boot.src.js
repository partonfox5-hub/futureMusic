/** Skip New Eden menu and drop onto the map when arriving from Fenrest. */
(function bootPortalMap() {
  const q = new URLSearchParams(location.search);
  if (q.get("portal") !== "1" && q.get("map") !== "1") return;
  let n = 0;
  const id = setInterval(() => {
    n++;
    const api = window.__starleap;
    if (!api) {
      if (n > 100) clearInterval(id);
      return;
    }
    clearInterval(id);
    try {
      if (typeof api.setMode === "function") api.setMode("playing");
      else if (typeof api.playInPlace === "function") api.playInPlace();
      api.enterFirstPerson?.();
    } catch {}
    const clickPlay = () => {
      const btns = [...document.querySelectorAll("button")];
      const play = btns.find((b) => /play|enter|explore|begin|world/i.test(b.textContent || ""));
      play?.click?.();
    };
    clickPlay();
    setTimeout(clickPlay, 800);
  }, 250);
})();
