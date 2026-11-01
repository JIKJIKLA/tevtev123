# Dodge and powerslide regression repair

This pass treats the owner's loss-of-control report as the acceptance criterion. The older 10.3.0 implementation is a regression baseline, not an exact proprietary physics specification. No new simulator constants are being used as proof of good handling.

## Reproduced causes

### A finite flip could not finish its rotation

10.4.0 put the ordinary 5.5 rad/s aerial angular cap on a 0.65-second dodge phase. Even at that maximum throughout the phase, the car could rotate only 3.575 radians, approximately 205 degrees. Actual initial acceleration made the sampled rotation slightly smaller at first. Neutral input then damped the remaining rotation. A forward flip from 12 m high ended its phase roof-down: roof-up dot world-up = -0.908 at 0.658 s. At 1.508 s it had still rotated only 5.243 radians. The same controlled 10.3.0 probe completed its rotation by the end of the phase.

The phase also left another 0.3-second pitch lock after rotation control had otherwise returned. At 0.7 seconds a 0.7 pitch pulse produced **zero** angular response in 10.4.0, while yaw and roll already responded. This was an unexplained additional restriction in our different solver, not a validated benefit.

The repair selectively restores the older finite dodge actuator. It initializes the requested local angular axis once, integrates the **current** angular velocity through the finite phase, and never restores angular velocity after a physical collision slows it. It has a separate bounded dodge rate; ordinary flight remains capped at 5.5 rad/s. Pitch cancellation brakes the relevant component without another linear launch. There is no extra post-phase pitch lock.

At completion, 95% of carry spin along the actuator axis is removed. Orthogonal player rotation is preserved. This braking removes unwanted post-flip overspin; it does not slerp the car upright or overwrite its pose. The pose completes a full cycle only for an unopposed voluntary flip. A real collision can interrupt the cycle.

This is an explicit Nivet control model restored and refined for our solver. It is not described as a reproduction of the proprietary dodge torque solver, and it is not a new trick button or a scripted linear trajectory.

### Combined yaw/roll bindings changed or erased the dodge

Previously the lateral dodge input was `yaw + roll`. Equal opposing inputs consumed the dodge with zero direction and zero impulse; matching inputs biased a diagonal toward sideways. Reference games may have intentional stall mechanics involving opposing inputs, but Nivet does not reproduce their complete contact/control behavior. An accidental stall was particularly confusing during ordinary steering and recovery.

Steering now chooses the lateral dodge direction; air roll is a fallback only when steering is neutral. The effective pitch/lateral vector is normalized once. Duplicate or opposing roll bindings cannot silently erase an ordinary steering dodge. This is a deliberate Nivet controllability choice. Roll control itself remains available in flight; exact advanced stall parity is not claimed.

The existing directional speed-dependent linear impulses, shared input threshold, maximum linear speed, gravity and delayed falling-velocity damping are retained. No immediate falling-velocity clamp or hidden aiming force has been restored.

### Grip and yaw authority lingered after powerslide release

The new linear 0.5-second handbrake release did not reproduce the older tire-force recovery curve. After the same 10 m/s forward + 6 m/s lateral test, 10.4.0 still had 1.832 m/s lateral slip at 0.25 seconds after release; 10.3.0 had 0.401 m/s. New handbrake state also continued adding yaw boost after the user had released powerslide.

The repair retains gradual 0.2-second activation, restores the previous exponential grip-recovery response using the existing `gripRelease` value, and applies additional powerslide yaw only while the input is held. Traction returns through bounded tire force. The car's lateral velocity is never canceled instantly. Stable and partial wheel controllers use the same handbrake state.

## Units, axes and ordering audit

- Nivet uses metres, seconds, Y up, local X forward and local Z right. `c.w` is local angular velocity; quaternion rotation postmultiplies its local-axis increment. Ground yaw uses the matching negative world-normal rotation convention.
- The linear dodge direction is constructed in a horizontal forward/right frame. Body pitch cannot accidentally send the nominal forward impulse vertically. Actual airborne boost/throttle still follow the car's body direction.
- Ordinary aerial torque/damping, the 180 kg car mass and body inertia are unchanged. The voluntary finite actuator has its own explicit angular bound; the free-air bound is applied when the phase ends.
- Dodge orientation is integrated exactly once per tick. The outer angular step skips a tick handled by `vehicleFlipStep()`. Translation and rotational arena sweeps remain active, so collisions can change momentum and subsequent rotation.
- Opposite pitch cancels pitch angular velocity. During cancellation the existing yaw/roll air controller is available when there are no wheel constraints. There is no additional pitch restriction after the finite phase.
- Falling-velocity damping is unchanged from 10.4.0: it starts at 0.15 seconds and applies while falling through the active phase; rising-velocity damping ends at 0.21 seconds. It cannot continue after the phase ends. This behavior is retained to isolate the proven control failures; no fresh proprietary-game recording validates its complete trajectory.
- Hull/partial-contact impulses, support transitions and input ownership are audited separately in the contact repair report. The dodge actuator does not override a collision response, and the tests do not guarantee completion through a wall or another car.

## Reproducible measurements

The immutable 10.3.0 HTML has SHA-256 `e603c3f6fa43f807b62929c344d00cf9f2c166dd71f11607ed212b57e67513eb`. The immutable 10.4.0 HTML has SHA-256 `df27e76b66f4cce2998a3a77131363d8ba429118d98e12d6c03d6657ca5c5f87`. The runner never substitutes current source when a baseline is missing.

```powershell
node scripts/measure-dodge-recovery.cjs 10.3 ../../outputs/dodge-control-before-10.3.json
node scripts/measure-dodge-recovery.cjs 10.4 ../../outputs/dodge-control-before-10.4.json
node scripts/measure-dodge-recovery.cjs current ../../outputs/dodge-control-after.json
node --test tests/dodge-recovery.test.cjs
```

The [compact before/after report](measurements/dodge-grip-repair.json) includes the exact probe definitions, control-response samples, effective input directions, isolated slip recovery and combined turn/release/boost sequence. Full traces can be regenerated with the runner. Ground probes start at 10 m/s, jump at t=0, hold jump for 0.1 s, and request a dodge at 0.2 s. Free flips start at 12 m to distinguish the rotation actuator from floor contacts. All runs use default Soccar rules, the Octane body and 120 Hz simulation.

## Selected before/after observations

| Controlled probe |10.3.0|10.4.0|Repaired source|
| --- | ---: | ---: | ---: |
| Neutral front flip, rotation at0.65s |6.283rad|3.530rad|6.283rad|
| Neutral front flip roof-down time,12m test |0.325s|0.700s|0.325s|
| Groundjump/frontflip, first supported landing |1.217s|1.575s|1.367s|
| Groundjump/backflip, first supported landing |1.267s|1.542s|1.375s|
| Groundjump/sideflip, first supported landing |1.258s|1.608s|1.367s|
| Pitch pulse response at0.7s after flip,delta angular rate |0.10059rad/s|0|0.07971rad/s|
| Lateral6m/s slip settling after powerslide release |0.267s|0.317s|0.267s|
| Lateral slip at0.25s after release |0.401m/s|1.832m/s|0.404m/s|
| Combined turn/release residual lateral speed at1s |−3.603m/s|−5.968m/s|−3.881m/s|

These are baseline regression measurements. The isolated flip is unopposed; collision interruptions and continuous pitch inputs are reported separately, not hidden in a single favorable average.

## Validation and intentional test changes

The 8 new behavioral tests pass, alongside all 12 retained/updated vehicle tests (20/20 focused checks). They require an unopposed finite flip to complete its cycle, leave little carry spin, return to supported steering after a normal jump/dodge landing, preserve useful momentum, respond to post-phase pitch/yaw/roll, retain orthogonal control during exit braking, normalize conflicting bindings predictably, and regain useful grip after powerslide release. A combined keyboard-style test keeps forward/pitch held, steers before landing, and requires responsive partial contact followed by an ordinary supported turn. Ordinary aerial angular limits, containment and finite state are still checked.

The grip acceptance gate allows one 30 Hz display frame beyond the measured older 0.267-second recovery for the controlled lateral-slip probe. It also rejects instantaneous velocity flattening. These are player-control regression thresholds, not an assertion of exact external fidelity.

Two previous `vehicle-fidelity` contracts intentionally change: a literal torque-onset/all-dodge-5.5-rad/s assertion becomes finite-cycle completion plus a separate ordinary-aerial bound; the literal linear 0.5-second handbrake state assertion becomes gradual activation and measured tire-force recovery. The duplicate secret-menu dodge regression now checks an actual completed bounded cycle. Momentum, penetration, jump-force, directional impulse, vertical damping and free-air numerical checks are retained. The existing near-floor wheel-reset integration test passes unchanged after the contact repair interrupts inward dodge-axis rotation at actual wheel contact. It was not relaxed to hide the collision defect.

Exact half-flip, speed-flip, stall, flip-reset and proprietary suspension parity remain unproven. Continuous pitch input after a dodge is still intentional aerial input and can change the landing pose. Real browser sequences and multiplayer verification belong to the parent release report; this runner is not a hardware latency or FPS benchmark.
