# Precision 9.0: implementation and validation

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
- Chromebook default: detailed cars, 921,600-pixel ceiling before adaptive scaling, 3,000 grass instances, contact shadows, no expensive postprocessing. Detail mode uses 1.8M pixels, 24,000 grass instances and 2048-pixel shadow maps.
- Multiplayer protocol 4, version-separated public queues, whole-snapshot numeric validation and the existing authenticated, session-owned Supabase Realtime transport.

## Validation and remaining differences

The automated suite executes the actual bundled game in a lightweight DOM with rendering disabled. It tests acceleration, jumps, landing, pickups, zero-second rules, prediction, keyboard mapping, imported mesh bounds, wall collisions, frame-rate independence, a 30-second 3v3 simulation and backend authorization. A separate live integration command tests Supabase sign-in, two-client room membership, Realtime delivery and host ownership.

The stadium still uses rounded arena corners rather than an exact standard-map collision mesh. Car-car contact uses a compact sphere-chain approximation. Car-ball response, powerslide, flip torque and suspension remain independently tuned approximations. Demolitions, flip resets, full client prediction/reconciliation and replays are not implemented. Multiplayer remains host-authoritative with interpolation; it is not a trusted ranked server. No Chromebook frame-rate claim is certified until tested on the intended hardware.

The existing embedded models, soundtrack, textures and engine are preserved from the supplied build. No new asset purchases or AI media generation were used.
