# Nivet League 10.1.0 — Matchday

Matchday improves ordinary match feedback, adds authoritative demolitions/respawns and corrects the custom opening. Black/velvet menus and normal blue/orange gameplay remain. The visual target is Rocket League's colorful stadium presentation, with matte cars and readable contact, rather than white reflections or realism alone.

[Play on Cloudflare](https://nivet-league.jikdifn.workers.dev/), [GitHub Pages](https://jikjikla.github.io/tevtev123/) or [Bunny CDN](https://tevtev123.b-cdn.net/). All three serve the same verified game; see [publication evidence](VERIFICATION-10.1.0.md).

## Match feel and visible feedback

- The [35-family match-effect catalogue](MATCH-EFFECTS.md) separates boost exhaust from supersonic wheel trails and records the actual implementation, test coverage and remaining differences. It includes engine/boost transitions, wheel/contact feedback, ball touch/bounce/trails, pickups, demolitions, goals/replays, countdowns, stadium response and interface cues.
- Ordinary feedback adds short supersonic rear-wheel ribbons, a two-layer fast-ball trail, tyre dust and fading skid marks, jump/dodge and landing rings, and compact collision feedback. Fixed buffers/pools keep effects bounded; teleports and respawns cut old trails rather than drawing across the field.
- A tap of boost observes the measured 0.1-second minimum burst. Supersonic state is distinct from held boost and has bounded maintenance as speed falls. Neutral airborne controls retain axis-specific damping instead of extra blanket spin suppression. Existing measured throttle, gravity, jump timing, body fit and top-speed rules remain.
- A qualifying forward supersonic opponent bumper hit can demolish a car. The victim becomes inert and hidden, gets a bounded burst/smoke effect and local countdown, then returns after a three-second simulated timer at a clear own-goal-side spawn. The server owns online demolition/respawn results; clients cannot award them. Respawn clears correction history so the returning car does not interpolate across the pitch.

Soccar and Heatseeker share these rules across 1v1, 2v2 and 3v3. Personal RGB paint remains available through the explicit host rule; standard matches and the arena retain blue/orange identity. Existing recordings and music preferences are preserved; no sound assets were replaced or newly generated.

## Opening: flyover, not impact

The first VS AI opening remains five seconds. The supplied F-22 geometry keeps its original proportions but flies at 88 m altitude, reducing its apparent size. The orange leader continues straight; blue wingmen use smooth analytic turns with gradual roll-in. Thinner smoke/exhaust follows those same paths. The camera frames the high pass, then tilts down toward the independently falling ball.

The stadium and roof stay fixed. Only camera/HUD offsets respond briefly to the pass, with a small fixed pool of 14 dust pieces below the canopy. The wall-impact recording has been removed from the flyover, avoiding the impression that a jet or ball struck the stadium. The full ball clears the sliding glass leaves before they close, bounces and settles precisely at GO. Online, practice and reduced-motion kickoffs retain their standard flow; the existing local rare-bomb Easter egg remains separate from competitive results.

## Lighting and clarity

A warmer directional key, restrained cool fill/environment, less ambient wash and compact contact shadows improve the separation of car, pitch and stadium. Paint remains matte. The photographic sky, source glows and blue/orange goal atmosphere remain; the Chromebook path does not gain a mandatory heavy postprocess effect. This is image-based lighting and conventional shadows, not hardware RTX.

## Cloudflare hosting

The new [Cloudflare Worker](https://nivet-league.jikdifn.workers.dev/) serves the exact browser build as static assets with a small JavaScript Worker module. The game still renders on the player's device; Phoenix continues to simulate multiplayer. Existing Workers were not overwritten, and no paid service, plan upgrade or extra multiplayer backend was enabled.

[Cloudflare deployment details and usage limits](CLOUDFLARE.md) cover the asset package and paste-only alternative. This is not a promise of unlimited free Worker-code execution or a statement about unrelated account subscriptions. Browser saves belong to each hostname; switching to the new Worker origin does not automatically transfer the old site's local progress.

## Validation and limits

The coordinated build passed **154 frontend checks and 18 dedicated-server checks: 172 total**. Actual WebGPU airshow/demolition rendering and WebGL Detail boost rendering were checked with empty warning/error logs. Live two-client and personal-paint checks passed against the updated Oracle service, and the new Worker origin completed its WebSocket hello. Cloudflare, Pages and Bunny returned identical HTML bytes/hash. A live Cloudflare browser session created a temporary private room, started with AI, cleared the countdown, accepted driving/boost and returned cleanly to the lobby without warning/error logs. GitHub verification and Pages deployment succeeded; [the verification record](VERIFICATION-10.1.0.md) links the build and deployment evidence.

This is an independent browser simulation, not a claim of exact 1:1 handling or every cosmetic/renderer feature. Car-car contact still uses a compact sphere-chain approximation; corners, suspension, car-ball impulses and some stat adjudication differ. No intended-device Chromebook FPS certification is made. No AI images, copied cosmetic variants, new audio assets or purchases were added.

References: [official v1.35 effect-category distinctions](https://www.rocketleague.com/news/patch-notes-v1-35-anniversary-update), [official v1.45 boost/loading fixes](https://www.rocketleague.com/news/patch-notes-v1-45), [RLBot measurements](https://wiki.rlbot.org/v5/botmaking/useful-game-values/), and [pinned RocketSim constants](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/RLConst.h). The catalogue links specific implementation limitations and sources.
