# Native handling investigation

This is a developer-only browser evidence workflow for the movement repair after10.5.0. It does not modify production controls, physics, ball parameters, artwork, effects, UI or saved camera preferences. Initial-pose buttons provide repeatable starting conditions; the operator must then perform the complete sequences with native keyboard input. Event scheduling is recorded rather than assumed to match requested key durations exactly.

## Stage and open

From the game directory:

~~~powershell
node scripts/stage-handling-playtest.cjs index.html ../../outputs/handling-play-current.html
node scripts/stage-handling-playtest.cjs ../../outputs/handling-baseline-10.5.0/index.html ../../outputs/handling-play-10.5.0.html
node scripts/stage-handling-playtest.cjs ../../outputs/fidelity-baseline-10.3.0/index.html ../../outputs/handling-play-10.3.0.html
node scripts/stage-handling-playtest.cjs ../../outputs/control-baseline-10.4.0/index.html ../../outputs/handling-play-10.4.0.html
~~~

Historical paths require the corresponding immutable archive. Serve the staged files through the existing task-local preview server, then open with `?ready=1&camera=diagnostic&quality=chromebook&renderer=webgl`. `ready=1` runs the ordinary preload/start code and pauses ready for setup. It skips the title/menu only in this developer copy. The production HTML remains untouched. All inline scripts are syntax-checked while staging.

Comparison settings are horizontalFOV110, distance2.7m, height1m, downward angle3°, stiffness0.55, shakeoff, Octane, standard speed/gravity and Soccar. These in-memory settings are never saved. Keep viewport, drawing buffer and quality fixed and record their actual values from the report.

## Camera isolation

The `Handling test camera` selector supports:

- `BALL CAMERA`: unchanged production ball-camera behavior.
- `CAR CAMERA`: unchanged production car-camera behavior.
- `STABLE DIAGNOSTIC`: follows rendered vehicle translation with the constant world offset `[6,5,-8]`, aimed at the car position plus0.25m upward. Its orientation has no dependency on the car quaternion, contact state or ball direction. The fixture keeps the car opaque in this mode so normal-camera occlusion fading cannot hide the pose.

The diagnostic camera is an investigation aid, not a proposed player camera or a physics repair. It can clip outside the arena near a boundary; normal-camera wall containment must be inspected separately. Actual camera position/quaternion/FOV are sampled with the trace so visual impressions can be compared to the same physical motion.

## Required native sequences

The following plans are starting points for the operator, not prerecorded trajectories. Only the recorded input transitions establish what happened.

| Initial-pose button | Complete action sequence | Example native plan |
| --- | --- | --- |
| `DRIVE / REVERSE` | Accelerate→turn→brake→reverse | W1200ms→W+A500ms→S1600ms→S+A400ms |
| `SLIDE / TURN` | Powerslide→release→accelerate→turn | W+C+A500ms→W350ms→W+A500ms |
| `JUMP / LAND` | Jump while accelerating→land→immediately steer | W+Space2300ms→W+A350ms (one continuous held-jump chord) |
| `FLIP / TURN` | Front flip→land→turn toward ball | Space90ms→W110ms→W+Space70ms→W1700ms→W+A450ms |
| `WALL / FIELD` | Actual supported wall driving→curved floor return→continued driving | W1800ms→W+A500ms |
| `BALL / SECOND` | Hit ball→recover→second touch | W1500ms→W+A40ms→W+D40ms→Shift+W1500ms |

The wall setup is supported at the right wall, pointed downward, with velocity8m/s down the wall. It returns through the actual rounded floor transition without a scripted jump. The ball sequence resets touch count to zero and places a normal stationary ball at the center. The flip setup places the ball ahead and left of the approach so a real steering adjustment is required after recovery. Extra `RAMP / UP` and `SIDE LANDING` buttons provide ground-to-wall and mildly tilted landing diagnostics.

The browser tool releases chord keys at each call boundary. A short `W+Space` call followed by `W` is therefore not proof of a continuously held driving key: even one neutral simulation tick intentionally clears inherited intent and makes the new W press genuine aerial pitch. Concurrent press calls can be serialized by the UI backend. Preserve/report those attempts and use a single long held-jump chord for native held-forward coverage. Fixed-tick source scenarios separately verify continuous W through a short tap and flip. For native flips, releasing directional pitch before the finite actuator ends and coasting to landing can test normal flip recovery without misrepresenting separate chord calls as one continuous W hold.

Press Escape or `CAPTURE / PAUSE` to stop promptly after the sequence. The fixture also pauses after960actual120Hzsim ticks (8s) to prevent a delayed tool call from recording an unrelated long idle/coast. Inspect `#handling-report`; read the full JSON from hidden DOM output `#handling-history` once its `data-complete` is`true`. Save files such as:

~~~text
handling-playtest-10.5.0-jump-land-diagnostic.json
handling-playtest-current-jump-land-diagnostic.json
~~~

The analyzer accepts any `handling-playtest-*.json` file with this fixture's complete pre/post schema. Preserve failed or incomplete attempts with an `-attempt1` suffix rather than overwriting them without a record.

Files beginning `handling-before-` or `handling-after-` are also discovered. Select the camera before clicking an initial-pose button; this returns focus from the select field to a normal button so gameplay keys are not intentionally ignored as form input. A capture-only CSS class hides the normal pause overlay for forensic screenshots while simulation remains paused. Preparing another scenario clears that class. The held screenshot can trail the last physics record by one display frame; use the numeric trace for exact tick attribution.

## What is recorded

The fixture wraps the complete production `sim()` call. Each actual tick stores the car before and after the controller, arena constraints and car/ball interaction, together with the production control trace. This avoids the earlier limitation where a `stepCar()` wrapper sampled before the same tick's ball collision.

Fields include position/quaternion, local angular velocity`w`, supported yaw`wy`, both corresponding world-space representations, support normal/count/state, actual applied input, raw keyboard state, jump edge/hold/lock and dodge eligibility, forward/lateral/normal speeds, steering state, grip, handbrake, clearance, penetration, touches, boost and ball state. The production tracer adds recovery/contact/constraint contributions when available. Old builds without the tracer label branch inference explicitly.

Full history is serialized once when captured; the small live summary updates periodically. This reduces developer-instrumentation disruption during play. Trace allocation still adds work, so these sessions do not measure production FPS or input latency.

A headless instrumentation parity check ran360actual production simulation ticks through both the unwrapped and wrapped simulator with identical throttle, braking, steering, slide and jump inputs. Car position/quaternion/linear and angular velocities, yaw/support/jump states and ball position/velocity/spin matched exactly after every tick. This checks that reading the before/after state does not perturb the solver through shared scratch variables. It does not establish handling quality or native browser performance.

## Analyze actual evidence

~~~powershell
node scripts/measure-handling-browser.cjs ../../outputs docs/measurements/handling-browser.json
~~~

Optional explicit filenames can follow those two arguments. The report includes:

- Actual input and branch transition ticks.
- Steering segments, heading change, forward speed, lateral slip and first supported yaw response.
- Quaternion-derived world angular rate independent of either solver angular representation.
- New touch events sampled after the whole simulation tick.
- Candidates for coupled drive-pitch during unsupported motion and samples near the1m/s support cutoff.
- Required action ordering, including steering after landing and continued driving after the wall return.
- Exact initial-state/camera comparisons and whether actual input tick schedules match.

`allActionsObserved` is an evidence completeness flag. It is not a handling pass/fail claim. Candidate events require source/trajectory review: an intentional wall departure or genuine aerial input can be correct. A car eventually reaching four wheels does not establish predictable control before that moment. Human review must identify whether steering and momentum remain understandable throughout, compare normal car/ball cameras with the diagnostic view, and document any remaining awkward response.

Keyboard controls are required because shared W/A/S/D driving/aerial interpretation is under investigation. Controller testing, physical Chromebook testing and independent multiplayer hardware must be reported as unavailable unless actually performed. Exact automated source probes provide the deterministic tick comparisons; native browser runs complement them with integrated interaction evidence.
