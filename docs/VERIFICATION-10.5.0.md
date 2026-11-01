# Grip 10.5.0 verification

Source regressions, staged-start native-input sequences, matched rendering profiles, responsive layouts and Phoenix production checks are recorded below. Web-publication receipts follow independent verification of each hosted document.

## Source regressions

- Frontend:317 passed,0 failed;17.575s in the recorded final source run.
- Dedicated server:34 passed,0 failed;32.229s in the recorded final source run.
- Total:351 checks. Existing contact, containment, jump/reset, geometry/light-budget and audio/resource checks remain. Changed appearance/dodge contracts and their reasons are documented in the focused repair reports.
- Two real partial-wheel reconstruction cases start from actual one/two-wheel geometry, serialize authority during partial support, restore a corrupted predicted pose and replay pending inputs. Final car/ball linear, angular and pose state agrees. These extend shared-solver consistency coverage; they do not measure hardware or internet latency.
- No new persistent physics state is needed. Dedicated wire3 and gameplay protocol6 reject old clients rather than mixing handling versions. The fixed simulation remains120Hz; authority snapshots remain30Hz.

See [contact](CONTROL-REPAIR.md), [dodge/grip](DODGE-REPAIR.md), [visual](VISUAL-REPAIR.md), [network measurements](measurements/recovery-network.json) and [continuous held-input measurements](measurements/held-drive-recovery.json) for exact conditions and exceptions.

## Matched rendering conditions

Baseline: immutable10.4.0 portable HTML, SHA-256 `df27e76b66f4cce2998a3a77131363d8ba429118d98e12d6c03d6657ca5c5f87`. Candidate uses final10.5.0 source. Comparisons must keep identical camera, car/ball poses, viewport, drawing buffer, preset and arena conditions; screenshot metadata records these values.

The short profile baseline uses Chromium156/WebGL2 on Windows, Ryzen75800X (16 logical threads) and RadeonRX6700XT through ANGLE/D3D11. Viewport and drawing buffer are1280×720, DPR1, Chromebook preset. Each driving callback advances two actual120Hz simulation steps and draws once;20 warm callbacks precede60 measured callbacks. Goal effects are held at age0.45s. GPU timings use disjoint-safe timer samples. CPU time includes the prescribed simulation work plus render submission. These fixed-workload callbacks are not real display-FPS, physical Chromebook or input-latency measurements.

| Scenario |10.4 CPU p50/p95(ms) |10.5 CPU p50/p95(ms) |10.4 GPU p50/p95(ms) |10.5 GPU p50/p95(ms) |
| --- | ---: | ---: | ---: | ---: |
| Normal driving |1.80 /2.20 |1.90 /2.80 |1.169 /2.468 |1.201 /5.094 |
| Six-car traffic |2.80 /3.50 |2.70 /4.10 |1.402 /4.599 |1.362 /3.281 |
| Boost/contact |2.60 /3.20 |2.80 /3.40 |2.034 /7.430 |1.891 /7.931 |
| Goal effect |1.60 /2.10 |1.60 /1.90 |1.150 /1.364 |1.134 /2.074 |
| Wall |1.80 /2.40 |1.80 /2.50 |1.015 /3.443 |0.870 /2.720 |
| Corner |2.10 /3.40 |2.10 /3.00 |0.788 /3.297 |0.848 /2.650 |

The [complete paired profiles](measurements/render-repair.json) retain raw conditions, GPU timer coverage and callback timing. Baseline GPU timer coverage is56 samples for boost/contact and wall,57 otherwise; candidate coverage is56 for normal driving,57 otherwise. Median CPU differs by at most0.20ms and median GPU by at most0.145ms. All six median draw-call and triangle counts are unchanged. GPU p95 is higher in normal driving, boost/contact and the held goal effect, and lower in traffic, wall and corner views; CPU p95 also has mixed results. No general FPS improvement is inferred or claimed. Moving profiles include changed physics/camera behavior, so their differences do not isolate material cost. Short tails, long-session freezes and physical Chromebook performance require longer hardware-specific testing.

## Native browser sequence acceptance

The developer fixture in `scripts/stage-recovery-playtest.cjs` enables contact/force trace and provides initial-pose buttons. Subsequent steering, throttle, jump, dodge, collision and camera updates use production code and native keyboard events. Pose setup is not evidence that an entire sequence was completed.

| Required sequence |Native input and observations |Status |
| --- | --- | --- |
| Kickoff→touch→turn→second touch |410 actual ticks. From the posed kickoff approach, native forward input touched at1.492s; brief left/right steering corrections and boost produced a second new touch at2.817s. Both contacts occurred on four wheels and the clip ended upright and supported |Completed staged-start desktop sequence |
| Powerslide→accelerate→jump→land→steer |382 actual ticks. Held powerslide/left, released into acceleration, jumped at1.092s, landed on partial support at2.275s and stable support at2.583s; right steering at2.717s produced ground yaw2.261rad/s. Ended upright on four wheels |Completed staged-start desktop sequence |
| Wall drive→exit→aerial adjustment→land |328 actual ticks. Began with real four-wheel wall traction, drove along the wall, jumped into air at0.692s, rolled at0.825s and yawed at1.292s, then regained field support at2.650s. Ended upright on four wheels |Completed staged-start desktop sequence |
| Dodge→recover→immediate ball challenge |376 actual ticks. Native jump/forward dodge, continued forward input and boost; stable landing at2.467s, a new ball touch at2.658s on four wheels, then left steering. Ended upright and supported |Completed staged-start desktop sequence |

The [compact actual browser traces](measurements/browser-control.json) preserve native input transitions, physical state changes, residual penetration, deliberate control branches and new touch increments. All1496 final recorded ticks have classified control states and valid required numeric fields. Maximum final-sequence residual hull penetration is0.464mm. The original touch/turn attempt recorded one new touch rather than two; its initial counter of one came from earlier play. The first nominal wall attempt started outside tire reach and tested a falling side-pose recovery instead of supported wall driving. The first dodge attempt touched during flight and partial recovery, with no later touch after stable landing. Those exploratory attempts remain in the report. Retests corrected the setup/verification scope: the wall car starts at actual tire support, the dodge ball is placed beyond the landing, and the touch/turn correction is shorter. Production physics was unchanged by those fixture corrections. Only actual new counter increments after each first sample count toward acceptance.

Final native key plans were: touch/turn W1500ms→W+A40ms→W+D40ms→Shift+W1500ms; slide W+C+A350ms→W450ms→W+Space90ms→W1500ms→W+D450ms; wall W450ms→Space110ms→Q450ms→Right900ms→W+A500ms; dodge Space90ms→W110ms→W+Space70ms→W1500ms→Shift+W800ms→W+A200ms. Escape paused each clip. The sampled input transitions include normal event/tool scheduling gaps; planned milliseconds are not claimed as exact solver-time intervals. No browser console errors were captured in these checks.

A silent console, stable automated trace or screenshot does not establish responsive handling. Browser inputs test desktop keyboard behavior only. Physical Chromebook, phone, controller and independent multi-device multiplayer checks are unavailable.

## UI and visual acceptance

Center-field and garage before/after captures use exactly matching camera position/quaternion/FOV, car and ball poses,1280×720 viewport/drawing buffer, DPR1, Chromebook preset and120 held rendering frames; metadata is included with the paired rendering report. Surface roles/neutral fill improve the chassis and tire separation, while goal/roof backing and quieter turf modulation reduce the black/white contrast. The structural roof grid also receives a scoped lighter steel material. The matched poses isolate appearance; they do not establish camera stability or handling.

Moving native gameplay was inspected through the four recorded sequences. Existing dense wind-driven turf, original audio, boost/contact effects and matte cars remain. The accepted pass improves car/goal/turf/crowd readability; it does not claim proprietary rendering parity or certify all temporal behavior. WebGL2 was exercised; WebGPU and physical phone/Chromebook rendering were not available for this release review.

The [actual responsive-layout measurements](measurements/hud-repair.json) cover1280×720 keyboard,390×844 portrait touch and844×390 landscape touch. The training row is32px high at desktop/portrait and28px in landscape. A real CSS cascade defect was found during verification: the late original bottom66px rule stretched the desktop row to552px. Higher selector specificity now enforces bottom:auto; the final desktop row spans y102–134. Desktop chat spans y592–641 and ball-camera text y661–696, a20px gap. Portrait chat and thumbstick have66px vertical separation; landscape retains12px. The named functional groups do not overlap. The DOM scoreboard and boost/speed gauges remain sharp and independent of drawing-buffer resolution.

Normal navigation was separately exercised through Settings→touch controls→Training→Play, then pause→Quit→Home→Settings→keyboard controls→Training→Play. Developer-pose fixture controls are not used as evidence of that normal menu flow. Layout emulation is not physical phone hardware verification.

## Production and artifacts

The accepted portable HTML has20,994,439bytes and SHA-256 `d5911fc1b05043d27533ca0cc2dd998318647777de543cce4a60e9b55eb73021`. Phoenix health independently reports10.5.0/wire3 at120Hz/30Hz, capacity4, zero rooms and zero dropped ticks. All49 production source SHA-256 hashes match the staged source. Both3v3 playlists initialized, and actual TLS two-client lifecycle and custom-paint checks passed across Pages/CDN origins. The single237ms application ping is a sample from this connection, not a Las Vegas player latency estimate. Deployment was guarded by idle10.4.0/wire2 checks and retains `/home/ubuntu/tevin-before-grip-10.5.0-20261101T175158Z.tar.gz` for rollback.

Pages/Bunny/Cloudflare source/build publication and CI receipts are recorded after their exact root-document hashes are independently verified. Existing services/plans remain: no network rules, ports, nginx/service configuration, dependencies or paid resources changed.

The portable HTML and source ZIP must contain the accepted build. Package only maintained selected source/assets/tests/scripts and final evidence; exclude private keys, dependencies and unrelated scratch archives. SHA-256 compare every ZIP entry with staged source and record the final archive hash outside the archive.
