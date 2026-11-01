# Nivet League 10.5.0 — Grip

This release repairs the reported10.4.0 handling regression before adding features. Original audio, assets, matte paint, dense painted turf, blue/orange matches and velvet menus remain. The source, native desktop sequences, paired renderer profiles and three viewport layouts have been checked; Phoenix multiplayer is running the same repaired solver.

## Reproduced failures and repairs

- **Partial wheel contacts lost input.** 10.4.0 required three wheels for driving and zero wheels for ordinary aerial control. Actual one/two-wheel landings could therefore lose both controllers while automatic contact torque continued. The replacement gives aligned partial support its own limited tire controller, preserves turning momentum across support changes, and uses the measured wheel normal. Real jumps and wall departures receive aerial control without phantom traction. Stable three/four-wheel driving is retained.
- **A voluntary flip could not finish.** Applying the 5.5 rad/s free-air cap throughout a 0.65-second dodge permitted only about 205° of rotation. The extra 0.3-second pitch lock then suppressed correction. The repaired finite dodge actuator selectively restores the older complete rotation, preserves collision interruptions and orthogonal input, and releases pitch at phase completion. Ordinary flight retains its angular cap. Conflicting roll/yaw bindings no longer erase an ordinary steering dodge.
- **Powerslide authority lingered.** Grip now recovers through the older exponential tire-force curve, while additional slide yaw ends when the button is released. Slip is reduced by bounded tire force, without instant velocity cancellation.
- **Camera state flickered independently of physics.** A close ball no longer switches heading at the two-metre cutoff. Actual aligned partial wall support no longer makes an unchanged physical pose alternately enter and leave wall framing. Saved camera settings remain valid.
- **Low-speed contact could add recovery motion.** Resting hull scrapes are inelastic; stronger impacts retain restitution. Throttle-driven side recovery yields to explicit rotation. Actual inward tire contact can interrupt the dodge-axis actuator without granting an early jump reset or snapping the car upright.

Detailed implementation, retained behavior and caveats: [contact control](CONTROL-REPAIR.md), [dodge/grip](DODGE-REPAIR.md), [visual repair](VISUAL-REPAIR.md). Handling, camera and rendering changes remain separately reviewable.

## Controlled regression evidence

Identical probes use immutable 10.3.0 and 10.4.0 builds. These are Nivet-to-Nivet measurements, not proprietary-game parity claims.

| Probe |10.4.0 |Repaired source |
| --- | ---: | ---: |
| Two-wheel time without an ordinary controller |0.200s |0s |
| One-wheel time without an ordinary controller |0.267s |0s |
| Brief support loss: return to stable support |0.692s |0.100s |
| Diagonal landing: return to stable support |0.958s |0.525s |
| Ground jump/front flip: supported landing |1.575s |1.367s |
| Neutral flip roof-down time,12m probe |0.700s |0.325s |
| Lateral slip0.25s after powerslide release |1.832m/s |0.404m/s |
| Close-ball heading jump, identical prescribed pose |7.609°/tick |<0.000001°/tick |
| Partial-wall camera drift, unchanged physical pose |2.718m |<0.000001m |

The side-landing fixture reaches stable support in0.642s rather than10.4.0's0.508s, while retaining input throughout. Full support is not accelerated in every scenario. The [raw contact](measurements/contact-control.json), [dodge/grip](measurements/dodge-grip-repair.json) and [camera](measurements/recovery-camera.json) reports preserve conditions and exceptions.

## Presentation and verification status

The visual pass changes actual material response and lighting: more readable chassis/trim/tire diffuse response under the matte paint, stronger neutral fill, clearer goal interiors and lighter scoped roof steel, restrained ball connector emission, and quieter photographic turf/grass luminance. Existing geometry, grass density, light and shadow budgets are retained. Center-field and garage before/after metadata matches exactly at1280×720, DPR1 and Chromebook preset. Compact training controls and separated lower-left HUD elements address crowding. Actual DOM checks at1280×720 keyboard,390×844 portrait touch and844×390 landscape touch confirm the training row stays at32/28px and the named chat/training/camera/thumbstick groups remain separated.

The final source suites passed **317 frontend checks and34 dedicated-server checks,351 total**. They include actual partial-wheel authority/prediction reconstruction, contact transitions, dodge recovery and isolated camera tests. The [network report](measurements/recovery-network.json) covers20 synthetic shared-solver profiles: all drained inputs converge, the12 zero-uplink profiles match exactly, and maximum pending history is48. The adverse hard-touch correction can still reach0.795m; no general latency improvement is claimed.

An additional [continuous-input recovery probe](measurements/held-drive-recovery.json) keeps forward input held after a jump/dodge, then adds steering. The repaired car reaches stable support at1.992s and is upright, supported and turning at2.5s. In the identical10.4.0 run, stable support was not reached and the car remained on two wheels at2.5s. Holding forward without steering reaches stable support at2.083s rather than10.4.0's1.983s; the improvement is continuous usable control, not a universal faster-landing claim. This controlled test remains separate from native browser input acceptance.

The four required native keyboard sequences were completed in a desktop browser using developer initial-pose setup followed by production simulation: two new ball touches with turning between them; powerslide→jump→landing→steering; actual supported wall drive→jump/air-roll/yaw→field landing; and dodge→supported recovery→new ball challenge. All four ended upright and supported, with no captured console errors. Initial incomplete attempts are retained in the [actual browser report](measurements/browser-control.json); staged poses are not presented as normal-menu or physical Chromebook certification.

The [six paired rendering profiles](measurements/render-repair.json) use the same1280×720 Chromebook-preset desktop workload. Median CPU differences are at most0.20ms and median GPU differences at most0.145ms, with unchanged median draw/triangle counts. Tail timings are mixed, including higher GPU p95 in normal/boost/goal views; no general FPS gain is claimed. [Verification details](VERIFICATION-10.5.0.md) preserve exact conditions, measured tails and hardware limits.

The release uses gameplay protocol6 and dedicated wire3 so old clients reload instead of predicting with different handling. No additional persistent physics state is required; existing support, angular velocity, yaw, handbrake and dodge fields remain shared by authority/offline/prediction. Developer force/contact instrumentation is opt-in and absent from the normal player HUD.

## Remaining limits

The tire/suspension and analytic rounded-arena solver remain approximations. Exact half-flip, speed-flip, stall, flip-reset and proprietary camera/engine parity are unproven. Continuous held pitch after a dodge is intentional aerial input and can alter the landing. Local prediction cannot know future remote inputs. Synthetic application snapshot scheduling does not measure real packet loss or population RTT. Physical Chromebook, phone and controller hardware are unavailable; desktop timings and keyboard playtests must not be presented as their certification.

## Publication receipt

The accepted portable HTML is20,994,439bytes with SHA-256 `d5911fc1b05043d27533ca0cc2dd998318647777de543cce4a60e9b55eb73021`. Phoenix production is10.5.0/wire3 at120Hz with30Hz snapshots. All49 staged source hashes match production. Actual TLS WebSocket lifecycle and custom-paint checks passed, and the service returned to zero rooms with zero dropped ticks. The deployment required an idle10.4.0 server and retained rollback archive `/home/ubuntu/tevin-before-grip-10.5.0-20261101T175158Z.tar.gz`. The single237ms application ping from this test connection is not a Las Vegas population latency measurement.

The source/build commit is [82b31caea82f40529d5697b6350d971dad306a6f](https://github.com/JIKJIKLA/tevtev123/commit/82b31caea82f40529d5697b6350d971dad306a6f). Both [Verify game](https://github.com/JIKJIKLA/tevtev123/actions/runs/41334286259) and [Pages deployment](https://github.com/JIKJIKLA/tevtev123/actions/runs/41334285714) succeeded. Exact root-document byte/SHA-256 matches were independently fetched from [Pages](https://jikjikla.github.io/tevtev123/), [Bunny](https://tevtev123.b-cdn.net/) and [Cloudflare](https://nivet-league.jikdifn.workers.dev/). Bunny refreshed through normal cache expiry; its actual root GET returned the final document with cache status EXPIRED at18:11:07UTC. No cache-busting copy was substituted for this check.

Cloudflare version `a1537e2c-834c-47e3-8e10-e93582aaca06` is active at100% in deployment `40c7ef91-e2be-4cd7-9095-d572b79f7d91`. Worker source ETag remains `d453c4d08ccfd917365ea1922c91713a722d569c284b351bf6c152972f97d2f7`; only assets/build metadata changed. GET/HEAD/health/release metadata and404 behavior were checked. The actual published Cloudflare game also completed a private Phoenix create/start-with-AI/countdown/native-driving/pause/quit flow with no captured console errors; cleanup left zero rooms and zero dropped ticks. [Compact publication data](measurements/release-10.5.0.json) preserves conditions and limits.

Existing services/plans remain; no new ports, subscriptions or paid resources were added. The source package excludes private keys, dependency trees and unrelated local scratch files; each archived file is SHA-256 compared with staged source. Final ZIP hash is recorded externally after receipt refresh to avoid a self-referential archive hash.
