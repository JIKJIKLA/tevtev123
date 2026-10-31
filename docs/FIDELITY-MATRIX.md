# Gameplay fidelity audit

Baseline: **10.3.0**, source commit `12bba0aec9e3ed9791253a45ae48ed2fa6400382`, receipt `97703782077a0bf636ebc32e1f336a92616a7682`. The immutable local baseline includes the complete 20,964,843-byte playable HTML, SHA-256 `e603c3f6fa43f807b62929c344d00cf9f2c166dd71f11607ed212b57e67513eb`, source and test scripts. Before/after runners can load that HTML independently of the new build.

Coordinate convention: metres, seconds, kilograms; Y up, local +X forward, local +Z right. RLBot/RocketSim UU positions/speeds/accelerations convert by 0.01; inertia and angular-vector coordinate transforms require separate consideration. Simulation is 120 Hz. Rendering frequency is not simulation frequency.

No controlled Rocket League gameplay recording or executable comparison is available in this workspace. Published measurement models and pinned community simulator implementations establish the targets below; they do **not** establish equivalence with the proprietary engine. Each detailed report records its own source revision, conditions and numerical tolerances.

| Mechanic | 10.3.0 current behavior | Verified reference / evidence | Difference class; confidence | Completed change / remaining work | Validation |
| --- | --- | --- | --- | --- | --- |
| Acceleration, coast, ground/air boost | Piecewise curves; 10 m/s coasts to ~4.75 m/s in 1 s | Original Smish curves / RLBot measurements | Already close under stated conditions; high for isolated curve | Preserve verified curves; test combinations | Vehicle runner and combined trajectories |
| Reverse/brake/turn | Speed-dependent steering, fixed reverse cap, torque lag | Original measurements and pinned simulators | Combined response requires calibration; medium | Change only demonstrated discrepancies | Fixed-speed circles, braking/reversal |
| Powerslide | Instant flag selects a grip target and yaw multiplier | Pinned handbrake activation/recovery model | Numerical model difference; medium | Add bounded handbrake response; preserve momentum | Turn/land/boost sequences |
| Initial jump/hold | ~2.92 m/s impulse, three mandatory ticks, 0.2 s maximum | RLBot jumping measurements | Already supported; high within discrete timing | Retain; verify surface departure | Tap/hold/wall trajectories |
| Dodge impulse and fall | Every direction gets 5 m/s; falling velocity immediately becomes zero | Pinned RocketSim/RLUtilities dodge model | Verified model difference; medium | Separate directional speed scaling and delayed vertical behavior | Falling, side/back/diagonal traces |
| Dodge angular motion | ~9.67 rad/s scripted axis rate | Published 5.5 rad/s angular limit / pinned control model | Verified inconsistency; medium | Bounded torque/cancellation/state machine | Half-flip/wavedash prerequisites, not trick buttons |
| Contact assistance | Side/roof can rotate upright without input | Pinned throttle autoroll / roof auto-flip behavior | Reproducible control interference; high | Remove passive pose preference, retain input-driven supported behavior | Neutral awkward landings versus deliberate recovery |
| Car–ball contact | Speed-varying restitution plus reduced recoil/spin | Original Smish physical + extra-hit model, pinned RocketSim | Independent approximation materially changes catches/shots; medium | Physical inelastic contact plus documented extra-hit term | Soft/strong/angled/hood/side/roof/pinch scenarios |
| Ball bounce/settling | Generic Coulomb friction and extra rolling decay | Original measured bounce equations | Numerical model difference; medium | Shared bounce equations for authority, prediction and bot forecast | Trajectory, slip/spin, settling traces |
| Goal-mouth collision | Sphere can hit the overlap seam of the analytic union | Reproduced rolling-ball path; visual opening has no lip | Reproducible geometry defect; high | Correct pocket overlap without changing field size | Rolling/oblique/high-speed goal approaches |
| Full arena | Rounded analytic boundary and rectangular goal pocket | Exact map collision mesh not available | Intentional approximation / unknown geometry | Preserve dimensions; document transitions, test containment | Walls, corners, ceiling and posts |
| Chase heading | Normalized lerp can remain stuck at a 180° reversal | Reproduced at 30/60/120 Hz | Correctness defect; high | Angular interpolation with deterministic reversal direction | Dynamic path comparisons |
| Wall camera | ~7.15 m eye distance despite saved 2.7 m; forces FOV80 to104 | Saved settings contract; proprietary response curves unavailable | Setting inconsistency; high; exact parity unknown | Compact wall framing, retain settings | Floor/wall/ceiling and ball-crossing paths |
| Resolution / pacing | Performance EMA exists; decision hardcoded to 1 | Code inspection; Three.js drawing-buffer documentation | Reproducible inactive policy; high | Sustained thresholds, cooldowns, bounded scaling; native override | Policy traces plus actual render profiling |
| Free Play | Initial roster/settings inherited from match selection | Requested practice contract | Reproducible usability/rules isolation defect; high | No bots + unlimited boost default; explicit preferences isolated | Entry, resets, saved preference, online/normal exit |
| Network physics | Shared solver, 120 Hz prediction, 30 Hz snapshots | Code trace; existing real WebSocket tests | Local/remote future inputs and packet conditions remain approximate | Serialize all new state; reject old solver wire; test reconciliation | Deterministic delayed/jittered snapshots and live private checks |
| Match rules | Existing zero-second, overtime, whole-ball, demolition and rematch logic | Existing behavioral suite plus RLBot/reference documentation | Audit/regression; not every proprietary rule independently measured | Preserve and retest; fix only reproduced defects | Both playlists, every roster and authority flow |

## Interpretation of tests

- **Fidelity** compares against an independently specified numerical equation or documented timing/threshold, with model uncertainty stated.
- **Regression** preserves intended Nivet behavior and contracts; it does not prove Rocket League fidelity.
- **Stability/consistency** establishes finite state, containment, repeatability and agreement between Nivet execution paths; it does not prove a proprietary target.

Detailed completed measurements and remaining gaps are collected in the vehicle, ball/arena, camera and integration reports beside this matrix. A feature is not advertised as an advanced mechanic solely because one prerequisite or unit test passes.


## Completed validation (10.4.0)
- [Vehicle evidence and measured traces](FIDELITY-VEHICLE.md): verified drive/boost curves retained; independent directional dodge, handbrake and deliberate recovery model tested.
- [Ball and arena evidence](FIDELITY-BALL-ARENA.md): separate physical/extra impulses, grazing-contact constraint, shared surface slip model and false goal lip correction.
- [Camera evidence](FIDELITY-CAMERA.md): antipodal response, saved wall settings and actual ball aim validated at multiple display rates. The old clamped proxy-target regression was intentionally replaced by an actual-target/no-body-mutation contract.
- [Multiplayer evidence](FIDELITY-NETWORK.md):20synthetic queue profiles and full acknowledged convergence; adverse-delay corrections and authority-only remote collisions remain explicit limits.
- [Release verification and player scenarios](CONTROL-10.4.0.md): real browser checks, render conditions, source/build artifacts and production receipts.

The RL→Nivet position permutation(x,y,z)→(x,z,y) is a reflection. Angular vectors require the negative permutation(−wx,−wz,−wy). No raw reference recording was converted in this update.
