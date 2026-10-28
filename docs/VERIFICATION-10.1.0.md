# Nivet League 10.1.0 — verification

Recorded 2026-10-28. This record covers tested source/runtime behavior and confirmed publication.

## Build and automated checks — PASS

- Portable browser build completed.
- Frontend: **154 passed**.
- Dedicated server: **18 passed**.
- Combined: **172 passed**.
- Coverage includes normal match feedback buffer limits/expiry/teleport breaks; measured minimum boost and supersonic maintenance; forward opponent demolitions; excluded slow/reverse/side/teammate/predicted hits; inert victims; three-second safe respawns; snapshot validation and correction-history reset; both playlists/all team sizes; flyover smoothness/roof clearance; hatch clearance and staged ball authority; existing controls, saved settings, replays, pickups and Worker routes/assets.

Test counts describe this coordinated build, not proof of identical proprietary-engine behavior.

## Browser rendering — PASS

- Actual WebGPU airshow and demolition visuals inspected.
- Actual WebGL Detail boost visuals inspected.
- Live Cloudflare browser flow completed: title Start → Home → Play → Private Create. Temporary Phoenix room `087` was created with a displayed 21 ms RTT, the host started with AI, the countdown cleared visually, and driving/boost changed the gauge from 33 to 15 with 43 km/h displayed. Quit returned cleanly to the lobby. The session had empty warning/error logs; the server reported zero rooms afterward. This RTT is one observed connection, not a latency guarantee.
- Evidence screenshot: `nivet-matchday-live-10.1.0.png` in the workspace outputs.
- Warning/error logs were empty for those checks.
- Aircraft retain supplied geometry, fly above the fixed roof and bank smoothly. Shake affects camera/HUD; the stadium itself does not move. The falling ball is a render pose until normal kickoff resumes.
- Matte cars, warm key/cool fill balance, compact contact shade and blue/orange gameplay were reviewed.

These are actual renderer checks, not generated mockups. No physical Chromebook hardware FPS certification or exhaustive browser/device compatibility claim is made.

## Existing Phoenix multiplayer — PASS

- Existing Oracle service updated to **10.1.0** after backup at `/home/ubuntu/tevin-before-matchday-10.1.0.tar.gz`.
- Live two-client checks passed for the existing multiplayer flow.
- Live personal-paint checks passed.
- The new exact Worker origin completed the WebSocket hello after being added to the existing allowlist; no wildcard origin was enabled.
- Authority remains on Phoenix with the existing 120 Hz simulation/30 Hz snapshot architecture. The Worker hosts static browser assets, not the simulation.

The origin hello and live Cloudflare private-host session establish that the new site can enter the existing Phoenix flow. These checks are not a manual multi-human session from every browser/device on that origin.

## Cloudflare deployment — PASS

- Live URL: [nivet-league.jikdifn.workers.dev](https://nivet-league.jikdifn.workers.dev/).
- Deployed HTML size: **16,783,916 bytes**.
- SHA-256: `5d4f3c8e58caa19901c8e5fcb72971920721c51583ed0fbddc1930dba4029bb5`.
- The live asset was checked against the final browser HTML bytes.
- The new Worker uses static assets and a small module; unrelated Workers were not overwritten. No paid resources or plan upgrade were enabled for this release.
- See [Cloudflare details](CLOUDFLARE.md) for deployment identifier, route checks, packaging and plan-specific limits. This record does not promise universal free usage or cover unrelated account charges.

## GitHub, Pages and Bunny publication — PASS

- Game/source commit: [`fa93406bb830f378bb3c8e220e672900e8f20c56`](https://github.com/JIKJIKLA/tevtev123/commit/fa93406bb830f378bb3c8e220e672900e8f20c56).
- [Verify game](https://github.com/JIKJIKLA/tevtev123/actions/runs/40704534624): success, including portable-build reproducibility and frontend/server suites.
- [Pages build and deployment](https://github.com/JIKJIKLA/tevtev123/actions/runs/40704533209): success for that game commit.
- Direct root GETs on Cloudflare, GitHub Pages and Bunny each returned HTTP 200, title `Nivet League 10.1.0 — Matchday`, exactly 16,783,916 bytes, and SHA-256 `5d4f3c8e58caa19901c8e5fcb72971920721c51583ed0fbddc1930dba4029bb5`.
- Portable HTML Git blob: `cc20d7708e629aca0e102a353de39a23c481c916`. The uploaded blob was checked before the leased main-branch update.

This publication record is a documentation-only follow-up; it does not change the verified game bytes. A matching standalone copy is retained in the workspace outputs as `nivet-league-10.1.0.html`.

## Remaining differences

The [35-family catalogue](MATCH-EFFECTS.md) records what is represented and what remains approximate. Cosmetic inventories, exact copyrighted assets, full scoring-stat adjudication and every renderer pass are not reproduced. Car contacts use the existing sphere-chain approximation; wall corners, suspension and impulses remain independently tuned. Existing music/sound recordings are retained, and music remains opt-in. No new AI assets, generated recordings or purchases were used.
