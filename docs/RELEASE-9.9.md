# Cinema 9.9

The update refines camera visibility, replay direction and the venue's presentation without resizing the collision arena or changing car/ball handling.

## Camera and labels

The chase camera projects into the existing rounded arena/goal-pocket distance field, then sweeps the segment from the car to reject paths through walls. A gradual wall orbit and a two-subject aim keep the wall-riding car and ball across the pitch in view. Ball camera can aim down from walls and aerials. When a constrained camera or the player's body blocks the ball, local car materials blend to 0.33 opacity and return to their original opacity/depth state. Cloned materials keep opponents and shared paint references independent. The material variant is prepared before warmup.

Nameplates display the driver's name with a small color key and downward anchor, rather than a repeated ally/rival prefix. Screen-reader labels still distinguish teammates and opponents.

## Replay and transitions

Replay buffers retain up to eight seconds of copied poses, touch counters and last-player metadata. Online poses use the authority's tick clock. The director finds the final recorded contact, starts from midfield, moves into a car follow shot, eases into a close slow-motion contact view, then transfers focus to the ball and widens as playback accelerates. Short flights finish with a brief goal hold. Replay elapsed time uses real time, including throttled displays.

The authority/offline goal hold is 9.4 seconds: 1.25 seconds of live celebration, up to 6.6 seconds of replay, and time for the exit/kickoff transition. Scene dissolves occur on replay entry/exit and kickoffs, not every countdown packet. Reduced-motion preferences suppress these overlay animations.

## Venue and menus

Slight blue-violet distance fog, cool fill and warmer goal lighting add color while nearby gameplay stays clear. Bounded team-haze sprites supplement the existing lighting; no volumetric or extra post-processing pass is introduced. The stadium district adds a glazed outer facade, covered gates, a pedestrian apron, trees, lamps and taller corner cable towers. Its geometry is outside the pitch; the floor, goals and physics dimensions are unchanged.

Mode cards use original inline vector illustrations, clear labels and a persistent primary action on desktop as well as mobile. Forms retain one scroll surface; the original underlying matchmaking actions handle the launch. Loading uses restrained type, real progress and a softer dissolve. Existing sound assets and music preferences are preserved. No AI images or new runtime asset requests are added.

Implementation references checked through Firecrawl: [Three.js fog](https://threejs.org/manual/en/fog.html) and [Material properties](https://threejs.org/docs/api/en/materials/Material.html).
