# Verification: airshow kickoff 9.9.5

**Story:** Launch the portable game, choose VS AI, prepare the supplied aircraft and stadium lighting, run the first countdown with an independent ball drop, then return to ordinary car/ball gameplay at GO.

| Boundary | Status | Evidence |
|---|---|---|
| Title and settings | Passed | Normal browser launch shows Music Off; saved Airshow Camera & HUD Shake is enabled separately from driving-camera shake. |
| Match selection | Passed | Title → Settings → lobby → Play → Heatseeker → 2v2 → Play VS AI enters the actual renderer. |
| Embedded assets → renderer | Passed | Three aircraft with original mesh/maps and colored curved smoke render; browser error/warning log is empty. No new runtime asset downloads or environment credentials are required. |
| Lighting preset → scene | Passed | Chromebook and Detail both render the HDR environment. The approved photographic sky and matte car paint remain. |
| Countdown → gameplay | Passed | The live opening proceeds to normal HUD, running match clock, car movement and ball contacts. The opening caption, aircraft and impact class clean up. |
| Serving positions | Passed | Soccar and Heatseeker doubles renders checked. The Heatseeker approach is mirrored to match its camera; analytic tests cover both playlists and all team sizes. |
| Client physics and presentation | Passed | 119 automated client checks, including exact rest at zero, hatch clearance, shared model buffers, deterministic fixed-size smoke, saved impact preferences and reduced-motion behavior. |
| Multiplayer authority | Passed | 16 server checks cover all Soccar/Heatseeker sizes, real WebSockets, match/party flows, readiness, controls, scoring and synchronized powers. The five-second ball presentation does not run online. |

Actual browser screenshot: task output `airshow-9.9.5.png`. Held-frame review controls are developer-only staging output; production `index.html` contains no held-time controls or forced bomb result. No hardware-ray-tracing or measured Chromebook frame-rate claim is made.
