# 9.6 — Rivals

## Implemented
- Heatseeker snapshots carry homing direction, speed and cooldown. Local collision prediction sweeps the car over each fixed step; authoritative scoring remains on the server.
- Ball-camera overhead aim is bounded. Balanced/wide/close presets preserve individual saved controls. Replay cleanup does not reset the chase anchor during ordinary play.
- Bounded 150-frame replay history, a recorded-state goal replay, skip control, scorer/assist/speed details, and pulse/comet/minimal goal presentation.
- Ball ground ring, optional ally/rival labels, boost pickup feedback, optional speed edge effect, team accent lighting and instanced crowd animation. Motion respects reduced-motion preferences; native-resolution rendering stays intact.
- Seven practice options: free play, shooting, goalkeeper, aerial touch, dribble, wall touch and recovery. Repeatable setups, attempt/success counts and optional actual car hitbox overlay. Practice commands reject online matches.
- Four preset team messages with keyboard/button input, server-side identity, teammate-only delivery and cooldown. AI teammates yield briefly to an 'I got it' claim when away from the ball.
- Three garage slots for body/paint/goal style; earned titles. Local XP, match history, export and reset. Training grants separate drill progress; repeated end packets cannot duplicate match rewards.
- Best-of-three/five series, host-only private rematches, preserved series totals, reset match statistics, and practice while public matchmaking remains active.
- Three unmodified CC0 Kenney recordings for new interactions. All existing engine/music/effect recordings remain intact. Music remains opt-in; new cues have a separate switch.

## Verification
Automated gameplay/DOM and dedicated-server tests cover both modes at all three team sizes, goals/end/rematch, fixed-step controls, collisions, boost, camera framing, persistence, drill repeat/success, replay bounds, series totals, two-client networking, parties and queue cancellation, origin rejection, team chat isolation and spoof/rate rejection. CI runs both suites and checks the generated HTML is current.

Browser preview on localhost was denied by the browser permission gate. Public deployment checks are recorded in the deployment checkpoint after release. No claim of real Chromebook performance benchmarking is made.

## Deliberate limits
- Local XP and titles are device data, not trusted competitive ranks. Ranked MMR, public leaderboards, tournaments and replay-file sharing remain future work.
- Replays cover the recent goal sequence, not a full-match replay editor; online simulation continues during replay.
- Existing calibrated driving, jumping, sliding and wall physics are retained. This is a refinement release, not an exact commercial-game physics reproduction.
- Existing custom team paint is preserved. Arena identity and score colors remain blue/orange.
- No additional paid service, subscription or generated image/sound asset was introduced.
