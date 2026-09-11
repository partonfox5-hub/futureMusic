# Checkpoint 07 validation

`tests/ecology.mjs`: unit checks for monotonic grass cuts, persistence validation and finite flock steering/separation.

`tests/ecology-browser.cjs`: passed in Chromium/SwiftShader using the Quest code path and the full integrated project. Checks exercise streamed grass persistence, understory retirement, bird feeding/landing, both cut/regrow lifecycle and actual geometry reduction, ballistic casting/water contact/hooking/reeling, nearby lake fish generation, rod equip, traffic signals, active pedestrian/car budgets and physical traffic movement. No JavaScript or shader errors were reported.

See `test-results/ecology-regression.json` and `ecology-city.png`. The final city screenshot reported 377 draw calls and 621,520 triangles for that particular mono view. This is a scene-complexity sample, not FPS evidence, and is not directly comparable with other checkpoints' differently framed scenes. The screenshot was visually inspected; grass/flowers, buildings, roads, signals and birds render, but authored material/model refinement is still needed to reach the requested quality.

The city snapshot has zero nearby fish because the camera returned from the lake to the city; the lake fish test passed earlier in the same run. Scripted rural outings and a long traffic soak remain untested. Stereo visual comfort, actual controller casting, headset microphone behavior and sustained Quest thermal performance require on-device testing.
