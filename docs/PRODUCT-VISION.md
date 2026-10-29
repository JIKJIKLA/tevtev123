# Nivet League — persistent product vision

Owner request: 2026-10-23. This file is the durable end-result specification for future sessions, not a claim of human-like cross-chat memory.

## Non-negotiables
- Browser-first car soccer, recognizable blue/orange team identity, Nivet branding.
- Chromebook preset must retain detailed cars and native-resolution readability. Prefer batched/instanced scenery, baked textures and bounded effects; no mandatory heavy postprocessing.
- Same 120 Hz rules for humans and bots; Phoenix server owns online scoring, collision and match state. Prediction may improve responsiveness but cannot award goals or progress.
- All shared features support Soccar and Heatseeker, 1v1/2v2/3v3, offline, private and public matches. Training-only controls must never mutate an online match.
- Existing audio/music recordings and preferences stay intact. Add only externally sourced recordings with documented redistribution rights. No generated sounds or AI images.
- No paid services, account upgrades, purchases or subscriptions. No pay-to-win customization. Nonprofit status alone is not an asset license.

## End-result acceptance criteria
1. Contact: visible body matches collision volume; soft, glancing and powerful touches follow speed/angle. Swept local prediction mirrors authority. Heatseeker homing state travels with snapshots.
2. Handling: smooth throttle/brake/slide, frame-rate-independent response and momentum-preserving wheel landings. Avoid untested global physics retuning.
3. Mastery: jumps, dodge cancellation, air roll, dribbles and flicks emerge from physics. Practice supports repeatable aerial and recovery setups.
4. Recovery: curved-wall transitions preserve tangent momentum; roof recovery is intentional; camera does not spin with car flips.
5. Camera: presets, saved individual settings, bounded overhead ball framing, no floor clipping or disappearing local car.
6. Boost: retain original audio/flames, readable pad readiness, pickup feedback and a clear supersonic state; optional small presentation effects.
7. Ball: persistent landing marker and height cue, contrast in both halves, optional training hitboxes. No automatic aim assist.
8. Goals: scorer/assist details, team-colored stadium response, selectable visual celebrations, short skippable recorded-state replay. Online replay never pauses authority.
9. Arena: animated accent bands and spectators react with bounded updates; freeze excess motion when reduced-motion preference is active.
10. Audio: preserve original samples and mixing. Add licensed short cues only for new training/chat/progress interactions, with separate toggle and credits.
11. Training: shooting, saves, aerial, dribble, wall and recovery setups; repeat current shot, success/attempt counter, adjustable roster/boost; protect online state.
12. Teamwork: teammate labels distinguish YOU/ALLY/RIVAL; preset quick chat with server validation and cooldown; bots respect teammate possession and support lanes.
13. Identity: three named garage slots, saved paint/body/camera preferences, visual goal style and achievement titles with no mechanical advantage.
14. Flow: clear launch routes, rematch ownership, return-to-lobby, queue practice that cannot change queue rules, visible error/reconnect instructions.
15. Progress: device-local history, match/mode breakdown, honest local XP and achievements, export/reset; private best-of series with explicit host settings. Public ranked MMR/leaderboards require authenticated accounts and sufficient players; never fabricate ranks or count bots as public opponents.

## Verification matrix
- Soccar/Heatseeker × 1v1/2v2/3v3: initialization, kickoff, score, next round, end, rematch, finite positions.
- Mutators: normal/low/high gravity, speed 1/1.5/2, normal/unlimited boost; solver consistency at 30/60/120 display FPS.
- Dedicated: two real WebSockets, input acknowledgement, homing state, team-only chat, spoof/rate rejection, room ownership, disconnect cleanup, party queue, best-of series and rematch readiness.
- Browser: title→menu→offline/practice→pause→return; private host/join, goal overlay/replay, garage preset restore, music remains opt-in, added cues can mute.

## Release tracking
Current implementation and validation status is maintained in [AUDIT-10.1.1.md](AUDIT-10.1.1.md), the [Matchday release](RELEASE-10.1.0.md) and the [core match-effect catalogue](MATCH-EFFECTS.md). Older release records remain historical. Features not validated must be labeled honestly, not advertised as complete.

## Secret arcade request (2026-10-25)
The owner explicitly requested a hidden arcade overlay opened by typing secret and unlocked with the exact case-sensitive code spellingbeewinner. Include close/minimize/restore, twelve humorous powers and authoritative use in offline, private and quick matches. Online use is announced to all players; the code is a public client-side easter egg, not admin access. See SECRET-ARCADE.md.

The grass follow-up uses the same field texture on all blade roots so team paint covers the turf itself. Three curved/tapered leaves per tuft, broad wind gusts and vehicle wakes are the intended art direction, inspired by the user's Chapter 4 Season 1 grass reference. This is an original lightweight implementation, not Fortnite assets or engine features.

## First-kickoff presentation follow-up (2026-10-26)
This historical request is superseded by the roof/drone/flyby direction below.
The opening uses a sliding glass skylight at the top of the arena, with two tinted leaves and a slim rail frame; no drone or opaque metal hatch. It only runs on the first kickoff of a new VS AI game. The ball drops, bounces and eases into its normal serving pose before GO. Each new VS AI match independently has a 1% chance to deliver a fuse bomb instead: a radial blast catches every car, then TEVIN WINS appears with Play Again and Back to Lobby. This is a local Easter egg; it cannot affect multiplayer, practice, normal scoring or career results. Reduced motion keeps the surprise/result without the extended opening, shake or particle blast. Keep the existing audio. Camera handoffs, loading gates and goal-to-countdown transitions must feel continuous and avoid flashes or stray views inside the goal.

## Fixed roof, aerial delivery and short invites (2026-10-27)
Historical delivery choreography; the airshow direction below supersedes the drone and single flyby.
The owner clarified that the doors belong in the stadium roof at its roofline. The roof and hatch frames stay fixed; only the glass leaves slide sideways. A delivery drone arrives from above the stadium, stays above the roof, releases the ball through the opening, then departs upward. A fast F-22 flyby uses the owner's supplied model and textures, with twin afterburners and a brief bounded camera/HUD impact. Keep this first VS AI opening quick, preserve the 1% bomb, and respect reduced motion. Improve the stadium walls with curved metal kickboards, fine hex mesh, repeated original Tevin display panels and structural ribs. Private match and Quick Match party codes use exactly three digits, including leading zeros; allocate uniquely across both types and show a numeric keyboard on phones.

## Three-jet airshow and independent ball (2026-10-27)
The latest owner direction removes the delivery drone entirely. During the first VS AI countdown, three supplied F-22s fly in formation: the center aircraft continues straight with orange smoke and exhaust, while blue-trail wingmen bank and peel in opposite directions. The ball falls by itself from above the stadium through the fixed sliding glass roof doors, bounces with diminishing energy and eases to a complete stop precisely at zero. Keep the opening brief, show the numbers, frame the formation and hand back to the normal chase camera before GO. Camera and HUD shake follow the pass and obey both shake and reduced-motion preferences. Retain the 1% bomb, subsequent standard kickoffs, and multiplayer authority. The requested RTX aesthetic means richer physically based stadium lighting/reflections and depth, with a Chromebook-friendly path; never advertise actual hardware ray tracing when the renderer does not provide it. Keep the approved photographic sky, native resolution and matte paint.

## Stylized championship lighting (2026-10-27)
The owner emphasized that the visual goal is Rocket League's stylized stadium art direction, rather than realism alone. Use actual gameplay/arena screenshots to judge the result. Favor a green sunlit pitch, distinct sun/shade regions, readable neutral structure, warm lamp light, strong blue/orange team identity, and clear car/ball silhouettes. Paint must stay matte with restrained reflections. Check the result from the chase camera, garage and both field ends, including Chromebook quality; brighter exposure or shinier cars alone is not the requested improvement. Keep the approved sky, audio, camera/airshow choreography and all game rules intact.


## Owner direction — Nivet League (2026-10-27)

The entire active game identity is Nivet League. Menus use near-black and deep velvet violet; the playable arena stays blue/orange. Aim for Rocket League-like proportions, car-soccer handling, camera readability, stadium atmosphere and clear play/garage flow. Prefer stylized, colorful sports lighting over photorealism. Paint stays matte. Every improvement must work across both playlists, team sizes and supported offline/online flows; preserve saved controls, progress and audio opt-in. Keep physical scale calibrated to published measurements, fit visible wheels to physical contacts, and review the actual chase and garage renders. Similarity is an end-result direction, not permission to claim exact proprietary-engine parity. Retain the requested cinematic/arcade features and free existing hosting.


## Matchday direction and hosting (2026-10-28)

The owner wants the ordinary match feel to approach Rocket League across movement, event timing, feedback and stadium lighting. Maintain the 35-family catalogue as a concrete checklist, with current behavior, validation and gaps. Boost exhaust must follow active simulated thrust; supersonic wheel trails are a separate state. Short boost taps obey the measured minimum burst. Add useful, bounded tyre/contact/ball feedback rather than a constant screen filter or unbounded particles. Demolition and three-second respawn are shared rules: forward opponent bumper contact qualifies, victims are inert, authority decides online outcomes and respawns never draw trails or corrections across the field. Preserve all existing team sizes/playlists and saved preferences.

For the custom first-AI opening, the stadium and roof remain fixed. A flyover should read as aircraft passing above the stadium, with screen/HUD wake and a little loose canopy dust, never as a crash. The supplied jets keep their geometry, appear smaller through greater altitude and bank into smooth curves. The independent ball fully clears the glass roof opening and settles at GO; visual staging does not send the physics ball through its ceiling. Keep the rare bomb, normal subsequent/online kickoffs and reduced-motion behavior distinct.

Lighting should give a warmer key, restrained cool fill, readable sun/shade and tight contact shade without washing every surface white or making paint glossy. Retain the photographic sky, crisp field markings, blue/orange match identity and black/velvet menus. Browser review of actual WebGPU/WebGL output matters more than a list of effect names. Do not claim exact 1:1 proprietary handling, every cosmetic variant or certified Chromebook FPS.

Cloudflare Workers is now an additional host for the same browser JavaScript/HTML asset. The small Worker does not render the game or replace Phoenix simulation. Keep the existing Pages/Bunny URLs and their origin allowlist entries; add new exact origins deliberately. No paid resource, plan upgrade or new audio/AI asset is authorized by this direction. Hosting usage must stay within the account's actual plan/limits; do not promise every use is free. Local saves on a new hostname are separate, and must never be described as automatically migrated.

## Whole-game refinement (2026-10-28)

The owner authorizes a review of all maintained game systems and improvements justified by demonstrated defects. Preserve the accepted visual direction and existing recordings rather than changing style for its own sake. Review gameplay, modes, authority and prediction, match/queue lifecycle, keyboard/controller/touch input, loading, garage/settings/progress, camera/replay, bounded effects and graphics recovery. Fix and validate useful behavior across the existing playlist/team-size matrix. Public queues stay human-only; a partial vacancy remains empty, a completely departed team forfeits, and abandoned loading reservations cancel without XP. Long matches may continue while a human is actively driving; neutral traffic must not defeat the idle-room guard. Local progress backups need validated, explicit restore without importing controls, rules or network data. Record residual approximations and tested-device limits honestly.

## Dense championship turf and stadium craft (2026-10-29)

The owner wants a drastic visual improvement, especially grass dense enough that the flat field underneath is difficult to see around the car. Favor an overlapping, short, cut-grass canopy over scattered triangular weeds. Preserve readable field-wide mowing, with blue/orange and white paint on the actual blades. Wind and tire/ball wakes should move the turf naturally and obey reduced motion. Use a dense near-camera layer with smooth falloff and a bounded lighter field layer; never tile visible density seams across the pitch. Photographic micro detail should supplement the geometry at distance, retaining the green stylized sports palette.

The stadium needs believable layers and occupancy: seating rows, restrained varied crowds, concrete tiers, steel trim, recessed fascia, warm fixtures, fine cage mesh and rounded goal tunnels. Keep the mouth of each goal visually and physically clear. Judge improvements in actual gameplay and garage renders under both WebGPU and WebGL, not only from geometry counts. Matte cars and real contact shade should anchor tires to the grass. Preserve rules, audio, menus, multiplayer authority, fixed field proportions and existing free hosting without adding paid resources. Current implementation and verification for this visual pass: [RELEASE-10.2.0.md](RELEASE-10.2.0.md).

## Preserve appearance while optimizing (2026-10-29)

The owner asks for better performance without losing the accepted visual quality. Keep dense grass, all current textures and resolution, the crowd, lighting, goal/boost effects and existing camera/motion preferences. Prefer eliminating mathematically zero shader work, identity transforms, duplicate static vertex attributes, redundant material/DOM writes and repeated shared particle calculations. Reuse an unchanged shadow image in the garage, while preserving dynamic shadow behavior during play. Demonstrate equivalence with source-aware regressions and actual WebGL/WebGPU views. Benchmark at explicit matching viewport/quality settings; background browser timing is not playing FPS and isolated component speedups must not be advertised as whole-game improvements. [Current performance record](PERFORMANCE-10.2.1.md).
