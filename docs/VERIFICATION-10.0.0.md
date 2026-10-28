# Nivet League 10.0.0 verification

## Acceptance

- Built HTML must boot without JavaScript errors on automatic WebGPU and explicit WebGL.
- All visible brand surfaces say Nivet; existing storage keys preserve old player preferences and progress.
- Team-color matches stay blue/orange across all team sizes and both playlists; personal-paint mode remains an explicit host rule.
- Imported car tyre track follows the collision wheel contacts, with unchanged height/length and no floating wheel baseline.
- Title → home → play/garage/settings/party, keyboard navigation, persistent play dock and phone scrolling remain usable.
- Shared simulation and networking tests pass before publishing. Existing Oracle service restarts only when no active room exists, with a source backup.

## Results

- Portable build succeeded. Client suite: 134 passed; dedicated server suite: 17 passed (151 total).
- Browser review: automatic WebGPU Chromebook and explicit WebGL Detail rendered without warnings/errors. Live AI match accepted W+Shift input: speed rose from 0 to 48 km/h and boost fell from 33 to 11. A subsequent AI goal advanced the score, and pause/return-to-lobby worked.
- Desktop title, lobby, three-quarter car preview, match cards and loading screens reviewed. At 390×844, portrait garage contains the whole car; match setup scrolls while the Play dock remains visible. Browser viewport restored after verification.
- Real keyboard ArrowDown moved Play focus to Garage; Enter opened Garage. Six menu tests also cover controller edges, typing exclusions, hidden/disabled controls and the detached launch dock.
- Existing saves preserve custom body/paint, camera bindings, local XP and explicit music opt-in. Rendered old-brand texture strings are absent.
- Oracle source was backed up to /home/ubuntu/tevin-before-nivet-10.0.0.tar.gz, then the existing service was updated only after health reported zero rooms. Health now reports nivet-match-server build10.0.0, 120 Hz physics, 30 Hz snapshots, capacity4 and no dropped ticks.
- Live two-client WSS verification passed for both existing site origins: three-digit match/party codes, readiness, authoritative kickoff/reconciliation, shared ability state and custom personal-paint mode. Connections closed after the checks.
- GitHub Pages/CDN publication verification is performed against the final HTML Git blob after committing. No real Chromebook hardware FPS measurement or exact proprietary-engine equivalence is claimed.
