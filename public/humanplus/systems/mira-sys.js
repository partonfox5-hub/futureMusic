import { createMiraSystem, SLIDERS, FACE_TYPES, HAIR_COLORS } from "/human2/mira-core.js?v=7";

export { SLIDERS, FACE_TYPES, HAIR_COLORS };

export function createMiraGameSystem() {
  return {
    name: "mira",
    kinds: ["mira"],
    rt: null,
    mount(world) {
      this.rt = createMiraSystem({
        scene: world.scene,
        renderer: world.renderer,
        camera: world.camera,
        xrOn: world.xrOn,
      });
      world.mira = this.rt;
    },
    load(world, hooks) {
      return new Promise((resolve, reject) => {
        this.rt.load(
          hooks && hooks.onProgress,
          () => {
            world.miraReady = true;
            if (hooks && hooks.onDone) hooks.onDone();
            resolve();
          },
          (e) => reject(e)
        );
      });
    },
    spawn(spec) {
      return this.rt.spawn(spec);
    },
    tick(dt, world) {
      if (this.rt && this.rt.ready) this.rt.tick(dt, world.time, world.keys);
    },
  };
}
