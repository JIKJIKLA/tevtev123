# Match cinema 9.9.2

## Goal sequence

The replay follows the approach, final touch and flight, then shows the goal explosion from the field side. Its flight reaches the scoring frame at the end of the shot, including very short goals. The displayed ball disappears into the explosion; the camera stays in front of the goal rather than returning to a car or ball inside the net. Replay explosion time is sampled independently, without repeating score UI, goal audio, or gameplay events. Skipping a replay also leaves the camera outside the goal.

Goal presentation is synchronized with the shared 8.5-second goal hold: 0.8 seconds of live celebration, 6.6 seconds of replay action, a brief explosion, and a 0.45-second fade to full black. The next countdown appears through a 0.45-second fade out. This black transition takes 0.9 seconds in total. A winning goal fades to the match result. Countdown and goal presentation clocks use bounded real elapsed time while physics retains its 120 Hz solver and capped display catch-up.

## First VS AI kickoff

The first kickoff of a new VS AI game has a 7.2-second delivery sequence. Two ceiling latch panels open, a four-rotor delivery drone enters above the aperture, its grippers release the ball, and the ball falls into two decreasing bounces and a cubic-damped final settle. The camera follows the delivery, then eases back to the player's chase view. The last half-second is stationary, before GO. The countdown uses its normal 3, 2, 1 messages after the short delivery prelude.

This is a mesh and camera animation: the solver's ball remains at its usual kickoff/serve position with zero velocity during the countdown. The displayed ball rejoins it exactly when play starts. Heatseeker retains its normal serve position. The sequence is armed once per new game, not on subsequent goals. Practice, online play, the dedicated server and reduced-motion mode use the normal kickoff. Pausing freezes the countdown. Geometry is batched, has no shadow maps or dynamic lights, and is prepared during shader warmup.

A small 0.42-second presentation jolt accompanies GO, subject to the arena motion preference. Its maximum camera translation is under 4 cm. Repeated multiplayer messages cannot restart it.

## HUD and quick chat

Quick chat has an original speech icon, consistent blue glass styling, large phrase buttons, key badges, cooldown feedback and safe message cards. It closes after sending a phrase. Chat labels and notices use the same typography as the match menus. Ball-camera, practice and pause controls receive matching borders and spacing. Mobile chat retains its own position above the driving controls; landscape panels scroll when needed. Opening/replay shots simplify the HUD while preserving the score and countdown.

Validation covers the opening timeline and exact resting pose, first-round gating across both playlists and all team sizes, multiplayer/practice exclusion, reduced motion, finite batched geometry, field-side camera bounds, fade timing, slow display frames, one-shot kickoff shake, independently sampled explosion geometry and safe chat rendering.
