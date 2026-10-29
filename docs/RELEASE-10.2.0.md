# Nivet League 10.2.0 — Championship

This release rebuilds the turf and stadium presentation around the actual chase and garage cameras. Green cut grass, painted fibers, readable blue/orange goals, neutral stadium structure and grounded cars take priority over shiny paint or a full-screen color filter. The [product vision](PRODUCT-VISION.md) retains the owner's direction; the [10.1.1 audit](AUDIT-10.1.1.md) remains the record of the preceding gameplay fixes.

## Turf and paint

Two opaque instanced grass layers give the nearby surface a dense, clipped canopy, with shorter distant fibers and a smooth transition. Curved leaves have darker roots, restrained tip variation, directional mowing, wind and car/ball compression. They sample the same field texture as the ground, so white lines and blue/orange paint cover the blades themselves. The physical field and collisions are unchanged.

The ground combines original 2048 × 2560 mowing/paint art with photographed grass luminance, normal and roughness maps. The photograph repeats at its documented 2.5 m scale, independently of field markings. It adds micro detail without turning the green field brown. The three CC0 JPEGs are embedded in the portable game; no new texture request is needed during a match. [Asset provenance and license](TURF-ASSETS.md).

## Stadium, light and cars

- Rounded, layered goal shells, recessed tunnel ribs, gasket gaps and narrow colored channels surround the existing goal opening. Decorative geometry does not narrow its collision mouth.
- Machined kickboards, finer hex cage material, recessed display fascia, concourses, warm roof lamp housings and seating detail replace broad flat surfaces. Low cage ribbons and a central end support no longer cross the goal opening.
- Concrete and steel use warmer, brighter material colors, while the roof and recesses remain charcoal. Shared materials are styled once, preventing repeated color interpolation from flattening the whole stadium.
- One sun shadow map follows the rendered local car in either preset: 1024² in Chromebook, 2048² in Detail. It is limited to nearby cars/ball; the full stadium is not made into a live shadow caster. Contact shade supplements the focused shadow and distant ball marker.
- Matte body paint remains intact. Only recognized window materials have their strong clearcoat softened. The garage car and its camera move together off the bright midfield stripe, with four tire contact cores instead of a hovering round shadow.

## Verification and limits

The combined build passed 199 frontend checks and all 34 server checks: 233 tests, zero failures or skips. These include the existing offline/online mode matrix and shared physics, resource failure/retry/cleanup, actual pinned shader factories, shadow following, seating occupancy and turf coverage. Actual WebGL garage and WebGPU chase views at both field ends rendered with empty warning/error logs, including Chromebook and Detail presets. A geometry projection check verifies dense near-field coverage; browser images remain the visual acceptance evidence.

This is a substantial original browser stadium overhaul, not Rocket League assets or proprietary-engine parity. Native field dimensions, gameplay rules, audio recordings, opt-in music, saved preferences and Phoenix authority are retained. Geometry remains bounded and shared, but a real Chromebook hardware frame-rate certification is still needed. Detail mode costs more GPU work. No paid plan or new paid resource is enabled.

## Publication

- Cloudflare: live at [nivet-league.jikdifn.workers.dev](https://nivet-league.jikdifn.workers.dev/), active version `c0e91830-65cc-47f3-958c-ff5f9104a6de`, deployment `7ee18925-aef2-4ba6-903b-a52e63c77173`. Exact approved HTML: **20,173,014 bytes**, SHA-256 `c2b1b40cb3034eadd7dc466308fb8caf45fbc0888d8f6cecb6f542e5f9d33f69`. GET/HEAD 200, health 10.2.0, unknown route 404. Only existing ASSETS/GAME_BUILD bindings; cache disabled.
- Phoenix: idle-room guarded source update with rollback backup `/home/ubuntu/tevin-before-championship-10.2.0.tar.gz`. Shared solver preflight initialized, service active, health 10.2.0 at 120 Hz simulation / 30 Hz snapshots, four-room limit unchanged.
- GitHub Pages and Bunny: rollout verification will be recorded after the selected source/artifact publication. Use a versioned Bunny URL when the unversioned cache is old; do not assume a successful origin deploy purges the CDN.
