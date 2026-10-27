# Glass skylight 9.9.3

## Opening

The first VS AI kickoff now has two sliding tinted-glass skylight doors on a slim stadium rail frame. The drone, grippers, rotor discs and large opaque hatch plates have been removed. The panels open before release and stay clear of the ball until it passes below them. The shorter 6.4-second sequence drops the ball into two shrinking bounces, eases its spin to zero, and blends back into the chase camera before GO. The last 0.6 seconds are at the exact serving pose. Both Soccar and Heatseeker retain their existing solver positions; all opening movement is presentation only. Subsequent goals use the standard countdown. Multiplayer and practice skip the opening.

## Rare special delivery

Each new VS AI game has an independent 1% chance to replace the opening ball with a dark fuse bomb. The random sample uses browser cryptographic entropy with rejection sampling to avoid modulo bias. It is rolled once, before the first kickoff; a new match gets a new draw. No force-bomb query flag or public test override is included in the release.

On first impact the bomb produces a gold shockwave, sparks, smoke and separate car bursts. The wave reaches every enabled car before TEVIN WINS appears. The result offers Play Again and Back to Lobby; Escape also returns to the lobby, and keyboard focus stays on the result actions. The effect uses fixed instanced pools, no extra lights, no refraction pass and no additional shadow maps. Materials are prepared during initial shader warmup. Existing goal audio supplies the blast cue.

The Easter egg does not run in multiplayer, dedicated-server sessions or practice, does not alter the normal score, and does not write a career win/loss or XP. Reduced-motion players get a normal-length countdown and the same surprise/result without shake or animated blast particles. Rematch and lobby cleanup restore all car visibility, UI, controls and normal ball rendering.

## Transition polish

The final 0.32 seconds of a replay now blend into the field-side explosion camera, easing both framing and field of view instead of cutting sideways. Replay entrance dissolves are shorter and softer. Goal-to-countdown transitions use a 0.4-second fade to black, a 0.1-second full-black hold, and a 0.4-second reveal: 0.9 seconds total. The countdown's preparatory second now reads READY, followed by 3, 2, 1 and GO; it no longer shows a stray 4. Repeated multiplayer packets cannot restart its animation. The existing server-authoritative goal timing and normal physics remain unchanged.

## Validation

Automated coverage includes the exact lottery buckets and rejection boundary, single-roll lifecycle, all excluded session types, first-impact timing, both playlists, a six-car blast, career/score isolation, reduced motion, finite fixed geometry pools, door clearance throughout the fall, exact serving pose, black-hold timing, and existing gameplay/network regressions. Browser checks use a separate temporary preview that deterministically shows the rare drop once and a normal opening on retry. That preview is removed when publishing the final release.
