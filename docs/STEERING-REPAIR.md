# Driving input and steering repair

This is a movement-only investigation of the reported10.5.0 regression. Historical results use immutable10.3.0,10.4.0 and10.5.0 portable builds. Candidate results use current shared source. The complete fixed-step measurements are in [steering-response.json](measurements/steering-response.json). Native browser sequences and deployment acceptance are recorded separately by the release verification report.

## Reproduced cause: an already-held driving key became a new pitch command

The keyboard input mixer assigned the same W/S value to throttle and aerial pitch. This was already true before10.5.0. What changed across recovery implementations was the consequence: keeping accelerate held through an ordinary tap jump could rotate the car into a roof landing, and10.5.0's retained roof contact would then remain uncontrollable through the observation window. The10.4.0 auto-roll path sometimes recovered that pose sooner through a strong additional roll;10.3.0's older contact alignment also recovered it. Neither historical trajectory made the original held-input interpretation a good ordinary-jump contract.

The isolated reproduction starts an upright body0 car at8m/s, holds keyboard-style forward (`thr=1,pitch=1`), and taps jump on zero-based tick12. In10.5.0, pitch starts on that very tick: local Z angular velocity becomes−0.103863rad/s. At0.5s the roof-up value is0.525; by0.75s it is−0.727. Hull/roof contact begins at0.942s. No wheel support or supported recovery returns within the2.5s window. Requesting steering at1.0s adds substantial yaw while the car stays inverted, instead of producing the grounded turn the driver expects.

This also reproduced through real keyboard events in the diagnostic-camera browser run: `outputs/handling-before-jump-diagnostic.json` records the jump at tick55, followed by angular Z velocity−3.311 after32ticks, inversion at tick116 and roof contact at tick160. A later steering request still acted on the inverted body. This establishes the problem independently of chase/ball-camera motion. Exact native input timestamps differ from the fixed solver profile; they are independent observations of the same input sequence, not interchangeable timing measurements.

## Minimal input-intent correction

The keyboard mixer now supplies an explicit `coupledPitch` integer flag. It is1 only when a nonzero digital forward/reverse key, including its arrow/remapped-action alias, actually wins the shared throttle/pitch mixer. Independent controller pitch and the existing touch mixer use0. Opposing W/S keys fall back to the existing analog/touch mixer and do not falsely tag that axis as keyboard input.

While actual wheel support is available, the shared controller remembers the sign of an already-held coupled driving axis in `carriedPitch`. On departure, that same held direction continues supplying driving thrust without adding pitch rotation. Release, a direction change or a non-coupled input clears the remembered sign. A new keyboard press while airborne supplies full aerial pitch. Yaw and roll remain available; no blanket airborne damping, automatic upright pose, extra tire force or extra jump reset is used to obtain the improvement.

Raw directional inputs still reach dodge classification and opposite-pitch flip cancellation. Holding W and pressing the second jump still selects a front dodge. The remembered driving input prevents additional inherited pitch after that finite flip finishes. The settings help text explains release/repress for intentional aerial pitch. This is an explicit keyboard usability choice for Nivet, not a claim that the proprietary game uses this policy.

`carriedPitch` is a persistent solver value in `{−1,0,1}` and is included in authoritative driver packets and reconciliation. `coupledPitch` is carried in input histories and transmitted frames; the server accepts only exact0/1 values, defaults omitted metadata to0, and rejects booleans, strings, negative or fractional values. Bots clear keyboard-origin metadata when taking over a car. Source, offline simulation, authority and prediction use the same helper; release/repress intent is not reconstructed from a rendered pose or delayed snapshot.

## Measured effect

All times below are seconds from the common scenario start. The jump begins after0.1s of driving. Recovery requires actual three-or-more-wheel support, reported grounded control and roof-up greater than0.95. Older one-wheel full-ground behavior is recorded in the raw events but does not count as equivalent stable recovery.

| Identical keyboard scenario |10.3.0 |10.4.0 |10.5.0 |Repair |
| --- | ---: | ---: | ---: | ---: |
| Tap jump, forward held: stable recovery |1.975 |1.458 |None within2.5s |1.075 |
| Held jump, forward held: stable recovery |None within2.5s |1.950 |2.417 |1.825 |
| Tap jump, forward held, steer at1.0s |2.000 |1.450 |None within2.5s |1.075 |
| Front flip, forward held, then steer |1.092 |2.033 |2.150 |1.375 |

The repaired tap/held ordinary jumps retain roof-up1 throughout these flat-start profiles and spend116/206ticks in genuine airborne control. Those unsupported ticks receive no tire traction. The repair therefore changes input interpretation rather than hiding the failure with phantom grip. A fresh press after release in flight begins real pitch on tick36, with the same initial response as the original air controller. A fresh keyboard press that starts already airborne also matches the independent controller axis exactly. Intentionally sustained independent pitch can still invert the car; it is preserved as requested control, not scored as an ordinary-driving failure.

The front-flip repair remains slower to stable support than10.3.0 in this fixture. It is substantially better than10.5.0 while retaining the finite flip, impact interruptions and deliberate cancellation. These cases do not establish that every possible recovery is faster or easier.

## Findings that did not justify tuning

Low-, medium- and high-speed continuous turns on a flat field were identical across10.3.0,10.4.0 and10.5.0. In the initial3/8/14/20m/s investigation, all360ticks stayed on four wheels with roof-up1; maximum ordinary lateral slip was approximately0.257m/s, or0.333m/s at20m/s. The candidate preserves those ground steering, yaw and tire-force responses. Broader maximum-grip, speed or curvature changes would therefore change a working baseline without addressing the reproduced jump failure.

Powerslide release while continuing to turn likewise retains10.5.0's existing force and steering curves. In the measured0.6s slide followed by half steering, lateral slip0.25s after release is−8.466m/s in both10.5.0 and the candidate, versus−8.329m/s in10.3.0 and−10.018m/s in10.4.0. This is a high-slip continuing turn, not a neutral coast. The finite tire force reduces slip afterward; release never erases lateral velocity in one tick. No new grip or powerslide coefficient was introduced by this input correction. Whether another desired powerslide feel needs tuning remains a separate, user-visible hypothesis rather than a claimed repaired regression.

The contact-continuity investigation owns loaded-wheel support and angular-transfer checks. This report does not claim that all unexplained spin was caused by duplicated yaw state or that all numerical support misses are fixed by remembering a key. Both must be evaluated independently.

## Regression checks and limits

The new focused checks exercise actual human input mixing, tap/held keyboard jumps, real unsupported flight, immediate supported steering, fresh airborne presses, independent controller pitch, raw front-dodge selection/cancellation, driver-state validation,30/60/120Hz display grouping, ordinary low/medium/high turning, powerslide release and brake/reverse direction. Two isolated authority/prediction checks restore an airborne snapshot carrying keyboard intent and replay60pending inputs, including a deliberately corrupted local intent/pose. Car pose, linear/angular velocity, supported yaw and ball state converge exactly. Independent pitch remains active through its own snapshot/replay case.

At this stage, the focused command passes15tests:

~~~powershell
node --test tests/coupled-pitch.test.cjs tests/coupled-pitch-network.test.cjs tests/steering-response.test.cjs server/test/coupled-pitch.test.cjs
node scripts/measure-steering-response.cjs 10.3,10.4,10.5,current docs/measurements/steering-response.json
~~~

The historical command requires the three immutable baseline directories under `outputs`; it fails clearly if one is missing. The runner records controller trajectories without rendering, screen input latency or subjective handling judgement. Complete native browser driving sequences, controller availability, whole-game/server regressions, source freeze and deployment checks are release gates outside these component tests. Physical controller hardware and Chromebook performance are not established by synthetic controller-axis inputs or desktop keyboard checks.
