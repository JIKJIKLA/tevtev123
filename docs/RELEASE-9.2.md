# Tevin League 9.2

- Preserve imported car proportions using uniform scaling. Keep wheel baseline and longitudinal collision footprint.
- Keep vertical field of view consistent across window shapes (105 degree horizontal reference at 16:9). Keep ball-camera heading level near overhead passes, limit distant aim targets, and offset the camera inward on walls.
- Fix uphill starts: apply throttle during the remaining simulation time after braking a small gravity-induced rollback.
- Menu music is opt-in through Settings. A new saved preference defaults off, including for players with old automatic-music preferences. Browser autoplay restrictions still apply on future visits.
- Two original generated backgrounds, embedded in the portable HTML. The music artwork appears when playback starts.
- Fuller instanced crowd with heads and raised arms, plus skyline and trees. Five instanced draw calls total for crowd and outer scenery; no extra shadow maps or postprocessing passes.

Verification: automated simulation, UI, preference persistence, wall restart, and car proportion regression checks. No physical Chromebook performance measurement was available.
