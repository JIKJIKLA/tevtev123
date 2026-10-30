# Nivet League 10.3.0 — Matchday

This update addresses first-kickoff stalls, repeated arena construction, sideways loss of control, excessive camera fading and interface placement. It keeps dense painted grass, the photographic sky and turf, matte cars, existing audio and opt-in music. Soccar, Heatseeker, all three team sizes, AI, practice and dedicated multiplayer retain the same rules and playable dimensions.

## Vehicle contacts and camera

Car-to-car collision now tests the measured oriented body boxes with 15 separating axes. The old overlapping sphere chain could report collisions well above the body and shove both cars repeatedly. The replacement uses one contact, 180 kg equal-mass impulses, body-specific box inertia, low restitution and friction, and tire-supported yaw response. Ordinary collisions remain distinct from validated supersonic demolitions.

The source measurements are [pinned RocketSim RLConst.h](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/RLConst.h) and [Car.cpp](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/Sim/Car/Car.cpp). These support the 180 kg car/30 kg ball, 0.1 restitution, 0.09 friction and partial-wheel contact behavior. Nivet's SAT/contact implementation is independent; it remains an approximation of the proprietary game's complete solver.

When the hull or only some wheels rest on a floor/ramp, held drive/steer input no longer fights the recovery with aerial pitch/yaw. A delayed bounded tilt assist restores wheel support. Free aerial control, intentional air roll, jumps/dodges and supported wall driving are preserved. Acceleration and top speed are not reduced to fake weight.

Camera wall constraints alone no longer fade the body. Nine samples test the visible ball disk against the actual rotated body. A sustained majority obstruction triggers the existing 33% fade; edge grazes and momentary crossings do not. Clear views restore promptly. Emergency inside-body clipping still fades immediately. A framing correction keeps the body/wheels within the view when aiming at a high ball without changing saved FOV or moving the car.

## Loading and frame consistency

The arena reserves six visual car slots and their effect/shadow slots before play. Physics and network rosters remain two, four or six cars. Switching between 1v1, 2v2 and 3v3 no longer disposes and rebuilds the entire stadium. A changed body replaces that car model only.

The loading gate stages hidden match effects, compiles their materials and performs the existing renderer/pipeline upload before revealing kickoff. Successful contexts and actual model/effect roots are remembered. Concurrent requests coalesce only for the correct arena; replaced models, cameras, pipelines or renderers invalidate the preparation. Failure restores visibility and instance counts and permits retry. The render loop does not race an active warm-up.

This moves one-time work before gameplay; it does not promise that every Chromebook driver can compile or render at a particular FPS. The earlier [10.2.1 performance optimizations](PERFORMANCE-10.2.1.md), bounded pools and reduced-motion behavior remain.

## UI and effects

The main actions use a narrow angled left stack, with the actual car center/right, player/party strip at the bottom, illustrated play cards and a thin centered scoreboard. Actual implemented destinations, persistent launch controls and phone scrolling remain functional. See [UI references, font license and responsive notes](MATCHDAY-UI.md).

Goals add bounded fire and smoke billboards; tire/contact dust uses a soft puff texture. The rare offline first-kickoff Nivet Wins event now has a larger stadium-wide shockwave, expanding fire column, rising smoke, car bursts and a widening camera. Its odds, exclusion from multiplayer/career scoring and accessible result controls remain unchanged. Reduced motion suppresses shake, fire/smoke particles and extra opening motion. No sounds were generated or replaced.

### External texture provenance

Kenney's **Smoke Particle Assets**, by Kenney Vleugels, are CC0. [Author's asset page](https://kenney.nl/assets/smoke-particles), [author's OpenGameArt upload](https://opengameart.org/content/smoke-particle-assets), [original ZIP](https://opengameart.org/sites/default/files/smokeParticleAssets.zip). The selected files are unmodified PNGs from that archive; no AI images or image conversion were used. The original license is retained in `src/assets/kenney-smoke-LICENSE.txt`.

| Local asset | Original archive path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `fx-explosion.png` | `PNG/Explosion/explosion03.png` | 275667 | `f3ef124b3ba96691f7197880536d8f890476c0f4c9f452f447009216ae14f887` |
| `fx-smoke.png` | `PNG/Black smoke/blackSmoke08.png` | 116910 | `212a40aa1d241e1c6f2cb25cd138d16448bbb84538d8c9409e48a1705407b437` |
| `fx-dust.png` | `PNG/White puff/whitePuff03.png` | 126303 | `8da251b3cff719ee51d794ff5b5c62fd38e5e55056cd5b91ab55f6108d5ff048` |

These optional textures are embedded in the portable build. A failed optional decode retains the previous glow/soft fallback. The pools add no dynamic lights, shadow maps, unbounded emitters or extra postprocessing pass. The rare event has at most 24 fire and 64 smoke instances; regular goals have 12 fire and 24 smoke instances.

## Validation and publication

The combined build passes **236 frontend tests and 34 dedicated-server tests**. New regressions cover measured-box separation and momentum/energy response, all body profiles, sideways/roof recovery with real keyboard input, preserved aerial/wall controls, all playlist/roster combinations, camera fade/framing, warm-up context races and cleanup, functional UI routes and profile/font packaging. Publication and live browser checks are recorded after deployment below.
