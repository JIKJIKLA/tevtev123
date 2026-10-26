# Tevin League 9.8 — Championship

Browser car soccer with Soccar and Heatseeker, 1v1/2v2/3v3, AI, sandbox, private rooms and public matchmaking. [Play on GitHub Pages](https://jikjikla.github.io/tevtev123/) or [Bunny CDN](https://tevtev123.b-cdn.net/). Online play uses the Phoenix dedicated server. The portable `index.html` also supports offline AI and practice.

## Controls and new features

- Online countdowns animate once per number. Remote cars use the server tick timeline with a 50–100 ms adaptive interpolation delay instead of a fixed 100 ms arrival-time buffer; local steering corrections blend visually while authority stays unchanged.
- Championship stadium adds rounded multicolored fans, continuous concourse displays, roof undersides/ribs, hospitality boxes and pennants. Balanced warm sun/cool fill and baked turf-edge shading preserve the existing photographic sky and matte cars.
- Phones/tablets automatically get a left thumbstick, hold-to-boost, jump/dodge, slide, air roll, ball-camera, pause and fullscreen controls. Settings → Screen & Controls can override detection. Keyboard/controller input switches automatically on hybrid devices.
- Garage supports a full RGB picker, hue slider and eight extra quick paints. Paint saves with garage presets and travels through multiplayer; scoreboard digits choose a readable contrast against each captain's actual paint.
- Boost uses twin flame cores and bounded trails. Goals add scorer-colored shockwaves, ribbons and a stinger; the 7.2-second celebration includes a longer slow-motion replay. Quiet/reduced-motion settings remain available.
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

[Persistent product vision](docs/PRODUCT-VISION.md) · [9.8 release scope](docs/RELEASE-9.8.md) · [New sound licenses](docs/AUDIO-9.6.md) · [Physics references](docs/ACCURACY.md)
