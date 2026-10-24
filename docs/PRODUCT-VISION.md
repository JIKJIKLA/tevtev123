# Tevin League — persistent product vision

Owner request: 2026-10-23. This file is the durable end-result specification for future sessions, not a claim of human-like cross-chat memory.

## Non-negotiables
- Browser-first car soccer, recognizable blue/orange team identity, original Tevin branding.
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
Implementation and validation status for each deliverable is maintained in RELEASE-9.6.md. Features not validated must be labeled honestly, not advertised as complete.
