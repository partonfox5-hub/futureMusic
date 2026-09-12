# Human5 19.2.0 — checkpoint 17

Complete integrated project. Serve the `human5` folder at `/human5/` over HTTPS for Quest WebXR; use the existing project launch/deployment workflow. This is source, not a Windows executable.

Verified first group: another 15% default walking speed; left stick click sprint +50% for 10 seconds, followed by a 10-second cooldown; right stick click restraint anchors (builder retains its rotate control); A jumps once per press; desktop Shift uses the same timed sprint. Existing menu links explain the controls.

Nightstands have hollow cabinets and two constrained drawer boxes. Click/trigger toggles, grip the pull to slide. Mattress pickup preserves world coordinates and limits furniture contact correction; browser pickup moved the mattress 0.30m without disappearing or teleporting.

A 21-node articulated solver replaces the standing balance integrator on death. The collapse test settled with 1.46mm maximum link error, then slept. Head removal disables both hair renderers. Healing resets local joint positions. This is a bounded game approximation, not a medical simulation.

Chest shading uses a single rest-space pigment center; legacy atlas normal relief is suppressed in that region. Existing shape and gravity response remain, with a small compliance increase. These are shader/geometry changes; exact visual likeness has not been established.

Validation: H5-test-results/checkpoint17/regression/report.json (real application in headless Chromium); source integrity. Hardware Quest FPS is not measured. New lights, running/activity changes and the final performance pass are in the next group; this checkpoint deliberately preserves a tested stopping point before those changes.
