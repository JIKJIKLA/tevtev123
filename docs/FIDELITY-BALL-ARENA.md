# Ball, car contact and arena fidelity audit

Baseline: Nivet **10.3.0**, implementation commit `12bba0aec9e3ed9791253a45ae48ed2fa6400382`; built HTML SHA-256 `e603c3f6fa43f807b62929c344d00cf9f2c166dd71f11607ed212b57e67513eb`. The archived build is separate from edited source. Measurements below were captured before tuning and repeated against current source with the same deterministic fixtures.

This is an independent compact solver. Matching a documented equation establishes **model agreement**, not exact agreement with the current proprietary game. No fresh controlled Rocket League recording was available. The raw bounce dataset linked by the original author returned HTTP 404 on 2026-10-30; it was not used, and no raw-recording error percentage is claimed.

## Evidence, scale and conditions

- [Samuel Mish's original car–ball collision measurements](https://www.smish.dev/rocket_league/ball_simulation_3/) distinguish an inelastic rigid-body/friction impulse from an additional position/relative-speed-based impulse applied only to the ball. The author explicitly excludes wheel hits and pinches from that model's validated scope.
- [Original ball-bounce measurements and equations](https://www.smish.dev/rocket_league/ball_simulation_1/) use approximately 0.6 normal restitution and a slip response `deltaVt = -.285 * min(1, 2 * normalSpeed / slipSpeed) * slip`. Slip includes angular surface velocity. These are empirical model parameters, not a current-game source-code specification.
- [RocketSim constants at c2baacb](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/RLConst.h) and [Ball.cpp at the same revision](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/Sim/Ball/Ball.cpp) provide a corroborating community implementation: car–ball restitution 0, friction 2, the extra-impulse speed curve, and a two-tick guard. This is a simulator approximation rather than an unquestionable description of Rocket League.
- [RLUtilities ball.cc at eb887b3](https://github.com/samuelpmish/RLUtilities/blob/eb887b312e33136b27a64516179ea812c366c2fa/src/simulation/ball.cc) corroborates the reduced-mass matrix and separate impulse. Its old speed-limit and implementation details are not copied. Nivet retains the 60 m/s cap supported by the separately pinned RocketSim constants.

The references use Unreal units (100 UU = 1 Nivet metre), seconds and radians. Nivet uses world **Y up**, local **+X forward**, local **+Z right**. A direct RL→Nivet `(x,y,z)→(x,z,y)` permutation is a reflection: angular velocity is an axial vector and requires the corresponding negative permutation when comparing recorded spins. No raw recorded spins were transferred here. The independent tests derive cross products directly in Nivet coordinates.

All contact probes use standard Soccar, 120 Hz, default gravity/speed, no bots, the real body box and offsets, and explicit positions/velocities. Isolated contact results are followed by ball-only trajectories at 0.1, 0.5 and 1 second. The sustained-hood probe uses an explicitly **kinematic** 8 m/s car to isolate persistent ball contact; it is not presented as a player-controlled dribble test.

## Fidelity matrix

| Mechanic | Baseline behavior | Verified reference / independent target | Difference type, confidence | Implemented change | Validation |
| --- | --- | --- | --- | --- | --- |
| Radius, mass, speed/spin caps | 0.9125 m, 30 kg, 60 m/s, 6 rad/s | Pinned simulator/reference values agree at this scale | Numerical agreement; high on values, not whole behavior | Preserve; enforce caps immediately after car contact as well as after the ball step | Cap/finite tests across 24 rotated high-speed contacts |
| Free-flight gravity and drag | Semi-implicit gravity; `exp(-.030562 dt)` linear damping | Exponential is consistent with a 0.03-per-second Bullet damping parameter | Existing model agreement; moderate applicability to current game | Preserve, including configured gravity; no speculative drag tuning | Before/after free-flight traces are identical |
| Car–ball normal response | Speed-dependent restitution .35→.82, recoil .72, angular factor .16 | Original model: inelastic reduced-mass response plus a separate ball-only impulse | Verified model mismatch; moderate game applicability | Independent full 3×3 contact solve, equal/opposite physical impulse, body inertia and angular contact velocity | Analytic central-contact common velocity; momentum/energy and off-center point-velocity tests |
| Added hit power | Folded into bounciness; no distinct position-based extra impulse | Speed curve .65 through 5 m/s, .55 at 23, .30 at 46; vertical direction .35, forward direction .65 | Model mismatch; moderate | Separate translation-relative-speed impulse, ball only, capped at 46 m/s input | Independent curve-knot and ball-only extra-impulse tests; 12 touch scenarios |
| Repeated contact | New bounce calculation every ball substep | Pinned community model limits extra power to once per two ticks | Consistency hazard; high | Shared `ballHitCooldown`, decremented in the vehicle step and serialized for prediction | Substep/adjacent-tick guard regression |
| Grazing contact constraints | Independent review of the new model found that directly clipping the free impulse could discard a genuine closing contact | Passive inelastic contact must exchange momentum, stay in its friction cone, and remove closing normal velocity | Demonstrated solver defect before release; high | Preserve the normal constraint while scaling the free tangential solution; no new power/aim assistance | Actual sphere/OBB detector repro plus 12,000 seeded free-body face/edge/corner contacts |
| Surface slip/spin | Generic Coulomb factor .25 and an extra .05/s rolling/spin loss | Measured bounce equation above; no additional rolling/spin loss in that model | Model mismatch; moderate | Shared measured slip helper; remove the unmeasured extra decay | Independent floor/wall/ceiling equation tests and rolling-drag derivation |
| Gentle surface bounces | Restitution fades from zero at .4 m/s to .6 at 2 m/s | Measured model retains .6 above numerical resting contacts | Verified model difference; moderate | Restore .6 outside a separate 0.1 m/s numerical rest band | 1 m/s normal impact → .6 m/s directly; tiny gravity contacts settle |
| Flat goal-mouth traversal | A center-line rolling ball rises 21.595 cm before entering the goal | The visible entrance/floor is flat; a zero-height ramp should produce no rise | Reproducible correctness defect; high | Extend only the interior overlap of the analytic goal pocket back by one ball radius | Both ends and near-post fully-contained paths remain flat within floating-point precision |
| Arena transitions/goal frame | One 4 m rounded-box SDF plus rectangular pockets | Original reference maps use detailed collision meshes | Intentional approximation; no exact mesh correspondence established | Preserve outside dimensions and document the limitation; no unlicensed mesh redistribution or broad rewrite | High-speed containment, oblique corners, posts and ceiling stability probes |
| Prediction and special modes | Separate duplicate bot bounce equations; local prediction calls ballSub | Same laws must run in authority, client prediction and forecast; Soccar must not seek goals | Correctness/consistency; high | Authority and forecast use the same bounce helper; car-contact power never reads a goal target; Heatseeker steering remains gated by its mode | Exact local/authority no-car bounce comparison, forecast trajectory tolerance, mirror-symmetry test, no predicted match result |

## Before/after measurements

These are Nivet-to-Nivet measurements under identical inputs, not claimed current-Rocket-League errors. Values are outgoing ball speed unless otherwise specified.

| Controlled probe | 10.3.0 before | Current source | Interpretation |
| --- | ---: | ---: | --- |
| Ground bumper, car 1 m/s | 1.135156 m/s | 1.450753 m/s | Model-aligned extra impulse also applies to soft translation; it is not simply a high-power multiplier |
| Ground straight, car 10 m/s | 12.754199 m/s | 14.229757 m/s | Separate inelastic response and relative-speed power curve |
| Ground straight, car 23 m/s | 33.998297 m/s | 31.067358 m/s | Full-speed hits became less vertically bouncy; vertical speed 10.629258→7.782619 m/s |
| Airborne front-centered, car 10 m/s | 13.772741 m/s | 14.480262 m/s | Actual body offset and angular inertia remain active |
| Angled airborne front corner, car 15 m/s | 17.038166 m/s | 18.764503 m/s | Outgoing direction/spin are geometry-driven, not goal-directed |
| Moving-ball challenge, car +23 / ball −20 m/s | 49.345456 m/s | 29.856231 m/s | Removing restitution-based power avoids amplifying relative closing speed twice |
| Stationary hood with incoming ball [2,−4,0] m/s | 1.831816 m/s | 3.032323 m/s | A hard drop still rebounds through the measured extra-impulse model; it is not an automatic catch |
| Gentle floor probe, initial vy −1 m/s | vy +0.258321 m/s | vy +0.632339 m/s | Includes the fixture's first gravity tick; new rebound matches .6 × impact speed |
| Initially rolling 4 m/s, after 3 s | 3.224492 m/s | 3.746442 m/s | Removes unrelated angular/rolling damping; sustained loss comes from linear drag and slip |
| Center-line goal entrance peak rise, initial vz 4 m/s | 0.215949 m | < 1e−14 m | Fixes the false lip caused by the old max-distance union overlap |
| Free flight, t=1 s | p=[9.847481,10.726094,0] m | Identical | Preserve the already working flight integrator |

In the kinematic hood probe, the ball remains on the body for the tested second: final relative x=0.321121 m and relative y=1.314206 m. This is evidence of bounded persistent contact in this fixture, not proof of advanced dribbling parity. The before/after JSON also records car recoil, ball spin, three trajectory samples per isolated touch and per-quarter-second rolling/goal traversal samples.

Reproduce from the game directory:

```powershell
node scripts/measure-ball-fidelity.cjs baseline ../../outputs/ball-fidelity-before.json
node scripts/measure-ball-fidelity.cjs current ../../outputs/ball-fidelity-after.json
node --test tests/ball-fidelity.test.cjs
```

The baseline command requires the archived original `outputs/fidelity-baseline-10.3.0/index.html` and fails explicitly if it is absent. It never silently substitutes the current build. A fresh checkout can obtain that exact original build from the pinned Nivet commit above. Current source loads independently of the portable build through the test harness.

## Constrained grazing contacts

Independent review of the newly implemented contact solver exposed a defect before release. Solving the full sticking impulse and then directly clipping its normal/tangential components could produce zero impulse for a genuinely approaching grazing contact. The reproducible case is a valid front-face sphere/OBB overlap on body 1: its local face point is `[.602535, .091639209255, .407134926009]` metres relative to the box center. The sphere's normal is the rotated local +X face normal, rather than an arbitrary independently chosen arm/normal pair. The old intermediate solve left closing point velocity at **0.200059796846 m/s**. The corrected solve leaves **−4.44e−16 m/s**. This comparison is between two internal candidate solvers, **not** a claim that the published 10.3.0 solver had that same zero-impulse defect.

The contact matrix `K` maps impulse to the change in relative point velocity. With normal `n`, approaching speed `uN`, free tangential impulse `t`, `kN = n·K·n`, and `coupling = n·K·t`, the new path is:

```text
alpha = clamp(mu*uN / (kN*|t| + mu*coupling), 0, 1)
Jt = alpha*t
Jn = (uN - alpha*coupling) / kN
```

A nonpositive denominator leaves the unconstrained sticking solution. This retains `n·K·J = uN` while enforcing `|Jt| <= mu*Jn`. For a free-body symmetric positive-definite matrix, eliminating the normal variable gives a positive-definite Schur complement; energy along this path is the normal-only dissipative result plus `(alpha²/2 - alpha)` times a nonnegative quadratic form. Thus it cannot add physical kinetic energy for `0 <= alpha <= 1`. The chosen sliding direction is still an explicit approximation, rather than an exact Coulomb complementarity solver or evidence of proprietary-game equivalence.

The added invariant suite tests **12,000 deterministic free-body contacts**, including all three bodies, rotated faces/edges/corners, ordinary and nearly grazing approaches, and friction coefficients 0, .25 and the game default 2. It checks the cone, nonzero response, total linear momentum and non-increasing translational plus angular energy. Below explicit spin caps it additionally checks angular momentum and normal point-velocity closure. A further **500 aligned tire-supported contacts** checks the documented one-axis supported-car approximation. Tilted/misaligned suspension contacts are external constraints and are not claimed to be isolated rigid-body experiments. The standard twelve outgoing-touch measurements were repeated after this fix; their printed speeds and vectors are unchanged at the report's nine-decimal precision.

```powershell
node --test tests/ball-contact-invariants.test.cjs tests/ball-fidelity.test.cjs
```

## Validation boundaries and remaining gaps

The focused suites contain **16 passing tests**, explicitly labeled model fidelity, physical invariants, regression, stability or determinism. Model tests compare independently stated equations/targets; regression/stability passes do not establish external fidelity. The tests include floor/wall/ceiling contacts, high-speed containment and challenges, near-post entrance paths, persistent-contact cooldown, angular momentum response, mirrored contacts, identical repeated sequences and authority-only outcomes. Root integration performs the complete game/server suite and real browser playtests separately.

The 0.1 m/s sleep band, tire-supported pitch/roll inertia constraint, immediate rather than end-of-tick extra impulse, and positional projection are documented numerical/architectural approximations. Pinches, wheel collision shapes, exact suspension and detailed standard-map transition/frame normals remain unverified. A mesh/BVH architecture could address geometry fidelity, but would require licensed geometry, normal/contact matching for wheels and camera, CPU profiling and a migration comparison. This update fixes a demonstrated analytic-union bug without silently replacing that architecture.
