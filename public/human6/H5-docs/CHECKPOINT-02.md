# Human5 checkpoint 02

Includes the first checkpoint plus layered furniture, pet-bag upgrades, the verified legacy fire adapter, environmental tissue forces, spine response, step variation, and skin shadow/normal refinements. The final installer, neighborhood, rugs and performance controls are still being assembled. This is an intermediate recovery checkpoint, not the complete requested delivery.

Use `upgradeHostFire(props)` after the existing `installFire(props)`. Its `fire` field is passed to furniture and fixture factories. It replaces the legacy combustion tick while retaining hearth, extinguisher and NPC-duty methods. Torch triggers relight the actual wick; they no longer ignite targets at four meters.

`new FurnitureMaterials({world,tagMovable,fire})` creates Couch, Chair and Mattress variants. `bindProps(props)` routes cuts into fabric shells. `upgradePetBag(group)` preserves the original DogItems record, remaining food and feeding logic. It should be applied after bag spawn. `installHumanDynamics(actor,{waterAt})` extends the existing V2 TissueRig and surface guides. `installSkinRefinement(actor)` restores receiving shadows on skin and avoids invalid reversed GLSL smoothstep ranges.

Tissue density, drag and spine compliance are tunable approximations. No finite-element anatomical model, mocap database or exact reference likeness is claimed. Existing model topology and 49 facial channels remain intact.
