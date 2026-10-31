# Vehicle fidelity: 10.4.0

Baseline is Nivet 10.3.0, implementation commit `12bba0aec9e3ed9791253a45ae48ed2fa6400382`. Its separately archived HTML has SHA-256 `e603c3f6fa43f807b62929c344d00cf9f2c166dd71f11607ed212b57e67513eb`. [Before](measurements/vehicle-before.json) and [after](measurements/vehicle-after.json) contain identical deterministic fixture inputs, full state samples and combined-input trajectories. These compare Nivet versions, not controlled recordings of Rocket League. No proprietary executable or fresh reference recording was available.

## Evidence and conventions

- [Samuel Mish's original ground-control measurements](https://www.smish.dev/rocket_league/ground_control/) support the existing speed-dependent acceleration and steering curves, braking and coasting. Those working curves were retained.
- [RLBot's jump measurements](https://wiki.rlbot.org/v4/botmaking/jumping-physics/) independently describe the approximately 292 UU/s initial jump, 1460 UU/s² hold bonus, three mandatory hold/sticky ticks, airborne throttle and 1.25–1.45-second second-jump window. These rounded experimental values differ slightly from the simulator constants below; this release preserves the measured model already used in Nivet rather than mixing competing precisions.
- [RocketSim constants at c2baacb8f4b441dd8505e63c2aeb5a1679b60b02](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/RLConst.h) and [its car implementation at that revision](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/Sim/Car/Car.cpp) corroborate dodge speed scaling, the L1 dodge threshold, delayed vertical damping, handbrake rise/fall, angular limit, throttle contact autoroll and explicit roof-jump autoflip. The source itself marks autoflip accuracy as incomplete. It is a community approximation, not the proprietary specification.
- [RLUtilities car simulation at eb887b312e33136b27a64516179ea812c366c2fa](https://github.com/samuelpmish/RLUtilities/blob/eb887b312e33136b27a64516179ea812c366c2fa/src/simulation/car.cc) is the earlier independent dodge/control model cited by RocketSim. Nivet implements the mechanics independently; neither simulator's physics engine is incorporated.

Nivet uses metres, seconds, kilograms and radians; world Y is up, local +X is forward and +Z is right. Convert UU positions, speeds and accelerations by 0.01, not angular rates. The world-axis mapping `(x,y,z)→(x,z,y)` is a reflection: recorded angular vectors need the negative permutation. Tests operate directly in Nivet axes and do not transfer raw recorded spin samples. Simulation is fixed at 120 Hz.

## Changes and measured results

| Mechanic / controlled condition | 10.3.0 | 10.4.0 | Evidence and interpretation |
| --- | --- | --- | --- |
| Throttle acceleration at 0 / 5 / 10 / 14 m/s | 16 / 10.857143 / 5.714286 / 1.6 m/s² | Identical | Retained independently measured ground curve |
| Coasting from 10 m/s, after 1 s | 4.75 m/s | Identical | Retained 5.25 m/s² coast |
| Braking from 10 m/s, after 0.25 s | 1.25 m/s | Identical | Retained 35 m/s² brake |
| Airborne forward / reverse throttle | +0.666667 / −0.333333 m/s² | Identical | Retained RLBot measured values |
| Flat held jump peak position / time | 2.433013 m / 0.883333 s | Identical | Independently integrated gravity/hold/sticky sequence; position is world car origin, not height above resting wheels |
| Falling forward dodge, starting vy=−6 m/s, first tick | vy=0 | vy=−6.054167 m/s | Removes instantaneous fall deletion; 0.35 damping per 120 Hz tick begins at 0.15 s, with the 0.21 s rising cutoff |
| Back dodge at forward 10 m/s, first-tick vx | 5 m/s | 1.188406 m/s | Direction/speed-dependent reverse impulse; this fixture includes normal gravity |
| Side dodge at forward 10 m/s, first-tick vz | 5 m/s | 6.956522 m/s | Speed-dependent side factor |
| Forward dodge first-tick angular speed | 9.666439 rad/s | 1.866667 rad/s | Torque-based onset; all subsequent aerial/dodge rates obey 5.5 rad/s cap |
| Pitch input 0.3 plus second jump | Directional flip | Neutral second jump | Shared L1 threshold 0.5, including roll; diagonal combined inputs still qualify |
| Roll-only input 1 plus second jump | Neutral second jump | Side dodge | Roll participates in the documented dodge direction |
| Handbrake input rise / release | Immediate grip target | 0.2 s / 0.5 s analog state | Pinned simulator rates 5 and 2 per second; the underlying Nivet tire/grip model remains approximate |
| Neutral roof after 2 s | Automatically upright | Still roof-down | Removes passive pose preference; explicit roof-jump recovery remains available |
| Sideways powerslide landing, vx after 1 s | 5.811161 m/s | 7.158333 m/s | Nivet regression trace, not an externally calibrated landing target |

Air-control coefficients now derive from the pinned angular scale `2π×1000/65536` and pitch/yaw/roll torque/damping factors instead of separately rounded decimals. The measured 0.7-pitch half-second trace changes only slightly (−3.556327 to −3.553383 rad/s). This is numerical model agreement, not evidence of a perceptible fidelity improvement by itself.

Hull collisions now use contact-point normal velocity and mass/inertia response rather than leaving angular motion unconstrained while projecting the chassis out of the arena. Neutral side poses can naturally topple according to geometry and gravity; there is no timer that selects an upright orientation. Throttle can produce reference-supported contact torque. A deliberate roof jump applies a bounded impulse and roll torque. Wheel-supported surface alignment and curved-surface momentum transport remain numerical constraints.

Only renewed support by at least three wheels resets jump/dodge state. Driving off a surface does not start the initial-jump expiry timer. Standard near-floor dodge plus wheel contact produces a tested wavedash reset without a special movement button. Contact with the ball does not currently create wheel suspension support, so full flip resets are not claimed.

## Validation and limits

`node --test tests/vehicle-fidelity.test.cjs tests/car-contact.test.cjs` passes **19 tests**: 12 focused numerical/integration tests and 7 contact regressions/stability tests. The final contact soak runs both playlists and all three roster sizes for 720 fixed ticks per configuration. The source suite checks momentum/kinetic-energy bounds for car contacts, penetration, angular caps, measured jump/drive equations, dodge direction/damping, powerslide rise/fall, explicit recovery, wall climbing and deterministic combined input at 30/60/120 display groupings. Display grouping consistency does not measure input-to-display latency.

Four previous assertions intentionally changed across `car-contact.test.cjs` and `secret.test.cjs`. Passive roof recovery is replaced by neutral-roof preservation plus explicit jump recovery; unconstrained near-ground air-roll is replaced by distinct input-driven trajectories with real hull constraints and retained containment/angular limits. The secret-arcade regression now initiates a real dodge instead of fabricating an 8 rad/s state, verifies the independently documented 5.5 rad/s cap, and also requires explicit roof-jump recovery. The four mass/contact momentum assertions and six-configuration soak were retained. Tests were not merely given wider penetration/energy tolerances.

Reproduce from the game directory:

```powershell
node scripts/measure-vehicle-fidelity.cjs --baseline --out=../../outputs/vehicle-baseline-10.3.0.json
node scripts/measure-vehicle-fidelity.cjs --out=../../outputs/vehicle-after.json
node --test tests/vehicle-fidelity.test.cjs tests/car-contact.test.cjs
```

The baseline command requires the archived 10.3.0 HTML and never silently substitutes the new build. A fresh checkout can retrieve that exact build from the pinned Nivet commit. Current probes inline current source, independent of whether the portable HTML has been rebuilt.

Remaining approximations include the tire force/yaw model, analytic arena normals, suspension/wheel contacts, body scrape friction and discrete contact manifold. Dodge torque cancellation, minimum torque phase and complete pitch-lock interaction are not a full port of the simulator state machine; the bounded independent model needs controlled trajectory recordings before more aggressive calibration. Half-flip and fast-aerial prerequisites are present, but full timing/trajectory parity and speed-flip/flip-reset support have not been established. Browser/controller playtesting and multiplayer consistency are documented separately in the release report.
