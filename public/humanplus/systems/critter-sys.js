import {
  ofSpecies, customGene, spawnPet, spawnFood, spawnPortal,
  applyHat, rallyPets, strokePet, shootRay, tickWorld, pets,
} from "../critters.js";

export function createCritterGameSystem() {
  return {
    name: "critters",
    kinds: ["pet", "food", "portal", "hat"],
    mount(world) {
      world.critters = { pets, spawnPet, spawnFood, spawnPortal, rallyPets, strokePet, shootRay };
    },
    spawn(spec, world) {
      const scene = world.scene;
      if (spec.kind === "pet" || spec.species) {
        const g = spec.gene || ofSpecies(spec.species);
        return spawnPet(g, spec.position, scene);
      }
      if (spec.kind === "food" || spec.food) return spawnFood(spec.food || spec.id, spec.position, scene);
      if (spec.kind === "portal") return spawnPortal(spec.position, scene);
      if (spec.kind === "hat") {
        let best = pets[0];
        if (best) applyHat(best, spec.id);
        return best;
      }
      if (spec.kind === "build") return spawnPet(customGene(spec.parts || {}), spec.position, scene);
      return null;
    },
    tick(dt, world) {
      tickWorld(dt, {
        scene: world.scene,
        playerPos: world.playerPos,
        miraPos: world.miraPos,
        floorY: world.floorY || 0,
        onHitMira: world.onHitMira,
      });
    },
    onEvent(type, payload, world) {
      if (type === "rally" && payload && payload.origin) rallyPets(payload.origin, payload.radius || 0.95);
    },
  };
}
