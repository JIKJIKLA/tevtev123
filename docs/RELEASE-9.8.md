# Championship 9.8

Multiplayer presentation and stadium refinement across Soccar, Heatseeker, all team sizes, AI, training, private rooms and public queues.

The online countdown previously compared the DOM's string text with a numeric snapshot value. That comparison always differed, restarting its opacity entrance on every 30 Hz snapshot. Messages now normalize to strings, and countdown snapshots keep the number visible through short packet gaps. Message expiry uses real elapsed time so the GO banner cannot linger when the display is throttled.

Remote-car playback now uses the server's existing 120 Hz tick number. Packet-arrival variation adjusts a bounded 50–100 ms interpolation delay. The playhead never rewinds, catches up gently, and extrapolation ends after 40 ms without a new sample. Stable connections avoid the old unconditional 100 ms drawing delay. Local steering reconciliation keeps a decaying quaternion correction for the visible car, with phase/teleport resets. No simulation forces, gameplay rules, server tick rate or authority permissions change.

The stadium uses shared low-poly rounded fan geometry and varied crowd colors in its existing seating layout. Continuous rounded concourse displays, roof undersides/ribs, lamp housings, hospitality bays and championship pennants are merged at load time. Turf gets stronger normal detail and baked edge shade; warm key light, cooler reduced fill and lower environment intensity retain daylight without washing the materials white. Team emissive strips follow saved paint. Existing music, sound clips, sky photography and grass backends are preserved.

Regression coverage includes repeated numeric countdowns, bounded jitter adaptation, monotonic render time, interpolation using authority ticks, local steering reconciliation, and finite concourse geometry outside the collision arena. Full browser and live-server checks accompany publication; device frame rates still depend on hardware.
