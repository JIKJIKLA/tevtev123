# Nivet League: measurements and implementation

This is an independent browser simulation. The release improves measured mechanics without claiming to reproduce Rocket League's proprietary engine exactly.

## Reference measurements

- Ground acceleration, braking, coasting and turning: [Samuel Mish's measured ground-control curves](https://www.smish.dev/rocket_league/ground_control/).
- Arena dimensions, the standard 34 boost-pad coordinates, pickup cylinders, cooldowns and kickoff positions: [RLBot useful game values](https://wiki.rlbot.org/v5/botmaking/useful-game-values/).
- Jump impulse, mandatory hold ticks, maximum hold and airborne throttle: [RLBot jumping physics](https://wiki.rlbot.org/v5/botmaking/jumping-physics/).
- Body dimensions, offsets and wheel placements: [RocketSim CarConfig at c2baacb](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/Sim/Car/CarConfig/CarConfig.cpp). This release uses that project's collision-box dimension convention. It differs slightly from the older commonly quoted hitbox dimensions. Octane and Fennec share one profile; Dominus is longer and lower.
- Aerial-control reference: [RLUtilities car simulation](https://github.com/samuelpmish/RLUtilities/blob/master/src/simulation/car.cc). Numerical measurements inform the independent implementation; its simulation code is not incorporated.

## Implemented

- 120 Hz fixed physics, independent of the display frame rate.
- Piecewise speed-dependent throttle and steering. Coasting at 5.25 m/s², braking at 35 m/s², separate ground and aerial boost acceleration.
- Body-specific ball/arena hitboxes, inertia and wheel-support positions. Imported models are fitted to the new footprints with their wheels on the ground.
- Standard 28 small and 6 large boost pads, cylinder-based pickup checks, 4/10-second cooldowns.
- Standard kickoff positions for the available three seats per team.
- Linear ball drag and 6 rad/s angular-speed cap, shared by the bot predictor.
- Zero-second airborne continuation; ground contact ends regulation; ties start a fresh overtime kickoff; a last-second equalizer reaches overtime after the goal celebration.
- Saved horizontal camera FOV, distance, height, downward angle, stiffness and optional shake.
- Keyboard rebinding with conflict swapping, standard-controller analog input and edge-triggered jump/camera/pause actions.
- Chromebook default: detailed cars, crisp native-resolution policy with adaptive scaling, lighter instanced turf and contact shadows. Detail mode adds denser turf, soft shadows and optional postprocessing. See current source budgets; historical resolution caps are not current.
- Shared gameplay protocol4 and dedicated transport wire1; server-owned public/private matches with numeric validation and reconciliation. Legacy Supabase relay source remains for compatibility only.

## Current implementation and remaining differences (10.0.0)

The automated suite executes actual bundled gameplay in a lightweight DOM and shared authority in Node. It covers acceleration, jumps, landings, wall constraints, boost pickups, zero-second/overtime rules, body fitting, frame-rate independence, bot soak, car/ball prediction, replay timing, menu flow, saved settings and both rendering paths through separate browser checks. The Oracle server owns online simulation at 120 Hz and sends 30 Hz snapshots; the browser predicts local contacts/inputs and reconciles to authority. Replays are recorded-state presentation and never pause the online server.

Field, goals and ball use the measured scale above. Car wheel tracks are fitted to the physical axle contacts; original height and length proportions remain. New-driver camera defaults are 110° horizontal FOV, 2.7 m distance, 1 m height, 3° tilt; saved cameras remain. The arena always stays blue/orange; normal team-color matches use standard team paint, with explicit personal-paint matches available.

Arena corners use a rounded boundary rather than the exact standard-map collision mesh. Car-car contact uses a compact sphere-chain approximation. Car-ball response, powerslide, flip torque and suspension remain independently tuned approximations. Bots, full flip-reset mechanics and effects are not equivalent to the proprietary game. No ranked-MMR claim or Chromebook hardware frame-rate certification is made.

The original embedded models, soundtrack, textures and engine remain in the immutable legacy recovery artifact. Current build patches change only the intended grass factory and two rendered brand strings. No new asset purchases or AI media generation were used. See [10.0.0 release](RELEASE-10.0.0.md) for the current scope.
