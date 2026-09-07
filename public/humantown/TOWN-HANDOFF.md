# Town life sandbox — recovery handoff

Date: 2026-09-07

## Authoritative baseline
Update 9 final: human2-v2-update9-phase5.zip. Existing sandbox source /workspace/sites/mira-v2-demo/dist, commit 9d0525589245014aa3cfae10cb6d2a46b85b4336. Baseline SHA256 5f92fa93db1d40047ccaace59c69b6adaa213b99231636f782e1fba82e4713e1. Saved file identity libfile_643206a8a23481919c4148a26a9fd18c.

New project: /workspace/sites/mira-town. Author /dist/town. Checkpoints /workspace/scratch/f8060c19bad8/town-output. Keep the prior sandbox untouched. Package a standalone town/ directory for deployment at futuremusic.online/town/. There is no established access to that domain's hosting; publish a separate private preview through Sites and deliver deployable ZIPs.

## Non-negotiable requirements
15 separate tested checkpoint ZIPs, saved before continuing. Save this handoff immediately. Update checkpoint manifest and test evidence each phase. Never claim an upload succeeded without its result. Do not rebuild prior completed checkpoints on resume. Preserve the full update-9 asset/rig, eye, tissue, clothing, voice and controller capabilities. Do not fabricate slider presets: screenshots not attached in the current message; use original defaults plus black hair.

## Architecture and decisions
Pure serializable simulation records for <=50 people, 100 jobs. AI at 4 Hz, never tied to render rate. One active plot; only that plot's detailed objects and actors are loaded, with lightweight distant terrain. Cross-plot construction, supply and ambulance messages continue. Detailed body budget starts at 2 on Quest and 4 desktop, with adaptive degradation and hysteresis; never instantiate 50 Mira rigs.
Needs 0–100: hunger, energy, bladder, hygiene, entertainment, comfort. Hunger at zero for 60 real seconds causes death. Sleep/toilet/shower gated. Player orders have absolute precedence; crises may warn but never override an order. Utility scores smart-object advertisements; bounded GOAP composes coarse multi-step resource plans. LLM optional, at most one request; templates otherwise. No claim of advanced cognition from an untested heuristic.
Local saves, no multiplayer/server authority. Serializable RNG and clock. Plot ownership enforced for NPC builds; player exempt. Road/public plots never private. Jobs use XP/level success probabilities. All currency transfers checked and conserved where appropriate; wages and purchases recorded. Food-only fridge inventory. Homeless sleep outdoors at night. Status based on net worth rank and inbound affinity. Construction travels from HQ; clinic has one ambulance.
Reuse procedural movement first. Research offline video-to-motion and compatible retargeted clips; no browser RL training, no invented mocap assets or licensing. New UI is game-native, compact and usable in desktop and VR: Y configuration, X shopping (X remains brake while driving), select NPC then object actions, fixed-distance forward placement and clear hover/selection.

## Checkpoints
1. SAVED — Town shell, plot grid, clock and three persistent NPC records
2. COMPLETE — Needs, crises, strict player orders and smart-object registry
3. PENDING — Fridge inventories and usable bed, toilet, shower and entertainment
4. PENDING — Utility choice and bounded GOAP financial plans
5. PENDING — 100 jobs, XP, wages, shop inventory and farm deliveries
6. PENDING — Plots, housing, savings, prefabs and homelessness
7. PENDING — Affinity, timed chat, altruism, greed and social status
8. PENDING — Grid construction, working doors, crew jobs and effects
9. PENDING — Furniture, wardrobe inventories, colored clothing and wall paintings
10. PENDING — Player/NPC inventories, phones, computers and purchasing
11. SAVED — Cars, fuel, modifications and functional handles/handbrake
12. COMPLETE — Clinic, ambulance and cross-plot service messages
13. PENDING — Single-plot rendering, actor pooling and automatic performance tiers
14. PENDING — Motion transitions, hand presentation, hurt expressions and cuff UI
15. PENDING — Persistence, integration checks, final ZIP and hosted demo

## Verification constraints
Prior cloud browser has GL_RENDERER=Disabled. Numerical and UI logic checks cannot certify photoreal appearance, shader compilation, headset microphone, haptic feel, 72 Hz, or perfect collision. Record any unsupported feature honestly. Every ZIP must contain runnable current source, recovery notes, phase status and test evidence. No untracked-only checkpoints.


## Checkpoint 01 saved state (2026-09-07)
Runtime town.js now exists. Checkpoint-01 snapshot includes initial town shell and tested numerical locomotion/grip repairs. See CHECKPOINT-01.md and validation.json for exact scope. Phases 02–15 remain pending. Latest user asks to save immediately because credits are low. Do not claim the town feature list is implemented.


## Checkpoint 02 (2026-09-07)
Needs, crisis warnings, 60-active-second starvation, order queues and smart-object registry implemented. Desktop/VR controls connected. See CHECKPOINT-02.md for scope and 15 passing simulation tests. Movement/grip regressions pass. No furniture ads in the live town yet: add them in checkpoint 03. Do not claim autonomy, food relief, pathfinding or persistence finished. Current source /workspace/sites/mira-town/dist/town. Checkpoint ZIP /workspace/scratch/f8060c19bad8/town-output/mira-town-checkpoint02.zip. Prior checkpoint01 identity libfile_e3396b63df7881918a91acc40303815d.
