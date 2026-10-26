# Stadium and Secret Arcade update

The pitch now uses alternating mowing panels with baked fine grass strokes. Goal surrounds add patterned metal panels, recessed back walls, team-colored light strips and directional chevrons. New geometry remains outside the playable goal opening and is batched. Original Tevin artwork; no AI imagery or new third-party art assets.

Handling: lower ball-contact torque on airborne cars; extra damping only with neutral air controls and outside active dodges; damp roof/side scrapes; automatic wheel recovery after a resting floor inversion. Intentional flips, air-roll input and wall driving remain available. Shared client/server solver changes.

Type `secret` anywhere to open the arcade overlay. The exact, case-sensitive passcode is `spellingbeewinner`. X closes; minus minimizes; Restore Lab brings it back. The unlock lasts for the current page session.

Twelve powers: bottomless boost (15 seconds), moon boots, ball vacuum (6 seconds), personal space (6 seconds), ball freeze (3 seconds), goal cannon, sky launch, summon ball, teleport behind ball, position swap, instant recovery and popcorn launches. Timed effects reset at each kickoff. Any player knowing the code can use them in offline, private or quick matches. Multiplayer sends named abilities to the authoritative server and broadcasts use to all players; callers cannot choose another player's slot or arbitrary physics values. Invalid names, incorrect codes, invalid phases and rapid requests are rejected.

The code is an easter egg, visible in client source, not an admin credential. Online effects are announced. Existing audio is retained.

Validation: 69 tests pass, including exact unlock/minimize/close behavior; all abilities across both playlists and all team sizes; effect expiry/kickoff reset; angular settling versus intentional flips; inverted recovery; and two-socket ability authorization, sender-seat binding, cooldown and synchronized state.

## Painted wind turf follow-up
Grass now uses three tapered blades per tuft with shared pitch-texture sampling on WebGPU and WebGL. Blue, orange and white paint is sampled at each root's world position, including center-circle and end-zone markings, rather than applying a separate green tint. Broad gusts, fine flutter, near-ground car/ball displacement and velocity wakes animate blades. A 20 m camera patch fades before wrapping and uses 16,000 / 28,000 instanced tufts. The motion preference and OS reduced-motion setting stop wind. No dynamic lights, downloaded art or extra render passes are needed for the grass.
The pinned engine grass factory is replaced at build time from grass-node.js by patch-grass.cjs; the legacy recovery artifact remains byte-for-byte intact. The build asserts the expected factory before replacement. Source/bundle changes do not affect server physics. Test coverage now includes overlay keyboard/controller isolation and grass geometry/paint-node binding; the full suite has 73 passing tests.
