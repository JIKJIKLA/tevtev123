# Skyline flyby 9.9.4

The first VS AI opening is now 5.5 seconds. A delivery drone descends from above the stadium, holds the ball above a fixed roof at 30.5 m, and releases it through sliding glass doors. The drone stays above the roof and departs upward. The roof, frames and tracks never descend. Three fixed apertures align with the Soccar kickoff and the two Heatseeker serve positions; only the active aperture opens. The roof remains part of the stadium backdrop in all playlists. Normal solver positions, ceiling collisions and arena dimensions are unchanged.

The owner's F-22 model makes a 215 m/s pass above the roof, with original UVs and compressed base-color, normal, roughness and metallic maps. The supplied retracted-gear configuration contains 28,696 triangles. Geometry and maps add approximately 1.23 MB of source assets and are embedded in the portable HTML, loaded during initial preparation and compiled before kickoff. The flyby uses no additional lights, shadows, refraction or multiplayer physics. Camera translation remains under 9 cm; HUD offsets stay within 2.5 px horizontally and 1.8 px vertically. Reduced motion skips the opening/flyby and retains the standard countdown. Existing boost/impact recordings supply the short pass cue; the existing audio library and music preferences remain intact.

The 1% bomb event still applies only to the first VS AI drop, now at its earlier impact. The special result does not count as a normal win/loss or XP. Subsequent goals and all online/training kickoffs keep their normal flow.

Arena walls now have brushed-metal kickboards, smaller repeated original Tevin panels, painted LED edge strips, fine safety hex mesh, and physical structural ribs/rails outside the collision surface. Team paint continues to update the trim and scoreboard.

Private match and Quick Match party codes are three-character digit strings. Codes such as 000 and 042 retain their zeros. Allocation checks both room and party namespaces and scans a finite 1,000-code pool on collision; it cannot spin indefinitely. Join fields show numeric keyboards on phones, sanitize pasted text, and explain invalid short codes. Existing lobby leadership, readiness, quick matching and server-owned physics remain unchanged.

Validation covers supplied mesh indices/normals/UVs, roof and drone clearances, door clearance throughout release, shorter opening timing across both playlists and every team size, motion preference and cleanup, wall-frame bounds, exact serving poses, numeric input and leading zeros, invite exhaustion/collision resolution, and real two-socket match/party flows.

Asset provenance and conversion notes are in [F22-ASSET.md](F22-ASSET.md).
