# Championship performance pass — 10.2.1

The owner's direction is to run the existing 10.2 stadium more efficiently without reducing its appearance. This pass preserves the same resolution, textures, grass counts and coverage, four leaves per tuft, draw distances, lighting, effects, crowd population and game rules. The [10.2.0 visual release](RELEASE-10.2.0.md) remains the art-direction record.

## Work avoided

| Area | Change | What stays equivalent |
| --- | --- | --- |
| Grass | Use an ordinary Mesh with InstancedBufferGeometry rather than allocating an identity matrix for every tuft. Precompute each root's rotation, and share seven body direction/speed/ground terms once per frame. Branch around deformation only for fully collapsed grass or body interactions outside their conservative support. | 70,000 / 96,000 tufts, two opaque draws, geometry, fade radii, paint, wind, contact shade and wakes. Coverage regression remains at least 96%. |
| Static stadium | Re-index only byte-identical complete vertex attributes, with full collision checks and no quantization. Freeze immutable local transforms after batching; parent world transforms and crowd instance data remain live. | Expanded position/normal/UV/color triangle bytes, hard seams, material groups, triangle counts and draw calls. Unsupported animated, interleaved, instanced or special half-float layouts are left intact. |
| Camera fading | Keep the original opaque material path until the car actually obstructs the view. Clone shared materials only when fading is needed, restore original opaque/glass/depth modes at full opacity, and skip unchanged writes. | The same 33% obstructed-car target, interpolation, glass appearance and material ownership. |
| Particles | Compose the shared camera-facing billboard basis once, then write each particle's translation and color directly into the active buffer prefix. | Byte-identical matrices, colors, particle counts and buffer update ranges. |
| UI and debug geometry | Avoid unchanged tag styles/ARIA/relation writes, idle chat writes, temporary chat-list allocation and transforms on hidden hitboxes. | The same names, positions, team relations, chat timing and visible hitboxes. |
| Garage/title shadows | Reuse the exact shadow image while visible caster poses are unchanged. Refresh on car/body/ball/wheel pose or visibility changes and when returning from play. | The same map size, light direction and image. Live play still updates dynamic shadows every frame. |

## Structural and isolated measurements

- Grass GPU attribute storage falls by **3.92 MB in Chromebook / 5.376 MB in Detail**, after accounting for the added two-float rotation attribute. No tuft is removed.
- Seven shared body factors replace **13.72 million / 18.816 million** repeated per-vertex direction/ground evaluations per rendered grass frame. Guards skip only mathematically zero contributions, including very small velocities.
- The actual batched stadium falls from **54,486 to 26,874 vertices**, and **1,730,496 to 960,236 bytes** of vertex/index storage. Its 23 opaque draws and expanded triangle attributes remain unchanged. Recurring local compositions fall from 3,360 to zero over 120 updates.
- The isolated 900-particle uploader measured **1.748 to 0.563 ms/frame**, about 3.1× faster across seven alternating 2,000-frame Node VM runs. This is a component benchmark, not an overall game FPS result.

## Browser comparison and validation

The developer-only `scripts/stage-performance-preview.cjs` runs the production renderer at fixed six-car field poses, with the same visual settings. It warms the scene, records CPU submission and asynchronous WebGL timer queries, and publishes results in a DOM report. It does not ship in the game. A background-throttled browser cannot establish playing FPS; GPU-query timings and explicit viewport/buffer dimensions are recorded separately. 
The matched WebGL2 Chromebook scene used **1280 × 720, DPR 1, a 1280 × 720 drawing buffer**, six held car poses, 20 warm-up frames and 60 measured frames per build. The render counters were identical: **273 draws and 2,795,779 triangles** at the median. Each run produced 59 completed GPU queries.

| Measurement | 10.2.0 | 10.2.1 | Observation |
| --- | ---: | ---: | --- |
| GPU median | 6.48928 ms | 4.88980 ms | 24.65% less GPU time |
| GPU 95th percentile | 11.01140 ms | 8.36752 ms | 24.01% less GPU time |
| CPU submission median | 4.20 ms | 4.10 ms | Small difference; not a broad CPU claim |
| CPU submission 95th percentile | 6.00 ms | 5.20 ms | This run only |

Animation frames were background-throttled to approximately one per second in the embedded browser. Therefore these values measure the submitted GPU frame in that controlled context, **not interactive FPS, frame pacing, or certified Chromebook performance**. Raw JSON files are retained with the local publication artifacts. The repeatable developer fixture includes viewport and drawing-buffer dimensions in its report; earlier exploratory runs without fixed dimensions are not used for the comparison above.

The current combined suites pass 211 frontend and 34 server checks, with zero failures or skips. New regressions verify exact particle buffers, material restoration, quiet stationary UI, conservative turf support, complete static triangle bytes, shared resource cleanup and shadow invalidation. Actual WebGPU chase and WebGL garage/chase material compilation completed with empty warning/error logs. Image review retained the same dense painted grass, stadium detail, matte cars and shadows.

No resolution scaling, effect removal, texture downsampling, grass/crowd reduction, physics/network timing change, audio replacement, paid resource or hosting-plan change is introduced. Real Chromebook hardware testing remains necessary for a device-specific FPS claim.

## Publication

- Cloudflare is live at [nivet-league.jikdifn.workers.dev](https://nivet-league.jikdifn.workers.dev/). Deployment `763d79f0-d1b3-49f3-b833-bf22540e2bb9`, active version `978ddf08-3365-4049-afda-fffbe615140f`. GET/HEAD 200, health 10.2.1, release metadata matched, unknown route 404. Existing ASSETS/GAME_BUILD bindings and plan unchanged.
- Approved portable HTML: **20,181,273 bytes**, SHA-256 `d31f3a4f38c4da732bf2eb0cd8732fe3a1ecb4982d2ba16f2e9cec47c8f7edd0`.
- Phoenix source updated only after an idle-room check, with rollback backup `/home/ubuntu/tevin-before-optimization-10.2.1.tar.gz`. Shared solver preflight initialized, service active, health 10.2.1, 120 Hz simulation / 30 Hz snapshots and four-room capacity retained. Live TLS/private-room ready/kickoff/ability reconciliation checks passed; reported RTT was 154 ms from this test connection, not a latency guarantee.
- GitHub Pages and Bunny rollout verification will be recorded after publication. An older open tab keeps its old JavaScript until refreshed.
