# Contact continuity in the movement repair

This work changes handling only. No field, car material, lighting, ball coefficient, camera setting or effect constant is changed here. The independent keyboard-intent work addresses a drive key being interpreted as a pitch command after departure; this report isolates the contact decision and angular stores.

## Reproduced contact failure

`scripts/measure-contact-continuity.cjs` loads the immutable10.3.0,10.4.0 and10.5.0 HTML baselines and the current expanded source. A local diagnostic copy observes support normals, actual tyre-tip signed distances, incoming velocity, alignment and the chosen controller. That copy adds observation only; it does not change force, position, orientation or input.

An actual wall-to-floor run starts at x40.7749m/y8m with four supported tyres, velocity23m/s down the wall, no jump and held reverse/drive pitch. In10.5.0, the ordinary wheel controller changes to free flight at these zero-based fixed ticks:

| Tick | Tyres sampled | Alignment | Center outward speed | Minimum actual tyre gap | Result |
| --- | ---: | ---: | ---: | ---: | --- |
|23 |4 |0.999590 |2.065704m/s |0.200mm |AIR; drive input adds pitch |
|24 |4 |Close to support |Above the1m/s gate |Within loaded-tip range |AIR again |
|42 |4 |0.998097 |2.032243m/s |0.200mm |AIR; drive input adds pitch |

The first two AIR samples introduce0.207727rad/s of pitch even though the player is driving around a supported curve. Three/four tyres and excellent alignment were insufficient: center outward velocity alone vetoed support. That velocity is not a sufficient release test for a long rigid chassis constrained by different rounded-surface probe normals. The exact contribution of each prior linear projection is not isolated here, so a claim that one specific impulse is the sole generator would be a remaining hypothesis. The contradictory center-speed/contact decision itself is directly measured.

Moving the existing normal-frame transport before that gate was tested and rejected. At tick23, the old-normal and transported outward speeds are both2.716470m/s, greater than the original2.065704m/s. At tick42 they are3.154725m/s. Reordering transport alone therefore does not solve this failure.

## Small contact correction

The existing support sampler now also computes the minimum signed distance among its accepted tyre samples, named `supportGap`. It is freshly derived from geometry on every sample. It is not a new memory, adhesion timer, pose target or serialized solver state.

The usual alignment, actual wheel count and jump-lock conditions remain. Center outward speed below1m/s still permits ordinary suspension support. When a sampled tyre is already within the existing15mm suspension rest gap, it can establish loaded contact despite a misleading center-speed veto. The15mm value is the existing rest target; no larger reach, normal-velocity threshold or collision envelope is introduced. Three wheels remain necessary for the full ground controller, and one/two-wheel contacts retain the distinct limited controller.

The corrected wall return has **zero loaded four-wheel AIR samples**, compared with three in10.5.0. One later AIR sample is allowed because the tyres actually extend beyond the rest gap. The integrated trajectory changes slightly, so its tick is39 rather than an assumed replay of the old42. Holding the already active keyboard drive key through this release adds no pitch under the separate input-intent rule. Zero angular pitch is observed for the complete corrected wall-return trace.

The correction does not attach a clearly departing car to a phantom surface:

- Four tyre rays90mm above a flat surface and moving outward at5m/s select AIR immediately, with zero traction; no tyre rays remain the next tick.
- A car10mm above the surface with the same5m/s outgoing velocity receives one loaded-contact tick, then releases at a48.889mm gap. Tyre reach is exhausted by the fourth sample; no traction remains.
- A deliberate jump selects AIR and relinquishes traction on the same tick, even while three/four sampled tyre rays remain close. Jump lock is not bypassed.
- A brief1.2m/s upward bounce while already driving still contains real AIR samples and zero traction in them. The input-intent policy prevents those samples from injecting unwanted keyboard pitch; it does not create ground force in the air.

The upper wall/ceiling transition also remains capable of release. It is not held upright or glued to the ceiling. Its loaded AIR samples fall from two to zero, while an actual extended-tyre AIR sample remains. Peak angular rate decreases from5.383733 to1.193791rad/s in this held-drive case, rather than being forcibly clamped to zero.

## Angular-store audit

No new duplication or sign error was reproduced in10.5.0's `wy`/`w` conversion. Those conversions are retained.

| Stage | Angular representation and action |
| --- | --- |
| Stable wheels | Supported yaw is `wy`, about the negative support normal. The local free-body vector `w` is zero. |
| Stable→partial/air | The previous supported yaw is transformed into the current local frame and added once when the previous stable flag is true. |
| Partial | Local `w` is authoritative; tire yaw and tangent-axis control operate on that vector. `wy` is a derived normal-axis value. |
| Air→partial | No supported-yaw addition runs because the previous stable flag is false. |
| Partial/air→stable | Supported yaw is projected from local `w` in the current frame. Ground integration then clears the free-body vector. |
| Grounded car/ball contact | The existing contact helpers read `-normal*wy` and update supported yaw. Free-body contacts transform local `w`. |

The explicit state-store test repeats stable→partial→air→partial→stable six times, for all three body profiles on the floor and wall. Pose setup preserves the pre-existing world angular motion and never writes both representations at once. Gravity, tire-yaw motor torque and aerial motor torque are disabled only for this analytic audit; partial suspension tilt remains enabled. Maximum yaw deviation from1.2rad/s is7.8e−15rad/s in both10.5.0 and the repair. Stable samples keep `w=0`. This is a coordinate/store audit, not an actual driving trajectory or subjective handling claim.

The same audit exposes lost yaw in the older10.3.0/10.4.0 air departure, reaching a1.2rad/s error. That older defect is not restored merely because other older handling was preferable.

A separate horizontal-plane contact test presents equivalent stable and airborne angular motion to the existing impulse helper. It reads9.64m/s approach speed, including supported yaw at the contact point, and produces equal car/ball translation and yaw response with the same sign. Ball coefficients and response code remain unchanged.

The model still treats supported pitch/roll as constraint alignment rather than stored free-body angular motion. Kinematic pitch/roll from normal-frame transport is not represented as an extra contact-point angular velocity in the existing car/ball helpers. The planar test does not certify that separate curved-contact approximation. It was not demonstrated as the cause of the ordinary held-key failure, and changing ball/contact tuning is outside this focused repair.

## Orientation mechanisms and ownership

| Mechanism | When it can run | Interaction checked |
| --- | --- | --- |
| Hull projection/impulse | Before support sampling and during the bounded rotation/translation sweep | Supported projection uses the linear constraint; free-body hull contact uses local angular state. No new response is added. |
| Normal-frame transport | Stable support with a coherent previous support normal | Existing pose/tangent-velocity transport remains in its original location. It is not repeated by the gap exception. |
| Stable surface alignment | Full ground branch | Existing supported alignment and yaw run together; the local free-body vector is cleared. |
| Partial suspension tilt | Partial branch, no explicit roll/uncoupled pitch | It does not run simultaneously with full ground alignment or hull auto-roll. |
| Player air control | Air/hull branch outside an active flip | Fresh pitch remains active; only inherited coupled keyboard pitch is filtered by the separate intent policy. |
| Automatic rolling | Actual hull contact, zero sampled wheels, throttle intent, no explicit competing rotation | Existing bounded side recovery remains; neutral roof contact does not gain a pose target. |
| Automatic flip | Explicit jump request while qualifying hull-supported | It owns that tick's actuator; ordinary flip/air branches are excluded. |
| Dodge and tyre stop | Explicit dodge phase; inward actual tyre constraint may stop only its actuator axis | Raw direction and opposite-pitch cancellation remain. Generic orientation integration does not repeat the flip's own integration. |

The160 deterministic corner-landing search cases did not reproduce a stable sample carrying a conflicting nonzero free-body angular store. That search and the analytic cycles do not prove every collision manifold correct. They give no basis for adding another angular conversion, upright correction or damping layer. Existing hull, side-recovery, jump-reset and dodge-contact tests are retained.

## Regression evidence and boundaries

Seven tests in `tests/contact-continuity.test.cjs` cover the loaded curve counterexample, actual departure/no phantom jump traction, bounce input continuity, all three bodies across8/14/23m/s wall returns, repeated angular-store cycles, contact-point angular signs, and exact agreement under30/60/120Hz render grouping. They require actual supported return and useful driving momentum, not merely a final upright pose.

The separate25 existing contact/car-contact/dodge checks passed after the first integrated candidate, including the six-playlist/roster soak and unchanged real tyre/dodge-reset constraint. New input-intent and authority/prediction checks are recorded by that work's report and the final release validation.

Reproduce from the game directory:

~~~powershell
node scripts/measure-contact-continuity.cjs all docs/measurements/contact-continuity.json
node --test tests/contact-continuity.test.cjs tests/contact-transitions.test.cjs tests/car-contact.test.cjs tests/dodge-recovery.test.cjs
~~~

The historical measurement command requires the three frozen baseline HTML files under the local outputs directory. Current regression tests do not require historical archives or network access. `current` expands current source independently of the portable build, and records its exact source SHA-256. Diagnostic HTML copies are local development artifacts.

These probes identify and constrain Nivet regressions. They do not certify the proprietary game's dynamics or replace complete native-input browser playtests. Real controller hardware and the owner's subjective control judgement require separate verification. Remaining brief geometric departures are reported rather than hidden by contact latching or camera smoothing.
