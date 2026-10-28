# Nivet League 10.0.0 — Velvet arena

The game is now Nivet League. Near-black and deep velvet violet frame the title, lobby, match setup, garage, settings, private-room lobby, loading and pause screens. The playable stadium retains its saturated blue/orange identity and matte cars. The reference is Rocket League's stylized sports presentation, not photorealism alone.

## What changed

- Rebranded visible title, menus, pitch lettering, LED ribbons, wall shields, end screens, match opening, secret lab, rare bomb result and progress-export filename. Internal storage keys, network identifiers and the existing site URLs stay compatible, so existing saves and preferences survive.
- Compact left-hand home navigation, a clearer Play action, a coherent selected-card treatment, and the existing persistent match-start dock on desktop and phones. Mobile keeps one scroll surface. Keyboard arrows navigate relevant choice groups; controller D-pad/A/B navigate menus without feeding driving controls. Loading returns focus to the active screen.
- The arena always uses blue/orange. Normal team-color matches paint cars and scoreboards accordingly. The garage retains personal RGB paint; hosts can explicitly disable Team Colors for personal-paint matches.
- Visible wheel tracks now align with the measured axle contacts. Octane width changes by about 10.86%, Fennec 1.78%, Dominus 7.38%; length, height, wheel baseline, hitboxes and physics are unchanged. This corrects the imported model fit without inflating each silhouette to the full collision box.
- Fresh camera settings use a 110-degree horizontal field of view, 2.7 m distance, 1 m height and 3-degree tilt. Existing saved camera settings remain. Balanced applies the new defaults. Portrait framing keeps the whole car visible. The default garage angle presents a front three-quarter view and still supports drag/keyboard rotation and zoom.

## Scale and play

The field remains 81.92 × 102.4 m with a 20.48 m collision ceiling; goal opening 17.8551 × 6.42775 m; ball radius 0.9125 m. Standard boost coordinates, 120 Hz simulation, 23 m/s car limit and authoritative Phoenix multiplayer remain. Soccar/Heatseeker and 1v1/2v2/3v3 use the same shared rules.

Choreographed first-AI airshow/ball drop, rare bomb, replays, goal celebrations, secret arcade, training, touch controls, matte materials and existing recordings remain. Music remains off until explicitly enabled. No new paid services, AI images, generated sounds or redistributed Rocket League artwork.

## References and practical limits

- [RLBot useful game values](https://wiki.rlbot.org/v5/botmaking/useful-game-values/): field, ball, goal and boost scale.
- [Rocket League interface screenshots](https://interfaceingame.com/games/rocket-league/): menu framing, game selection, garage and match presentation, inspected for reference only.
- [Pinned RocketSim car configuration](https://github.com/ZealanL/RocketSim/blob/c2baacb8f4b441dd8505e63c2aeb5a1679b60b02/src/Sim/Car/CarConfig/CarConfig.cpp): existing collision and wheel measurements.

This remains an independent browser simulation. Arena corner collision, suspension/contact response, bot intelligence and effects are approximations; this release does not claim engine parity or certified Chromebook frame rates. See [verification](VERIFICATION-10.0.0.md).
