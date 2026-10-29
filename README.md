# Nivet League 10.2.0 — Championship

Championship rebuilds the field and stadium with dense painted grass, photographic surface detail, layered goal tunnels, fuller seating detail, readable concrete and steel, focused car/ball shadows and softer window reflections. [Visual release and validation](docs/RELEASE-10.2.0.md). The preceding [whole-game fixes](docs/AUDIT-10.1.1.md) remain included.

The Matchday effects, authoritative demolitions, smooth high-altitude airshow, matte cars, warm stadium lighting and blue/orange gameplay remain. [Matchday release](docs/RELEASE-10.1.0.md) · [35 effect families and limitations](docs/MATCH-EFFECTS.md).

The first VS AI kickoff retains a five-second opening. The orange leader flies straight while blue wingmen bank apart at 88 m altitude. The fixed stadium does not shake; the camera/HUD react briefly with a few canopy dust pieces. The ball clears the sliding hatch, bounces and rests at GO. The old wall-impact flyover sound is removed. [Opening and validation](docs/VERIFICATION-10.1.0.md).

Boost pickups use sculpted three-armed housings, floating golden full-boost pills, light curtains and collection/respawn effects. All 34 placements are verified against the standard field. [Boost pickup release details and references](docs/RELEASE-9.9.1.md).

Browser car soccer with Soccar and Heatseeker, 1v1/2v2/3v3, AI, sandbox, private rooms and public matchmaking. Play the verified 10.2.0 browser game on [Cloudflare](https://nivet-league.jikdifn.workers.dev/), [GitHub Pages](https://jikjikla.github.io/tevtev123/) or [Bunny CDN](https://tevtev123.b-cdn.net/?v=10.2.0). All three hosts returned the same tested artifact; see the [publication record](docs/RELEASE-10.2.0.md). Refresh an older open game tab to load this release. Online play uses the existing Phoenix dedicated server. The portable `index.html` also supports offline AI and practice.

## Controls and new features

- Supersonic wheel trails are separate from active boost flames. Short boost taps observe the measured 0.1-second minimum burst; neutral airborne controls retain axis damping without extra blanket spin suppression.
- Forward supersonic opponent bumper hits can demolish a car. Victims cannot drive, touch the ball or collect pads, then authority restores them after a three-second simulated timer at a clear own-side spawn. A bounded smoke/burst and respawn ring accompany the transition.
- Ordinary contact uses short rings, ball ribbons, dust and fading skid marks in fixed pools. [Effect catalogue](docs/MATCH-EFFECTS.md) distinguishes these original approximations from exact Rocket League assets and full stat/cosmetic systems.
- Wall camera checks the same rounded boundary as gameplay, orbits along the wall to frame both car and ball, and fades your car to 33% opacity when it blocks the view. The fade is isolated from other players and restores automatically.
- Goal replays establish from midfield, follow the final shooter, slow down and zoom through the last touch, then track the shot and widen as playback accelerates. The shared goal hold is 8.5 seconds; online recordings use authority timestamps.
- Cobalt/amber light and slight distance haze frame the pitch. The exterior now includes concourses, gates, a plaza, trees, lamps and taller cable towers; the playable dimensions remain unchanged.
- Cleaner player labels and illustrated mode cards accompany a persistent match-start button on desktop and touch layouts.
- Online countdowns animate once per number. Remote cars use the server tick timeline with a 50–100 ms adaptive interpolation delay instead of a fixed 100 ms arrival-time buffer; local steering corrections blend visually while authority stays unchanged.
- Championship stadium adds rounded multicolored fans, continuous concourse displays, roof undersides/ribs, hospitality boxes and pennants. Balanced warm sun/cool fill and baked turf-edge shading preserve the existing photographic sky and matte cars.
- Phones/tablets automatically get a left thumbstick, hold-to-boost, jump/dodge, slide, air roll, ball-camera, pause and fullscreen controls. Settings → Screen & Controls can override detection. Keyboard/controller input switches automatically on hybrid devices.
- Garage supports a full RGB picker, hue slider and eight extra quick paints. Blue/orange team paint is the match default; hosts can disable Team Colors to use personal paint. Garage presets and online profiles retain custom RGB colors.
- Boost uses twin flame cores and bounded trails. Goals add scorer-colored shockwaves, ribbons and a stinger; the celebration includes a skippable slow-motion replay. Quiet/reduced-motion settings remain available.
- W/S: drive and air pitch; A/D: steer/yaw; Space: jump/dodge; Shift: boost; Q/E: air roll; C: powerslide; B: ball camera.
- Escape: pause; F2: practice menu; R: repeat the current drill/reset the ball; T: recover the car.
- 1–4: preset team chat, unless those keys are remapped. The HUD also has clickable chat buttons.
- Sandbox has shooting, goalkeeper, aerial, dribble, wall and recovery drills, plus free play and a hitbox overlay.
- Settings has camera presets, presentation toggles, local XP/history/export, and sound credits. Music remains opt-in.
- Garage has three saved body/paint/celebration slots and earned titles. Custom rules has best-of-three/five series for AI/private matches.
- Public matchmaking offers practice while searching. Public queues require real players; empty private seats use AI.

- Secret arcade: type `secret`, enter `spellingbeewinner`, then use the X / minus / Restore Lab controls. Twelve powers work offline and through the multiplayer server; online uses are announced to every player. [Details](docs/SECRET-ARCADE.md).
- Stadium has a photographic sky, mown pitch panels and textured team-colored goal surrounds. Resting overturned cars recover automatically; neutral air controls damp unwanted spin.

## Development

Node.js 24+, pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm check
npm ci --prefix server --ignore-scripts
node --test server/test/*.test.cjs
```

Edit `src/` and run `node scripts/build.cjs` to regenerate the portable HTML. `src/legacy-8.2.html` retains the recovered engine and assets; it is not the active gameplay source. The dedicated server loads the same solver through `server/physics.cjs` and `src/server-api.js`. `scripts/check-oracle-live.cjs` explicitly tests the public WSS service using temporary clients and closes them afterward.

The recovered Supabase source remains for archival compatibility; current gameplay uses the dedicated WebSocket transport. No server credentials belong in the repository.

Cloudflare hosts the same browser game with a small JavaScript Worker and static assets; it does not replace the rendering client or multiplayer simulation. [Worker package, deployment and usage limits](docs/CLOUDFLARE.md). No paid resources or billing upgrade were enabled by this release; plan limits and unrelated subscriptions still apply. Saves are scoped to each site origin.

[Persistent product vision](docs/PRODUCT-VISION.md) · [10.1.0 verification](docs/VERIFICATION-10.1.0.md) · [New sound licenses](docs/AUDIO-9.6.md) · [Physics references](docs/ACCURACY.md)
