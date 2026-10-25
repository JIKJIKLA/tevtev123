# Rivals deployment checkpoint — 2026-10-24

Release 9.6 was published to JIKJIKLA/tevtev123 at f4855c86c27529ee298a76a9dda2f88ccd46c087. GitHub verification and Pages deployment succeeded. GitHub Pages and Bunny both returned the 9.6 artifact. A follow-up fixes garage labels and clears sandbox state on lobby return.

Phoenix endpoint: https://tevin-161-153-26-154.sslip.io/health and WSS /play. Health reports build 9.6, 120 Hz physics, 30 Hz snapshots, four-room cap. The deployment was performed with zero active rooms. The previous source is backed up at /home/ubuntu/tevin-before-9.6.tar.gz. No cloud resources, paid tiers, firewall rules or credentials were added.

Twelve dedicated-server tests passed on the actual ARM VM, including Soccar/Heatseeker × 1v1/2v2/3v3 scoring/end/rematch, series, chat isolation/cooldown/spoof rejection, controls, ownership, party queue and cancellation. The public TLS/WSS two-client check passed from both allowed origins; one measured ping was 31 ms, not a player latency guarantee.

The public browser loaded the arena and menu, entered training, drove and boosted, repeated a shooting drill, cleared the GO overlay, returned to the lobby and saved/restored a garage slot. Screenshot capture was unavailable in the browser tool, so visual quality and real Chromebook FPS are not claimed as measured. Local browser preview permission had been denied; no workaround to access that local URL was used.

The full suite passed 55 tests before publication. The follow-up adds two regressions for garage labels and training exit; its targeted 19-test suite passed. CI runs the complete 57-test suite on every push.

The public server IP is ephemeral. If Oracle changes it, the endpoint hostname/certificate/client config must be updated together. Existing service is /opt/tevin/server with systemd unit tevin, unprivileged user tevin, behind nginx/TLS. The SSH private key remains outside the repository.
