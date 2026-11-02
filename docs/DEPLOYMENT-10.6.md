# Nivet League 10.6.0 — Drive deployment

Published November 1, 2026, Pacific time (November 2 UTC). This release changes vehicle handling and required shared state only. Visuals, camera code, ball tuning, effects and assets remain unchanged. See [VERIFICATION-10.6.0.md](VERIFICATION-10.6.0.md) for reproduced failures, before/after evidence, native keyboard sequences, automated results and limitations.

## Source and accepted document

- Source commit: `b94c8eb6a815cfa4afcf22d9caab656362ffbddb`.
- Source tree: `9d5d5b7431e3e032995550d399d6126a24bc162e`; all276maintained/new file hashes were checked before publication. The unrelated local version of the old9.6deployment document was excluded and its remote entry preserved.
- Portable HTML:20,996,135UTF-8bytes; SHA-256 `a78abb56d28acda8dcf391ca29cd18dddeb42b0cc7f78d15723f9c63e80a35fc`; Git blob `d45cc9e08e276bc5f3469635ba8d584d01447cf2`.
- Frontend340/340 and server35/35 tests pass,375total. All six required native sequences were completed in the visible browser, with extra car/ball/diagnostic jump comparisons.
- Source verification CI [41389076925](https://github.com/JIKJIKLA/tevtev123/actions/runs/41389076925) and Pages deployment [41389076647](https://github.com/JIKJIKLA/tevtev123/actions/runs/41389076647) succeeded.

## Existing multiplayer server

The Phoenix authority server is10.6.0, wire4, gameplay protocol7,120Hz physics and30Hz snapshots. The new `carriedPitch` state and strict `coupledPitch` input flag are consistent across offline simulation, authority and prediction. Eighteen full human-mapper scenarios cover every body, roster and playlist with exact authority/prediction state equality and delayed input replay.

Deployment repeatedly checked0active rooms before copying or restarting. All49production source SHA-256values matched the accepted source. Both3v3playlists initialized successfully. Live WebSocket lifecycle and custom-paint checks passed; final health reported0rooms,0dropped ticks, capacity4. Observed RTT was53ms from the verification connection; this is not a player latency guarantee.

Rollback backup: `/home/ubuntu/tevin-before-drive-10.6.0-20261102T043318Z.tar.gz`. No firewall, systemd, nginx, dependencies, capacity, origins or paid resources were changed.

## Frontend hosts

- [GitHub Pages](https://jikjikla.github.io/tevtev123/): plain root HTTP200 and exact accepted document hash verified.
- [Cloudflare Worker](https://nivet-league.jikdifn.workers.dev/): plain root HTTP200 and exact accepted document hash verified; HEAD200, release/health10.6.0 and unknown route404.
- [Bunny](https://tevtev123.b-cdn.net/): plain root HTTP200,20,996,135bytes and exact accepted document hash verified at04:47:05UTC. CDN status was EXPIRED and the cached-at header updated to04:47:05. The [version URL](https://tevtev123.b-cdn.net/?build=10.6.0) was also verified independently.

At the initial post-deployment check, Bunny's bare root returned an invalid mixed20,994,439byte document (SHA-256 `a9163b3d4477f1573e1a2a091033bbbe36966aae4850dcae33e1fd056353b52c`). Its first5MiB exactly matched frozen10.5.0; every remaining byte matched the current10.6.0 at the same offsets, ending1,696bytes before the new document's EOF. This exact splice is proven by local byte comparisons. Stale segmented/ranged cache reuse is the likely mechanism; account settings and its internal cause were not verified. The result must not be called a valid10.5.0 or10.6.0 build.

Its cached-at header was04:06:02UTC, while the current origin was modified04:34:01UTC. A client no-cache request did not replace it. No authenticated Bunny cache-purge capability was available and no purge was performed. This issue subsequently resolved through cache expiry: the complete bare-root response at04:47:05UTC matched the accepted SHA-256exactly. The whole-document comparison establishes recovery; the earlier version-query success and600second response header alone did not. All three plain-root frontend hosts now serve the same accepted document.

Cloudflare version `415b2bcf-e189-4aa4-9519-c44be3ce1992`, deployment `36920691-7118-4b8a-8981-496b9461b7aa`, receives100%traffic. Code ETag remains `d453c4d08ccfd917365ea1922c91713a722d569c284b351bf6c152972f97d2f7`. Compatibility2026-10-28/nodejs_compat, ASSETS binding, cache-off settings and0.01observability sampling are unchanged; only build metadata moved to10.6.0. Temporary upload credentials were cleared.

## Delivery and limits

The portable file is `nivet-league-10.6.0.html`; the selected-source archive is `nivet-league-10.6.0-source.zip`. The source archive includes the handling reports, meaningful regressions and compact raw test/browser/deployment evidence. Its external `drive-zip-verification.json` records the final archive hash and every-entry SHA-256verification without creating a circular self-hash in the archive.

No physical Chromebook, hardware controller or independent multi-device internet playtest was available. Visible native keyboard sequences, rendered frames, shared-solver prediction comparisons and real two-client WebSocket checks are reported separately. They do not establish proprietary-game parity or resolve every possible subjective handling concern. Holding a driving key through takeoff no longer adds inherited pitch; release and press W/S again in flight to deliberately pitch. Raw directional dodge/cancellation commands retain their meaning.
