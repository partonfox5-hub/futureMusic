/** Shared Fenrest <-> New Eden inventory. Same origin localStorage. */
export const BAG_KEY = "fm-realm-bag";

export function loadBag() {
  try {
    const raw = localStorage.getItem(BAG_KEY);
    if (!raw) return { items: [], spells: [], gold: 0, updated: 0 };
    const j = JSON.parse(raw);
    return {
      items: Array.isArray(j.items) ? j.items : [],
      spells: Array.isArray(j.spells) ? j.spells : [],
      gold: Number(j.gold) || 0,
      updated: Number(j.updated) || 0,
    };
  } catch {
    return { items: [], spells: [], gold: 0, updated: 0 };
  }
}

export function saveBag(bag) {
  const next = {
    items: bag.items || [],
    spells: bag.spells || [],
    gold: bag.gold || 0,
    updated: Date.now(),
  };
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function fenrestToBag(inv, gold) {
  const items = [];
  const spells = [];
  for (const it of inv || []) {
    if (!it || !it.defId) continue;
    const row = { defId: it.defId, qty: it.qty || 1, name: it.name || it.defId };
    if (String(it.defId).startsWith("spell-") || it.kind === "book") spells.push(row);
    else items.push(row);
  }
  return saveBag({ items, spells, gold: gold || 0 });
}

export function mergeBagIntoList(inv, bag) {
  const out = (inv || []).map((e) => ({ ...e }));
  const have = new Set(out.map((e) => e.defId));
  const extra = [...(bag.items || []), ...(bag.spells || [])];
  for (const row of extra) {
    if (!row.defId || have.has(row.defId)) continue;
    have.add(row.defId);
    out.push({
      uid: "bag-" + row.defId + "-" + Math.random().toString(36).slice(2, 6),
      defId: row.defId,
      qty: row.qty || 1,
    });
  }
  return out;
}
