
# 9.1 — Aftershock

Repairs renderer selection introduced in 9.0: Chromebook quality no longer forces WebGL, and a failed initialization retries on a fresh canvas with default power preference and lower context requirements. Mode selection no longer initializes a 3D device. Devices that provide neither WebGPU nor WebGL2 receive recovery controls rather than a misleading performance-preset hint.

The title screen puts the game name and a large Play button first. Team sizes and playlists sit above the Online / VS AI / Private / Sandbox cards. Title-to-selection, entering a match, and returning to the lobby use fading loading screens tied to real work, with a short minimum display time for legibility. Countdown remains gated until the transition completes.

The supplied LUV U NEED U track attempts autoplay after page load and fades from zero to the selected music volume over six seconds using the audio clock. Browser autoplay rules can still require a click. Play unlocks sound without a separate Start Music step. Music continues in the lobby, pauses for gameplay, and resumes on return unless manually paused.

Original canvas visualizer: logarithmic radial spectrum, outward rings and particles, 30–160 Hz bass detection, adaptive attack detection, background blur/zoom/shake and split-color title glow. Music volume and reduced-motion preferences scale or disable effects. Canvas work is capped at 30 updates/second and 1280 pixels wide; it requires no 3D context. Inspiration: https://speckyboy.com/audio-visualization-code-snippets/ . No third-party snippet code or assets copied; no paid media credits used.

Validation: existing 17 game/backend regression tests plus four renderer/presentation tests. Real device GPU availability and physical Chromebook FPS still need device testing. A CDN may cache the previous HTML until refreshed or purged.
