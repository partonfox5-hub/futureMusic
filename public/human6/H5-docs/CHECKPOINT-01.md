# Human5 checkpoint 01

Standalone Three.js r170 modules: five fixture meshes, glass bulbs, fixed nearby-light pool, optional daylight rig, AR estimate adapter, swept torch contact and material-based combustion.

Place all three JavaScript files together. Imports use the host import map's `three` and `three/addons/` entries. Instantiate `FireSystem({scene,world})`, create fixtures with `createFixture(world,type,{fire,tagMovable})`, and register fuel with `fire.register(mesh,{material:'wood'})`. Pass the existing `tagMovable` function for movable fixtures. Call `fire.tick(dt,cameraWorldPosition)` after host object motion, then `FixtureLights.tick(dt,cameraWorldPosition)` before rendering. Do not add a second rigid-body integrator.

This checkpoint is the working core. The full project's existing fire controller must be connected through the host adapter in the final delivery; do not run this combustion loop alongside the legacy fire simulation. Water sampling is optional through `waterAt(point)` returning `{height}` or null. Flame visuals have a fixed 24-source cap; combustion state is retained beyond that cap. Fuel values are gameplay parameters. These modules do not claim measured Quest 3 frame rates, volumetric fire, or real-time global illumination.

`node tests/acceptance.mjs` covers contact ignition, extinguishing, inert material rejection, swept intersection and finite zero-gravity state.
