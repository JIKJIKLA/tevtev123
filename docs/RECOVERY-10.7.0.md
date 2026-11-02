# Nivet League 10.7.0 — Recovery

This release addresses awkward-contact control, wall escape, keyboard pitch and Heatseeker defense. It does not claim exact Rocket League parity. Graphics, cosmetics, presentation, sounds, ball forces, ball/car collision tuning and arena dimensions are unchanged. The 93-file frozen visual/asset/ball manifest matches the verified 10.6.0 baseline byte for byte.

## Confirmed causes

- A three-wheel boolean gated several unrelated actions. Two useful tire contacts could not jump with an exhausted dodge, despite a valid support normal. Partial driving scaled authority by contact count and lacked the stable branch's normal spring/damping.
- On the reproduced tilted wall, each gravity step introduced a tiny reverse velocity. The partial-contact braking branch stopped it, but discarded the remaining engine time every step. This explains the measured stall; it is not proof of every possible wall issue.
- Collision angular response depended on last frame's `wasG`. Recovery excluded wall normals using world-up. Competing controllers could treat partially supported cars as ordinary airborne cars.
- The held-key `carriedPitch` latch suppressed W/S pitch after a deliberate jump. The same hidden policy was transmitted over the network.
- Heatseeker inherited Soccar attack/claim behavior: straight-line SAVE replacement, drive-through defensive waypoints, no stationary hold, world-up recovery and later SUPPORT/yield overrides of emergency saves.

## Contact, jump and recovery rules

Four real tire samples measure distance, compression, compatible normals and contact-point velocity including angular motion. A compatible manifold supplies continuous tire load, suspension force and a navigation frame. Two compressed tires can have useful drive/brake/steer authority. A floor and perpendicular goalpost cannot combine into an imaginary supporting slope.

Surface support, stable angular constraint, escape eligibility and landing reset are separate. An actual paired, spanning, nonseparating loaded contact can jump outward along the supporting normal, including a wall, even with an exhausted dodge. It immediately releases tire support and does not refund that dodge. A one-wheel graze cannot grant a reset. Restoring airborne resources requires compatible, aligned, low-speed paired support for 50 ms.

An exhausted-air jump request can wait up to 80 ms for usable support, then expires. An available airborne second jump/dodge still executes immediately. Repeated clear-air presses cannot create extra impulses. Explicit roof/side chassis recovery uses the actual surface normal and a bounded rotation motor (at most 0.9 s); explicit rotation input cancels that assistance. There is no teleport, periodic unstuck force or permanent forced-upright pose.

W/S drives on supported tires and pitches immediately in deliberate airborne motion. Releasing and pressing W again is unnecessary. The invisible pitch latch and its wire fields are removed. Controller axes retain the same ordinary pitch semantics.

## Heatseeker

A distinct planner handles serve, defend, intercept/save, cover, reposition and recovery. All bots use the existing curved ball integrator, including homing, gravity and backboard returns. The shared four-second forecast refreshes at 12.5 Hz, with immediate invalidation on touches, homing changes, changed availability and unexpected motion. It does not mutate live ball state.

Goal-opening crossings and turn/travel/jump/aerial reachability select one primary interceptor. A short role lease reduces assignment churn; unavailable, demolished, recovering or unreachable owners release responsibility. Other teammates use separate cover lanes. A human's actual motion or reachable claim contributes to coverage; an idle human cannot silently reserve the only emergency save. Emergency saves survive generic claim/yield decoration.

The shared driving controller brakes, reverses, stops and holds when appropriate. SAVE is not a full-speed attack. Bots use actual tire support normals and recover with ordinary legal controls. Soccar retains its own tactical path and has a separate regression suite.

## Before/after measurements

The immutable baseline is the verified 10.6.0 source and portable build. Paired scenarios use identical poses, input mapper, 120 Hz steps, initial shots, teams and difficulties; no shot weakening or ball retuning.

| Reproduction (body 0) | 10.6.0 | 10.7.0 |
|---|---:|---:|
| Two-wheel spent-dodge jump, immediate outward speed | -0.0533 m/s, ignored | 2.9599 m/s, 0.12 s release lock |
| Tilted-wall throttle displacement in one second | 0.0396 m | 3.5393 m |
| Same wall, jump on tick 12 | Identical to no-jump trajectory | 2.9545 m/s outward; 2.6971 m maximum departure |
| Defender stationary at its holding target | Throttle 1 | Throttle 0 |
| Emergency SAVE with a teammate claim/yield | Overwritten to SUPPORT | Retained as SAVE |

All three bodies have the focused reproductions. The plane-wall matrix covers 2,268 cases per version: four walls, three bodies, seven nominal contact poses, uphill/downhill/sideways headings and nine actions. Stationary drive cases fall from 48 to zero. Accepted explicit escapes increase from 72/252 to 216/252; one-wheel/unsupported requests remain intentionally restricted. A separate 3,402-case-per-version matrix covers floor ramps, ceiling ramps, vertical rounded corners and goal side/roof/back surfaces with the same bodies, poses, headings and actions. Both matrices retain every result, including natural falls and misses. Neither matrix proves every possible contact is solved. Maximum penetration stays below 0.5 mm, with no nonfinite states or groups lacking all measured movement/escape options.

| 72 identical seeded Heatseeker shot scenarios | Before | Integrated update | AI-only on frozen old physics |
|---|---:|---:|---:|
| Physical defensive touches | 14 | 87 | 90 |
| Goals conceded | 58 | 33 | 30 |
| Double-commit seconds | 86.83 | 0 | 0 |
| Mean outgoing defensive-position error | 16.32 m | 5.51 m | 5.45 m |
| Raw low-speed contact time away from target | 7.67 car-s | 10.53 car-s | 6.27 car-s |
| Same low-speed time / exposure | 1.97% | 1.34% | 0.77% |
| Raw role switches | 188 | 268 | 278 |
| Role switches per defender-car minute | 28.93 | 20.44 | 20.52 |

Longer rallies increase exposure from 389.89 to 786.65 defender-car seconds. Raw low-speed time includes startup/braking and is not a persistent-stall diagnosis. Raw role switches increase; the exposure-normalized rate decreases. The AI-only comparison isolates tactical changes from vehicle changes. It performs somewhat better on this small suite than the integrated update, so these are measured improvements with remaining misses, not a perfect-save claim. All three source fingerprints stayed stable during the final run.

## Validation and intentional test changes

- 375/375 client tests and 35/35 server tests pass. Focused mechanics, resource/exploit, containment, frame grouping, Soccar and Heatseeker checks are included.
- Network recovery tests cover six awkward states across all bodies, rosters and both playlists (108 reconstruction profiles), saved unacknowledged-input replay, buffer expiry, strict state validation, authority bot execution and display-frame grouping. Additional native-key network measurements cover 14 scenarios: maximum vector/resource/ball error 0, quaternion roundoff at most 4.22e-8 radians.
- Old expectations that every sub-three-wheel contact rejects a jump, three tips instantly refund a dodge, or held W must be latched at zero pitch were deliberately replaced by geometric support, finite landing dwell and immediate intentional pitch assertions. Penetration, determinism and resource bounds remain protected.
- A new role-reassignment test initially put its backups too far away to physically arrive. Its replacement setup places each backup within reach; the separate unreachable-shot test continues to require no futile jump/boost loop.

Native browser keyboard sequences recorded awkward landing → jump → steer, wall climb/coast/reverse → jump away, real curved-corner two-tire drive → jump → floor recovery, human-versus-bot Heatseeker and a six-car match with five bots. The human 1v1 return was physically touched and returned by the bot, which then scored; the earlier baseline bot missed its return. The 3v3 candidate sample still conceded its first high return, while the baseline sample lasted through more touches. This adverse sample is retained alongside the larger seeded suite.

These use developer-only initial-scene buttons and production simulation thereafter. Full keyboard/state histories are packaged as verification evidence. The initial awkward two-tire pose settled to four tires before that browser jump; the genuine two-tire corner jump and one-tick automated spent-dodge reproduction provide the partial-contact evidence. Browser background throttling affected wall-clock timing and prevented new screenshots during part of the run; simulation tick/input histories, not requested hold durations, determine the claims. This is not a complete normal-speed feel assessment. No physical Chromebook, hardware controller or two-human internet playtest was available. Internet socket lifecycle checks and synthetic reconciliation do not prove real-world latency or subjective feel.

## Delivery contract

Client protocol 8 and dedicated wire 5 carry bounded `supportTime` and `jumpBuffer`; geometry-derived contact load is resampled. Retired latch fields are not accepted as control/state inputs. Publish the matching client/server together; stale clients must reload. Deployment status, source/build hashes, CI and host checks are recorded separately in `measurements/release-10.7.0.json` after publication. No new service, paid resource, dependency, account or firewall change is required.
