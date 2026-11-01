# Readability and stadium presentation repair

This pass is separate from vehicle handling. Its starting point is the frozen **10.4.0** source/build in `outputs/control-baseline-10.4.0`, not a claim that the older appearance or a proprietary renderer is a numerical target. It uses existing models, original texture atlases, photographic sky, audio and Nivet branding. No generated or replacement artwork is added.

## Observed weaknesses

The actual 10.4.0 gameplay screenshot shows the rear chassis, trim and tires merging into a black silhouette below bright paint. The broad goal interior is also almost black. Roof undersides and alternating concourse/crowd rows form strong dark/bright lines behind play. Near-camera grass has a wide dark-root/bright-tip range and a strong repeated photographic micro normal, producing a pebbled, noisy carpet. These are visible readability problems; screenshots alone cannot establish moving-game shimmer or controllability.

The original embedded ball atlas was inspected directly. It already contains gray foam panels, dark mechanical seams and teal connectors. The warm brown appearance seen in gameplay was therefore not a reason to replace its artwork.

## Material and composition changes

| Area | Change | Preserved |
| --- | --- | --- |
| Lighting | Softer warm key, stronger neutral/cool diffuse fill and ground return, quieter warm rim; modest distance haze begins inside the far stadium bowl | Photographic sky, same 6/10-light presets, one dynamic shadow caster, same shadow sizes and focus |
| Cars | Narrow imported-material signatures identify chassis, trim, rubber, rims and lamps. Chassis/trim/rubber use more readable diffuse reflectance and higher roughness; rims retain a restrained metallic response. Tire normal strength is lower | Body colors, source texture maps/UVs, matte paint/zero clearcoat, geometry and collision proportions; unknown/custom dark artwork is untouched |
| Contact shadow | Reduce broad center darkness while retaining four localized tire cores | Existing shadow plane, one shared map and actual focused sun shadow |
| Ball | Preserve supplied albedo and geometry; adjust material response and derive one 256×256 emission map from only the existing teal connectors | Foam, seams and atlas padding remain non-emissive; no permanent whole-ball glow, enlarged halo or collision change |
| Turf | Reduce photographic normal strength, use a 3.5 m tile, narrow luminance modulation and grass root/tip/random-color variation | Exact 30k+40k / 42k+54k root counts, leaf geometry, near-field canopy, sprayed blue/orange/white paint, wind and body wakes |
| Stadium | Lighter blue-gray roof/reveals, readable goal backing and quieter crowd clothing/instance contrast | All seating positions, spectator count, bowl/goal/cage geometry, signage and blue/orange channels |

The ball mask keeps the original atlas immutable and owns its new texture on the rendered material. The existing resource disposer owns both the original imported map and the derived material map. Mask generation occurs once during scene preparation; repeated styling does not allocate again. If image processing is unavailable, the original ball remains valid with restrained emission.

The diffuse-light and material work changes actual surface response. No extra postprocessing pass, dynamic environment capture, bloom increase, particle-count increase or geometry-density reduction is used to produce the difference.

## Matched-capture correction

The first matched 1280×720 Chromebook-preset captures were inspected and rejected as too subtle: roof/goal midtones moved, but the rear chassis and tyres were still nearly black. Inspecting the original tyre and Octane chassis atlases exposed the remaining cause. Those images already encode dark rubber, metal and recesses; another dark sRGB material multiplier reduced their reflectance a second time. Raising that multiplier only slightly could not expose their detail.

The second pass lets recognized mapped tyre/chassis/rim surfaces use a neutral multiplier while retaining their exact original maps, UVs and pixels. Untextured fallback geometry keeps separate dark solid colors. No tyre or chassis emission is added. The same existing diffuse fill now arrives lower across the rear/sides of the cars, with brighter neutral ground return; the warm key and controlled matte body finish remain. This is an actual material/light-direction repair, not an exposure or bloom increase.

Recessed goal panels also use more suitable diffuse reflectance and a small texture-following baked return to represent missing indirect daylight/turf bounce. Their panel seams and bolts remain visible. Team-colored spectators occupy fewer seats and receive quieter clothing tint, retaining every spectator and seating pose. The pitch uses broad, softly edged transverse mowing lanes instead of a competing checkerboard. Both dense grass tiers, wind, normal geometry and body wakes remain intact.

`tests/car-finish.test.cjs` additionally runs the three actual imported factories with and without their source maps. It verifies that already-dark atlas content retains most of its diffuse multiplier, while untextured rubber/chassis remain dark, all texture ownership stays intact, and no emissive tyre/chassis treatment is used.

## Focused validation

`node --test tests/visual-repair.test.cjs tests/car-finish.test.cjs tests/pitch-detail.test.cjs tests/grass.test.cjs tests/radiance.test.cjs tests/arena-craft.test.cjs` passes **29 tests** against the source components at this stage.

- Teal-port masking excludes foam, gray seams, warm panels, green and black padding, and never mutates the source pixels.
- Ball styling preserves albedo ownership, original geometry and UV transforms, keeps opaque rendering, and creates at most one small mask.
- All three actual imported body factories retain texture references and matte custom paint while using stable semantic surface roles. Unrecognized dark artwork and custom lamp/glass transparency are preserved.
- Existing light, shadow-caster, crowd draw, goal-opening and stadium geometry budgets remain bounded.
- Both turf backends retain their dense geometry, shared uniforms and independent wind; near-field ground coverage remains at least 96% in the existing controlled canopy test.
- Turf loading still frees partial failures, retries, caches success and owns its image resources.

Two older appearance contracts intentionally changed. The car test no longer requires every non-window material to keep its previous dark reflectance: it now verifies recognized roles, immutable maps/custom colors and idempotency. The roof test no longer requires less than one-quarter of terrace reflectance, which reinforced the crushed-black contrast reported here; it requires a bounded, still-darker 0.25–0.65 ratio. Existing containment, geometry, resource and light-budget checks were retained. Texture tests now verify the physical repeat/field-size relationship rather than a fixed old tile value.

## Required visual and performance review

Root integration captured center-field and garage before/after views with exactly matching camera, car/ball poses, drawing-buffer resolution, preset and arena conditions, then exercised moving native keyboard gameplay in WebGL2. The second material pass was accepted as visibly improving car/goal/turf/crowd readability. The [paired renderer report](measurements/render-repair.json) retains six before/after workloads and capture metadata; [release verification](VERIFICATION-10.5.0.md) records real sequences and responsive-layout checks. WebGPU and physical phone/Chromebook hardware were unavailable. Component tests and short desktop clips do not establish proprietary rendering parity, complete freedom from temporal shimmer or a general FPS improvement.

Known boundaries: the existing model/arena geometry remains stylized; this does not add proprietary Rocket League meshes/materials, true area-light shadows, hardware ray tracing or a measured match to that renderer. The port mask adds a small texture fetch for visible ball fragments; the actual frame cost must be measured rather than inferred from unchanged light/triangle counts.
