/**
 * System-of-systems kernel for /humanplus.
 * Each game system (Mira, Critter Den, later others) mounts onto a shared
 * world and ticks independently. A fault in one system is caught so it
 * cannot crash the rest.
 */
export function createKernel(world) {
  const systems = [];
  const byName = new Map();
  const byKind = new Map();
  world.time = 0;
  world.faults = [];
  world.events = [];

  function emit(type, payload) {
    world.events.push({ type, payload, t: world.time });
    for (const s of systems) {
      if (typeof s.onEvent === "function") {
        try { s.onEvent(type, payload, world); } catch (e) { fault(s, e); }
      }
    }
  }
  world.emit = emit;

  function fault(s, e) {
    console.warn("[kernel]", s && s.name, e);
    world.faults.push({ name: s && s.name, message: String(e && e.message || e), t: world.time });
    if (world.faults.length > 24) world.faults.shift();
  }

  return {
    world,
    use(sys) {
      if (!sys || !sys.name) throw new Error("system needs a name");
      systems.push(sys);
      byName.set(sys.name, sys);
      for (const k of sys.kinds || []) {
        if (!byKind.has(k)) byKind.set(k, []);
        byKind.get(k).push(sys);
      }
      if (typeof sys.mount === "function") {
        try { sys.mount(world); } catch (e) { fault(sys, e); }
      }
      return this;
    },
    get(name) { return byName.get(name); },
    spawn(kind, spec) {
      const list = byKind.get(kind) || [];
      let last = null;
      for (const s of list) {
        if (typeof s.spawn !== "function") continue;
        try { last = s.spawn(spec || {}, world); } catch (e) { fault(s, e); }
      }
      return last;
    },
    tick(dt) {
      world.dt = dt;
      if (typeof world.time !== "number") world.time = 0;
      for (const s of systems) {
        if (typeof s.tick !== "function") continue;
        try { s.tick(dt, world); } catch (e) { fault(s, e); }
      }
    },
    systems,
  };
}
