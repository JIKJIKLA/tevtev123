# Verification: championship lighting 9.9.6

**Story:** Load the arena through the normal preparation/start code, render the revised lighting from gameplay and garage cameras, retain matte car paint and native clarity, and keep all offline/online rules working.

| Boundary | Result | Evidence |
|---|---|---|
| Reference → art direction | Checked | Compared the supplied daytime gameplay image and the official DFH arena image with 9.9.5 and the new renderer. Reference assets are not shipped. |
| Default Chromebook scene | Passed | Actual WebGPU render, body `data-turf-backend=webgpu`, no browser warnings/errors. |
| Detail compatibility scene | Passed | Actual explicitly selected WebGL render with the higher-quality preset, body `data-turf-backend=webgl`, no warnings/errors after replacing the removed shadow-filter option. |
| Readability and finish | Checked | Chase/garage cameras and opposite field directions; warm greener turf, lighter goal interiors, colored source glow and matte paint. Captures use held production poses with no lighting overrides. |
| Lighting/geometry budget | Passed | Same 6/10 rig light counts, only the Detail sun can cast shadows, 2048 map retained, bounded shared halo geometry. |
| Grass/materials | Passed | Both live backends render the proximity shade, painted blades and wind materials. Existing matte-paint assertions pass. |
| Game rules and UI | Passed | 121 client tests, including both playlists/team sizes, camera, controls, goals/replays, first AI opening and preferences. |
| Shared server | Passed | 16 server tests, including lifecycle matrix, real WebSocket rooms/parties, readiness, input validation and synchronized powers. |

Screenshots in task outputs: `lighting-before-gameplay-9.9.6.png`, `lighting-gameplay-9.9.6.png`, `lighting-detail-9.9.6.png`. Production contains no held-review controls or forced bomb result. This is visual validation, not a claim of identical Rocket League rendering or a measured Chromebook frame rate.
