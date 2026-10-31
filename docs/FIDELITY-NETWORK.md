# Shared solver and reconciliation audit

Version 10.4.0 uses dedicated wire 2 and legacy room protocol 5. Old clients must reload. This solver revision adds `handbrake`, `autoFlipTime`, `autoFlipSign` and `ballHitCooldown` to the driver state used for reconciliation. Those fields affect the next simulation tick; omitting them would make input replay use a different state machine. Fixed simulation remains 120 Hz; dedicated snapshots remain 30 Hz.

These are Nivet consistency and stability checks, not Rocket League network fidelity measurements. No proprietary server was instrumented. The measured results below come from isolated JavaScript contexts running the actual shared source, not a real browser or socket. Actual Internet WebSocket checks, when performed, belong in the release verification report and are separate evidence.

## Reproduction and timing

Run `node scripts/measure-network-fidelity.cjs` and `node --test tests/prediction-fidelity.test.cjs` from the project. The committed numerical report is [measurements/network-fidelity.json](measurements/network-fidelity.json). The authority is `server/physics.cjs`; the predicted client is the source-loaded browser harness. Four two-second scenarios cover acceleration into a powerslide, an 18 m/s ball touch, an awkward landing from 3 m and an aerial dodge. The remote car is disabled for those comparisons so unknown opponent inputs cannot obscure local solver agreement.

There are five ordered application-delivery schedules per scenario:

| Schedule | Upstream input delay | Downstream snapshot delay | Application snapshot discard |
| --- | --- | --- | --- |
| Immediate |0 |0 | None |
| Downstream jitter |0 |6 ticks plus0/2/1/4 ticks | None |
| Downstream disruption |0 |12 ticks plus0/5/2/8 ticks | Every fifth |
| Bidirectional jitter |6 ticks plus0/2/1/4 ticks |6 ticks plus0/2/1/4 ticks | None |
| Bidirectional disruption |12 ticks plus0/5/2/8 ticks |12 ticks plus0/5/2/8 ticks | Every fifth |

One tick is 8.333 ms. Ordered delivery may hold a later message behind an earlier delayed message. The authority consumes one queued input per tick and reuses the last applied input on starvation, following the production service. This is not OS traffic shaping, TCP loss simulation or measured RTT. WebSocket/TCP ordinarily retransmits lost transport packets; deliberately discarding an application snapshot is a different stress test. The runner does not model remote competition, uplink bandwidth limits, congestion, browser pauses or physics-tick drops.

## Results and meaning

Across all 12 zero-uplink runs, car and ball position differences are exactly0 m, including after delayed snapshot replay; maximum quaternion comparison noise is 4.22e-8 radians. The strong touch is locally predicted on tick 2, before the first delayed snapshot. This establishes deterministic shared-solver agreement under the same input timeline, not zero-latency Internet play.

Nonzero uplink intentionally means the predicted car has already acted on inputs that the authority has not received. Comparing their positions at the same wall-clock tick therefore includes expected prediction lead as well as error. The following correction is the actual maximum change to local physics position when a delayed snapshot is applied and unacknowledged inputs are replayed, before the separate visual offset decays:

| Scenario |50–83 ms nominal uplink/downlink: max correction |100–167 ms nominal uplink/downlink plus discard: max correction |
| --- | --- | --- |
| Ground/powerslide |0.071 m |0.349 m |
| Strong touch |0.507 m |0.795 m |
| Awkward landing |0.329 m |0.533 m |
| Aerial dodge |0.334 m |0.592 m |

The adverse strong-touch trace has up to 3.247 m car and 3.958 m ball difference at the same wall time. These are reported, not hidden behind a passing “small error” threshold. In every run, after all pending inputs drain and a current fully acknowledged authority snapshot is applied, car/ball position error is 0 m and no input history remains. The longest measured unacknowledged history is 48 ticks, within the existing 120 tick cap. Final convergence alone does not prove good moment-to-moment feel.

The 8 focused tests additionally corrupt a local pose/velocity/boost deliberately, restore an older authority state and replay 16 unacknowledged frames; the result matches current authority physics. They verify all serialized scalar/vector state, rejection of duplicate snapshots and authority-owned car bump recoil. These tests use the production `dedState()` and `predictLocalBall()` functions.

## Known limitations and authority boundaries

The client predicts its own vehicle, arena contacts and its own ball contact. It does not predict remote car–car bumps or demolitions. A controlled overlapping-car test demonstrates that authority recoil differs until the next snapshot, then converges. Remote player inputs and poses cannot be known exactly in advance; adding guessed impulses would require a bounded rollback design and separate collision-ownership tests. This update does not claim to solve that architectural gap.

Remote cars use the authority tick timeline with a 50–100 ms jitter-dependent interpolation delay and bounded extrapolation; the local car uses immediate fixed-step input. Physics corrections are applied immediately, while render-only translation/rotation offsets decay. Existing 5 m local/3 m ball large-correction thresholds remain; no new long smoothing delay was added to conceal errors. Opponent hits, local predicted ball touches later contradicted by authority and delay-induced contact timing differences can still cause visible corrections.

Goals, scores, demolition outcomes, respawns, match clocks and phase changes remain authoritative. Predicted ball contacts do not award a goal or finish regulation. Training preferences cannot alter online physics. The source and server share the same vehicle/ball modules; no device-specific multiplayer physics is introduced.

No network performance improvement percentage, Internet latency parity or Rocket League equivalence is claimed from these controlled tests. Lower real RTT, robust server scheduling, prediction of interactions involving remote cars and independent multi-device playtests remain separate work.
