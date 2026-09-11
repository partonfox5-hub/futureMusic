# Checkpoint 08 performance evidence

The largest reproduced regression was the wardrobe solver: one dressed ambient pedestrian caused thousands of terrain and body-collision queries per step. Fitted background garments now follow the existing skeleton on the GPU and retain the particle path for close interaction. The body-contact hierarchy and cached light/furniture work reduce additional CPU cost.

| Workstation diagnostic | Checkpoint 07 | Checkpoint 08 |
|---|---:|---:|
| Home simulation median | 10.3 ms | 8.3 ms |
| Home simulation p95 | 15.7 ms | 15.2 ms |
| City simulation median | 69.2 ms | 13.8 ms |
| City simulation p95 | 143.5 ms | 44.5 ms |
| Idle droplet instances | 256 | 0 |

Both runs use the same script, 960×600 mono view, Quest code path, 100 warmup steps and 144 recorded simulation steps per location. Home has one full actor; city has two, including a clothed pedestrian. Assets, world seeding and software GPU are shared. Actor animation and startup completion are not deterministic across runs. The machine is a shared workstation, so maxima and p95 vary with scheduling, JIT and garbage collection. These figures establish the large clothing bottleneck and improvement; they are not a controlled headset benchmark or a guaranteed speedup percentage. The profile scripts include source-region generation, AI, vehicles, water and pets, unlike a body-only microbenchmark.

The post-change city run still contains a 170.9 ms simulation outlier. Significant work remains. GPU submission is still heavy (approximately 0.5–0.66 million triangles and 360–460 draws in the recorded shadowed mono views); stereo, weapons, reflections, multiple nearby clothed NPCs and thermal throttling can cost more. The default 68k-triangle legacy hair used on some NPCs is another remaining geometry cost. The final pass will assess these, streaming stalls and sustained frame delivery.

At 72 Hz the frame period is 13.89 ms; at 60 Hz it is 16.67 ms. CPU and GPU have to fit the actual session's period with margin. Reducing rendering resolution cannot fix a 60 ms cloth simulation. A Quest hardware run is required before stating a sustained FPS result.

## Headset capture

Open WORLD → PERFORMANCE, start with Auto, and let the application warm up. Walk around the starting house, look at Mira up close, equip and grab a garment, enter the city, drive, and test two-handed interactions. Export the report from that page after the slowdown. The JSON records frame intervals, CPU sections, all render calls, optional asynchronous GPU timing and the selected quality tier. GPU time is explicitly unavailable if the browser does not expose a valid timer; it is never substituted with CPU time.

Use Sustain or turn city activity off while diagnosing a difficult scene. These are temporary workload controls, not a certified 60 FPS mode. The additional final performance pass remains scheduled after all remaining modules are integrated.
