# Nivet League 10.4.0 — Control

This update targets repeated player control and measurable consistency. It preserves the original audio, models, dense painted turf, matte cars, blue/orange matches and velvet menus. It does not claim exact proprietary-engine parity.

## Player changes

- Directional dodges use separate speed-dependent side/reverse impulses, a proper input threshold, bounded torque and delayed falling-velocity damping. Powerslide builds/releases over time. Neutral awkward landings remain yours to recover; throttle/contact autoroll and the roof jump recovery remain deliberate inputs.
- Car–ball contact separates mass/inertia response from the measured extra ball impulse. Contact-point spin matters; repeated touch power is guarded. Surface rebounds share one measured slip model across authority, prediction and bot forecasts.
- A rolling ball no longer jumps over an invisible lip at either goal mouth.
- Ball camera can turn through an exact180° reversal. Wall framing honors saved distance, height and FOV, with continuous ceiling transitions. The pitch-flip camera retains spatial orientation.
- Free Play enters active control immediately with no bots/unlimited boost by default. Explicit practice preferences persist separately; queue warm-up never overwrites them or match settings.
- Automatic drawing-buffer resolution reacts only to sustained slow frames, with bounded gradual changes and conservative recovery. Settings offers Native resolution. The DOM HUD and120Hz simulation are independent of that setting. Offline hidden tabs pause and discard stale catch-up time.
- Switching modes refreshes the scoreboard label even when the numeric clock has not changed (Free Play → Heatseeker previously kept “FREE”). Failed practice startup also restores standard rules.
- Dedicated wire2 and gameplay protocol5 carry the new handling state. Old clients receive a reload message rather than running different prediction physics.

## Evidence and reproducibility

The [fidelity matrix](FIDELITY-MATRIX.md) separates model agreement, reproduced defects, deliberate approximations and unknowns. Detailed pinned references, conditions and traces: [vehicle](FIDELITY-VEHICLE.md), [ball/arena](FIDELITY-BALL-ARENA.md), [camera](FIDELITY-CAMERA.md), [network](FIDELITY-NETWORK.md). Baseline source is pinned to commit12bba0aec9e3ed9791253a45ae48ed2fa6400382; no fresh controlled Rocket League recording was available.

Tests labeled fidelity compare independently specified published models. Stability and regression tests do not prove similarity to the proprietary engine. The original10.3.0 portable build is archived separately for before/after reproduction; runners fail clearly if it is missing.

## Remaining limits

The arena uses analytic rounded surfaces rather than an exact map mesh. Tire/suspension behavior, wheel hits, pinches, ball flip resets and full trick parity remain incomplete. Remote car contacts/demolitions wait for authority; local ball forecasting cannot know future remote inputs. Exact Rocket League camera smoothing/aspect behavior has not been independently measured. Synthetic ordered snapshot disruption is not a real network packet-loss/RTT benchmark. No physical Chromebook or phone/controller hardware certification is claimed.

## Try these situations

1. In fresh Free Play, boost immediately, then change boost/AI preferences and return to a standard match. Match rules should be restored.
2. Compare gentle bumper/hood touches with a full-speed shot and an incoming-ball challenge. Try rolling the ball straight through both goal mouths.
3. Jump, fall, then dodge sideways/backwards; cancel pitch during a half-flip attempt. Land sideways while holding powerslide and recover deliberately.
4. Toggle ball cam as the ball passes directly behind. Drive a wall/ceiling/corner with your saved low-FOV camera.
5. Play private Soccar and Heatseeker with another current client, watching touch corrections and recovery. Report the particular collision and approximate ping if it still feels inconsistent.

## Completed verification

- Frontend:290/290 passed; dedicated server:34/34 passed,324total. Prediction8 tests are included in the frontend count. Numerical contact invariants cover12,000seeded valid free-body contacts plus500supported contacts. All 6playlist/roster combinations run in the contact stability soak.
- Browser: Chromium156 on Windows, Ryzen75800X/RX6700XT. Used the normal menus in a developer telemetry copy of the exact production source: fresh Free Play/no AI/unlimited, throttle/boost/jump, wall/corner landing and powerslide, ball/car-camera toggle, explicit AI/normal-boost choices, reload persistence, Native-resolution setting, quit/re-entry and3v3Heatseeker. Retested practice→1v1Heatseeker after fixing the stale clock; it shows TO7. No console errors were captured in these checks. This is desktop keyboard testing, not physical phone/Chromebook/controller testing or a complete multiplayer skill comparison.
- Renderer:60measured frames after20warm frames at1280×720 drawing buffer, Detail/WebGL2. Before/after CSS1600×900 and DPR0.8 match. CPU submission p50/p95:2.40/2.80ms before,2.70/3.60ms after. GPU p50/p95:4.052/8.424ms before,2.773/8.619ms after. Both draw451calls and4,455,867triangles. These short held-pose timings vary; no general FPS gain is claimed. [Raw conditions and feature-cost profiles](measurements/render-fidelity.json) include separate grass, stadium, shadow, boost and near-goal explosion views.
- Resolution-policy traces verify sustained thresholds,0.8Chromebook/0.9Detail floors, gradual restoration, cooldowns, Native override, persistence and exclusion of suspension. They establish policy behavior, not measured Chromebook FPS.
- Live Phoenix10.4.0/wire2 initializes both3v3playlists, runs at120Hz/30Hz snapshots and matches49local staged source hashes exactly. Deployment required zero active rooms and retained a rollback archive. Actual TLS WebSocket checks passed for two-player creation/join/readiness/kickoff/reconciliation, three-digit invitations, synchronized abilities and custom paint across Pages/CDN origins. One ping sample was96ms from this connection; it is not a population latency estimate.
- Cloudflare serves20,980,284bytes with SHA-256 df27e76b66f4cce2998a3a77131363d8ba429118d98e12d6c03d6657ca5c5f87. GET/HEAD/health/release metadata and404behavior were checked. No Worker code, bindings beyond build metadata, ports or paid resources were added. Pages/Bunny publication verification follows in the receipt below.

## Selected before/after probes

| Scenario |10.3.0 |10.4.0 |
| --- | ---: | ---: |
| Falling dodge, immediate vertical velocity |0m/s |Preserves incoming−6.054m/s; damping starts later |
| Forward-dodge first-tick angular speed |9.666rad/s |1.867rad/s; later capped at5.5rad/s |
| Goal-mouth rolling-ball peak rise |0.215949m |<1e−14m |
|23m/s straight touch, outgoing ball speed |33.998297m/s |31.067358m/s |
| Default wall-camera eye separation |7.148804m |3.002083m |
| Exact180° ball-camera reversal at30/60/120displayHz |Stuck for2s |Crosses90° in0.06667s |

The values describe controlled Nivet probes. They are not current Rocket League recording errors or a universal feel score. The detailed reports retain all conditions and the unverified advanced-mechanic/geometry gaps.

