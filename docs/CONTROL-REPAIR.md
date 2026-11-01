# Contact and control regression repair

This is a repair of Nivet10.4.0's ordinary controllability, using10.3.0 as a regression baseline. It is not a new claim of proprietary-engine accuracy. The changes are confined to vehicle support/contact control, with the separately reviewable [dodge/grip correction](DODGE-REPAIR.md). Rendering, camera, match rules and assets are not used to mask a handling failure.

## Reproduced root causes

1. The10.4.0 ground controller required at least three wheels, while the ordinary aerial controller required zero wheels. Real one/two-wheel poses therefore had neither controller. Throttle autoroll still applied, so the car could rotate automatically while steering/pitch/roll inputs were suppressed.
2. Ground yaw was held in scalar wy while the ground controller set the rigid angular vector to zero. On the first partial/airborne tick, wy was set to zero without transferring it to the angular vector. A momentary support loss therefore discarded the entire current turn.
3. Partial support used a hull-averaged normal when it left the ground branch, even when a measured wheel normal was available. Side recovery torque could then operate on a different contact frame than the tires.
4. Low-speed hull scrapes used restitution during positional projection, which could add separating motion to a resting scrape. Inward dodge rotation also continued after two real tire tips reached a plane; simple wheel projection lifted the chassis while the actual landing still waited for three-wheel support. Later hull impulses converted some of the powered angular energy into a hop.

The two-wheel reproduction uses a nose-up0.15rad pose; the one-wheel case uses roll0.3/pitch0.15rad. Each car is placed from the actual wheel coordinates with15mm minimum wheel clearance, starts at10m/s and incoming ground yaw1.2rad/s, then receives identical throttle/steer inputs. Four/three-wheel comparison poses use the same inputs. These are valid geometry samples rather than a forced wheel-count flag.

## Replaced, restored and retained

**Stable support:** Three/four aligned wheels retain the existing throttle, braking, boost, steering-curvature and spring constraints. Jump eligibility still requires this stable support. Stable turn response in the controlled first-tick fixture is unchanged from both baselines.

**Partial support:** One/two aligned wheels now use a distinct controller. Tire acceleration, grip and yaw authority are limited by the supporting wheel fraction. The wheel-derived normal owns the contact frame. Explicit roll and an independently commanded pitch remain available; W/S continues to mean driving while supported instead of unexpectedly pitching the nose. Supported tilt damping and a finite angular suspension spring settle recoverable landings. There is no full four-wheel tire controller combined with a full free-flight controller, no instantaneous lateral-velocity cancellation and no direct orientation snap.

**True departure:** Zero support, a jump lock, a car moving away from the support normal faster than1m/s, or a badly misaligned wheel pose does not receive partial tire traction. The actual aerial controller runs even if a near-field sample still counts wheels during a deliberate jump. Existing turning momentum is converted between world/support and car-local coordinates when support changes: world angular velocity=-wy×previous support normal. Landing derives the supported yaw rate from the actual angular vector. It does not replace it with a preferred heading.

**Side/roof contact:** Actual hull penetration is resolved, and tangential scrape friction remains. Resting-speed contact is inelastic; restitution is reserved for a stronger incoming impact. Throttle-driven side recovery is bounded to8rad/s², waits for actual contact and yields to explicit rotation. It does not rotate a neutral roof or side to a chosen pose. An explicit roof-jump recovery remains available. Necessary stabilization is preserved rather than classified as unwanted assistance.

**Contact during a dodge:** Two tire tips must be within25mm of the same plane, the roof must face that plane by more than0.5dot, and the dodge-axis point velocity must be inward. Only then does the tire constraint interrupt inward actuator-axis rotation. Orthogonal rotation/linear momentum are retained. This does not grant a jump reset: the ordinary three-wheel reset condition remains. A nearby suspension sample or a genuine aerial flip does not trigger it. The unchanged near-floor dodge/reset integration test passes again; no trick button or scripted trajectory was added.

**Powerslide:** Partial and stable states share the same handbrake state, wall grip adjustment and held-only slide-yaw blend. Releasing the button no longer retains a slide-yaw multiplier merely because the grip state is still recovering. See the separate dodge/grip report for the finite dodge phase and release calibration.

No new persistent physics fields are required. wasG now records legitimate current wheel support for the existing small reach hysteresis; ground continues to mean stable three/four-wheel driving. Existing serialized wy, angular velocity, wasG, handbrake and dodge fields carry the same solver state in offline, authority and prediction. Developer trace data is never serialized as gameplay state.

## Controlled before/after measurements

[Full reproducible data](measurements/contact-control.json) records13identical deterministic scenarios for each version, including time in each contact/control state, heading, angular velocity, speed, lateral slip, support normals, eligibility, containment and sampled trajectories. Frozen builds are used for both historical versions.

| Probe |10.3.0 |10.4.0 |Repair |
| --- | ---: | ---: | ---: |
| Two-wheel first-tick yaw after incoming1.2rad/s |1.615935rad/s (full ground) |−0.001119rad/s (autoroll only) |1.407967rad/s (limited tire control) |
| One-wheel first-tick yaw |1.615935rad/s (full ground) |0.001256rad/s |1.303984rad/s |
| Three/four-wheel first-tick yaw |1.615935rad/s |1.615935rad/s |1.615935rad/s |
| Two-wheel time without an ordinary controller |Full ground control |0.200s |0s |
| One-wheel time without an ordinary controller |Full ground control |0.267s |0s |
| Brief actual support loss: first-tick yaw |0.075917rad/s |0.075900rad/s |1.275900rad/s |
| Same support-loss case: return to stable support |0.092s |0.692s |0.100s |
| Diagonal landing: return to stable support |0.267s |0.958s |0.525s |
| Diagonal landing: no ordinary controller |Not scored |0.608s |0s |
| Side landing: return to stable support |0.992s |0.508s |0.642s |
| Side landing: no ordinary controller |Not scored |0.192s |0s |
| Powerslide release: lateral speed below0.5m/s |0.292s |0.325s |0.275s |

The repaired side landing is slightly slower to become fully supported than10.4.0 in this fixture, while retaining usable input throughout. This is not presented as a universal recovery-time improvement. One-wheel support also deliberately has less authority than10.3.0's full controller. The goal is a continuous and understandable response, not instant upright recovery.

The no-controller metric for10.4.0 is conservatively inferred from its actual source branch conditions for wheel-contact samples outside jump lock or active dodge. Repaired branches are traced directly. This gap metric is not scored for10.3.0 because its separate automatic pose-recovery path was not instrumented; its actual geometry/trajectory and first-tick response are still compared. First wheel contact means a support-range sample, not a physical force-sensor recording. The recovery and response thresholds are Nivet gameplay acceptance requirements, not independent Rocket League timing measurements.

## Tests and developer trace

Ten focused tests in tests/contact-transitions.test.cjs pass. They exercise real one/two/three/four-wheel geometry, yaw continuity, actual support loss, jump departure, explicit partial-contact roll, side/diagonal landings, inward tire/dodge constraints, neutral roof versus explicit recovery, wall-to-floor/corner traversal, impact followed by steering, render-frame grouping determinism and trace isolation. Seventeen tests pass when combined with the existing seven car-contact checks, including all six playlist/roster contact soaks. The unchanged near-floor dodge reset case also passes in the combined19vehicle/dodge checks.

The gates require input response on the next fixed tick, a distinct limited partial response below stable authority, no phantom traction during a jump, no ordinary-control gap, useful momentum after recovery, and bounded5mm maximum penetration in the targeted scenarios. Landing checks require supported recovery within0.75s of the first wheel sample while allowing physically finite angular motion. They do not merely assert the new spring/damping constants.

The developer-only flag window.__NIVET_CONTROL_TRACE__ enables c.controlTrace and vehicleTraceFrame(c). Fields include raw wheel/hull count, selected branch, support normal, inputs, local/angular/linear velocity, effective yaw, tire/grip/spring acceleration, tire steering target, recovery torque, summed hull/linear-constraint impulses(Ns), positional projection(m), jump/dodge state and any inward tire-phase stop. Trace objects are allocated only with this flag enabled. The normal player HUD is unchanged by instrumentation.

Reproduce from the game directory:

~~~powershell
node scripts/measure-contact-control.cjs 10.3.0 ../../outputs/contact-control-10.3.0.json
node scripts/measure-contact-control.cjs 10.4.0 ../../outputs/contact-control-10.4.0.json
node scripts/measure-contact-control.cjs current ../../outputs/contact-control-current.json
node --test tests/contact-transitions.test.cjs tests/car-contact.test.cjs
~~~

The historical commands require outputs/fidelity-baseline-10.3.0/index.html and outputs/control-baseline-10.4.0/index.html respectively, and fail clearly if missing. Source commits and SHA-256 hashes are recorded in the data. Current probes load current source independently of the portable build.

## Verification boundaries

Independent authority/prediction review adds two actual partial-wheel reconciliation tests in `tests/prediction-fidelity.test.cjs`. They place the real one/two-wheel tyre geometry, verify steering on the next fixed tick and exact authority/client position, velocity, local angular velocity and supported yaw throughout24ticks, then restore a snapshot captured on partial-support tick1 after deliberately corrupting the client. Replaying the23pending inputs restores identical car position/rotation/velocity/angular velocity/yaw, ball position/velocity/spin, support and jump/dodge eligibility. This exercises the meanings of existing serialized state rather than merely checking that field names are present. No additional persistent solver state or physics patch was needed in this review.

The [held-forward comparison](measurements/held-drive-recovery.json), reproducible with `node scripts/measure-held-drive-recovery.cjs docs/measurements/held-drive-recovery.json`, also keeps keyboard forward/throttle and aerial pitch held throughout an actual jump/dodge, then requests steering before touchdown. The repaired car responds during partial support and returns to stable support at1.992s. The same10.4.0 sequence does not reach stable support in the3s observation window. Holding forward straight instead returns to stable support at2.083s versus1.983s for10.4.0, so this is not a claim that every landing is faster. Continuous forward remains real pitch input in flight. A separate combined recovery test requires useful partial steering, a supported turn and forward momentum by2.5s, without relaxing penetration limits or forcing an upright pose.

These measurements establish Nivet-to-Nivet controllability/stability under controlled inputs. They are not a substitute for real browser playtesting or the owner's subjective handling judgement. Root release verification records complete browser sequences, authority/prediction checks and hardware conditions separately. The tire/suspension and rounded arena solver remain independent approximations. Support cutoffs, partial-contact tilt damping and body scrape handling are engineering choices calibrated against recoverable play, not transferred simulator constants advertised as fidelity.
