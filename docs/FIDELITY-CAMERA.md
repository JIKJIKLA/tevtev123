# Active-play camera audit

Baseline: Nivet **10.3.0**, implementation commit `12bba0aec9e3ed9791253a45ae48ed2fa6400382`. This pass fixes demonstrated Nivet defects and reduces an intentional wall-orbit approximation. It does **not** establish that the complete proprietary camera response has been reproduced.

## Evidence and coordinate conventions

- [Epic's official camera settings explanation](https://www.epicgames.com/help/c-37599050/c-32343914/what-are-camera-settings-in-rocket-league-a14443106), retrieved 2026-10-30, describes FOV, height, angle, distance, stiffness, swivel and shake. It supplies no numerical stiffness response, wall-camera trajectory, near-ball blend, FOV aspect-axis rule or transition timing. No controlled Rocket League camera recording was available. Those numerical targets remain **unknown**; third-party simulators do not resolve them merely by reproducing car physics.
- The embedded Three.js engine identifies as revision **186**. [Pinned r186 `PerspectiveCamera.js`](https://github.com/mrdoob/three.js/blob/r186/src/cameras/PerspectiveCamera.js) defines `fov` as **vertical**, in degrees, and aspect as canvas width/height. This is independently verified projection semantics, not evidence about Rocket League's FOV convention.
- Nivet uses metres, world **Y up**, local car **X forward/Z lateral**. The saved camera FOV is a **16:9-normalized horizontal value** converted to vertical with `2 atan(tan(fov/2)/(16/9))`. Distance/height are metres. This convention is retained to preserve saved views; it is not mislabeled as proven proprietary behavior.

## Fidelity matrix

| Mechanic | Baseline behavior | Verified reference or requirement | Difference/type | Confidence | Completed change | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| Exact 180-degree camera heading change | Normalized vector lerp remains on the original axis when target is exactly opposite | A responding camera must be able to face a ball that passes directly behind; angular interpolation has a defined nonzero path | Reproducible correctness defect | High | Short-arc angular interpolation with a retained turn sign at the antipodal singularity | Exact collinear reversal at 30/60/120 display Hz; seam/zero-vector tests |
| Pitch dodge in car camera | Projected nose reverses halfway through a somersault, swinging the view although world yaw did not change | Stable spatial orientation is the owner's active-control requirement; exact proprietary flip-camera rule is not measured | Readability approximation | High for the Nivet repro, unverified for RL parity | During a pitch-dominant directional dodge, derive yaw from the lateral axle; free yaw turns still work when the dodge phase ends | Full forward/back somersault and subsequent intentional reversal |
| Wall-camera distance | Default 2.7 m setting produces 7.02 m sideways offset, 7.149 m total eye separation | Official setting represents how far the camera trails the car; owner explicitly asked to reduce the separate 6.5–9.5 m wall orbit | Intentional approximation that overrode the setting | High for Nivet numbers; proprietary wall offset unknown | Wall tangent now uses the actual saved distance; saved height is passed through; keep the camera constrained inside the existing arena | Distance/height contracts, both subjects visible in the default wall view, continuous floor/wall/ceiling path |
| Wall FOV | A saved 80° value is forced toward 104° while on a wall | Preserve the player's saved view; no verified basis for this wall zoom | Reproducible settings override | High | Remove the forced wall FOV increase; keep the same saved projection convention | Settled 80° wall view remains 80° at 16:9 |
| Distant ball aim | Horizontal target displacement is capped at 14 m without proportionate vertical displacement; footprint correction then modifies the result further | Ball cam should represent the actual ball direction rather than an artificial near proxy | Reproducible aiming/parallax defect | High | Target the actual ball; existing collision and bounded footprint correction handle close overlap | A (50,8,0) m stationary ball, settled actual source block; overhead/wall/goal/corner containment |
| Ceiling departure | Base camera height always goes toward world +Y, including a supported ceiling pose | Keep the eye inside the playable arena without forcing it toward the ceiling | Geometric consistency defect | High | Supported downward-normal surfaces apply height toward the arena interior; preserve tangent continuity through nearly vertical normals | Continuous roof transition and ceiling/goal-side camera safety tests |
| FOV outside 16:9 | Saved 110 yields 93.93° horizontal at 4:3, 48.63° at 9:16, 123.84° at 21:9 | Exact RL aspect-axis policy is not established by the sources retrieved | Known Nivet projection convention; proprietary difference unknown | High for projection math, unknown for RL parity | Retain convention and saved values; do not silently retune based on guesses | Analytic perspective round-trip at multiple saved values/aspects |
| Stiffness, speed extension and mode-switch timing | Separate exponential heading/position/aim rates; speed adds up to 0.184 m distance at 23 m/s | Epic defines the controls qualitatively but supplies no measured response curves | Intentional approximation/unknown reference target | Unknown for RL parity | Retain rates and extension, fixing angular singularity only | Frame-rate response and monotonic stiffness-setting regression |
| Car fading and footprint correction | Nine-ray ball coverage, dwell/hysteresis, 33% floor; high-ball pitch correction | Readability policy from prior owner requests, not a measured RL transparency rule | Intentional approximation | High for our behavior | Retain existing behavior and tests | Existing five camera readability regressions |

## Reproducible measurements

Run from the repository root:

```powershell
node scripts/measure-camera-fidelity.cjs ../../outputs/fidelity-baseline-10.3.0/src ../../outputs/fidelity-camera-before.json
node scripts/measure-camera-fidelity.cjs src ../../outputs/fidelity-camera-after.json
node --test tests/camera-fidelity.test.cjs tests/camera-readability.test.cjs
```

The frozen baseline archive was taken **before tuning**. The runner loads the actual camera block and geometry queries from the selected source, with controlled car/ball poses and default saved settings unless named. It uses no random input, physics shortcut, browser screenshot or footage-derived target. The warmed six-second floor-to-wall-to-ceiling path aligns the mesh roof with the contact normal and drives along the local lateral-preserving yaw frame. [Committed before/after data](measurements/camera-fidelity.json) includes the full conditions.

| Scenario | 10.3.0 baseline | Updated source |
| --- | ---: | ---: |
| Exact ball-behind reversal: time to cross 90° at 30 / 60 / 120 display Hz | Never within 2 s / never / never | 0.06667 s / 0.06667 s / 0.06667 s |
| Same reversal: heading after 2 s | 0° at all three rates | 179.9999999° at all three rates |
| Default direct wall eye separation | 7.148804 m | 3.002083 m |
| Wall horizontal FOV with saved 80°, after 4 s | 104° | 80° |
| Settled far-ball angular error at (50,8,0) m | 1.525096° | Below floating-point angular resolution in this scenario |
| Largest relative-eye change/frame on the warmed curved traversal, 60 Hz | 0.159806 m | 0.081217 m |
| Minimum camera boundary clearance on that path | 0.422 m | 0.422 m |

The 0.06667 s result follows the **retained Nivet** exponential rate and sample interval; it is not a claim about Rocket League's camera reaction time. Likewise, the shorter wall eye is a setting/readability correction, not a newly measured proprietary distance. These measurements establish local correctness and continuity, not hardware performance or complete reference fidelity.

## Tests and remaining playtest work

Seven new tests distinguish correctness, settings contracts, a readability approximation, regression and stability. They cover 180°/seam changes, source-driven camera paths at 30/60/120 Hz, somersaults and intentional reversals, saved wall distance/height/FOV, close/overhead/far ball targeting, wall/ceiling/corner/goal camera containment and the retained projection/stiffness contract. The existing fade/framing tests continue to pass.

The VM tests do not draw pixels. Final combined-build browser playtesting must still examine ball-cam toggles under active input, low-FOV wall play, corners/goals, diagonal flip motion, phone portrait visibility and latency/jitter corrections. An 80° view may physically be too narrow to include both a nearby car and the ball across the arena; it now honors that explicit choice instead of silently widening it. No claim of exact wall-camera or aspect behavior should be made until controlled proprietary-game recordings supply comparable evidence.
