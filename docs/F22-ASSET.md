# Supplied F-22 asset

Source: `f-22-raptor-fighter-jet-free.zip`, provided by the project owner on 2026-10-27. The archive contains `source/F22Raptor.blend` (Blender 3.6) and separate base-color, normal and metallic/roughness textures. The game uses the supplied geometry and UVs, with retracted landing gear. Keep the original creator's attribution/license information with this asset if the owner supplies it separately.

The static exporter reads the embedded SDNA schema and mesh arrays as data. The [official Blender DNA documentation](https://developer.blender.org/docs/features/core/dna/) describes this self-describing file structure. Embedded scripts are never executed. The extractor accounts for temporary compatibility-buffer addresses reused within different mesh IDs. It computes smooth/flat normals, preserves UV seams, and packs per-mesh position/normal/UV/index buffers. Position storage is quantized to 16 bits; GPU attributes expand back to float arrays for WebGPU/WebGL compatibility.

The airframe, canopy, cockpit, HUD, instrument glass and retracted-gear meshes total 28,696 triangles and 25,440 packed vertices. The original 56 MB archive becomes a 672 KB geometry manifest plus 559 KB of JPEG maps: 1536 px albedo, 1024 px normal and a 768 px combined roughness/metallic map. The portable build embeds the data. The two afterburner plumes and all surrounding stadium geometry are game presentation meshes.

Conversion helpers are in `scripts/asset-tools/`. The original supplied archive remains outside the repository; provide its extracted directory as the converter's input.
