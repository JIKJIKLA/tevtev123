# Boost pickups 9.9.1

Boost pickups now have original three-dimensional metal housings with three lobes, beveled edges, recessed inserts, center wells and fasteners. The large pickups carry rotating, gently hovering golden plasma pills. Both sizes have amber lenses, rising light curtains, a warm ground spill and pooled sparks. Collection extinguishes the active components while leaving the physical housing on the turf. A short expanding pulse accompanies collection and respawn. These are independent mesh/effect recreations based on the references below, rather than copies of the game's original Unreal particle systems.

The 34 positions were checked against the standard Soccar reference. Four small pads move from X ±950 to ±940 cm, and four from longitudinal ±2302 to ±2300 cm. The existing network index order is retained. Six large pads remain at (±3584, 0) and (±3072, ±4096) cm. There are 28 small pads, adding 12 boost and returning after 4 seconds; large pads refill to 100 and return after 10 seconds. The shared server and offline solver use the same positions, pickup cylinders and timers in both playlists and all three team sizes.

The full pickup field uses eight instanced draw batches. A fixed pool bounds collection effects at 128 particles, plus at most 64 idle motes. There are no per-pad lights, shadow maps, network messages or downloaded assets. The permanent bases share one static batch. WebGL and WebGPU use the same geometry and procedural texture maps. Reduced-motion settings remove bobbing, spinning, motes and pulse animations.

Visual state follows the authoritative cooldowns. Joining a match with already-depleted pickups does not fabricate collection effects. Repeated snapshots do not replay a pickup burst. Replay frames now retain copied boost timers so past pickups appear in their recorded state without triggering live effects or modifying gameplay. Menu previews show active pads.

References retrieved through Firecrawl:

- [RLBot: measured standard field coordinates, pickup cylinders and timing](https://wiki.rlbot.org/v4/botmaking/useful-game-values/).
- [Rocket League Mapmaking: housing, active FX, boost orb and collection FX components](https://rocketleaguemapmaking.com/guide/udk/boost).
- [Dignitas: close-up small and large pickup screenshots](https://dignitas.gg/articles/boost-management-in-rocket-league).

Validation covers every coordinate, raised/finite geometry, permanent housing versus depleted effects, one-shot collection and respawn, late joins, replay isolation, particle bounds, reduced motion, and live solver pickups across Soccar/Heatseeker 1v1, 2v2 and 3v3.
