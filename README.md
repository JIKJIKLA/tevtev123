# Tevin League 9.0 — Precision

Chromebook-focused browser car soccer. Play at https://jikjikla.github.io/tevtev123/ or download `index.html` and open it in Chrome. Offline matches and sandbox work without a server; online modes use the configured Supabase project.

## Play

- W/S or arrows: accelerate/brake and aerial pitch
- A/D or arrows: steer and aerial yaw
- Space: jump, double jump or directional dodge
- Shift: boost
- Q/E: directional air roll
- C: powerslide
- B: ball camera
- Escape: pause; F2: sandbox settings; R/T: reset ball/car in sandbox
- Standard controller: triggers drive/brake, left stick steer/pitch, A jump, B boost, X powerslide, Y camera, LB/RB air roll, Start pause

Settings includes saved camera sliders and keyboard remapping. Chromebook mode is the default and retains the selected detailed car. Detail mode is optional.

## Develop

Requires Node.js 22+ and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm check
```

Edit `src/game.js`, `src/accuracy.js`, `src/controls.js`, `src/precision.css` and `src/shell.html`. `node scripts/build.cjs` generates the portable, self-contained `index.html`. The recovered `src/legacy-8.2.html` is preserved byte-for-byte as the bundled-engine/asset source and recovery copy. It is not the active game.

`pnpm test` runs simulation and DOM regression checks. `node scripts/check-live.cjs` explicitly creates a temporary Supabase private room, tests two clients, then closes it. It is not part of the automatic test suite.

`supabase/functions/tevin-store/` contains the recovered and updated deployed backend source. Version 4 adds isolated new-build queues while keeping older rooms compatible with their existing clients. Publishable client configuration is embedded; service credentials remain server-side.

See [accuracy and limitations](docs/ACCURACY.md) and [release notes](docs/RELEASE-9.0.md).
