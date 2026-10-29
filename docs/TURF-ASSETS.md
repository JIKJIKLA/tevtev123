# Photographic turf surface sources

Downloaded on 2026-10-28 from Poly Haven's official asset service. These are original source JPEGs; no image generation, photographic retouching, resizing or recompression was used.

## Grass Ground

- Asset: [Grass Ground](https://polyhaven.com/a/grass_ground)
- Author: **Charlotte Baglioni** ([author portfolio](https://www.artstation.com/wyrine))
- License: **CC0**, verified on the asset page and [Poly Haven's license page](https://polyhaven.com/license). Poly Haven permits using, modifying and redistributing its downloaded assets, including in commercial projects; attribution is retained here voluntarily.
- Official file metadata: <https://api.polyhaven.com/files/grass_ground>
- Physical tile width: **2.5 metres**. All three maps are **1024 × 1024**.
- For the 81.92 × 102.4 metre field, physical repeats are **32.768 × 40.96**. Keep this independent of the field-wide mowing/marking texture.

| Local file | Purpose / color space | Source URL | Source MD5 | Bytes |
| --- | --- | --- | --- | ---: |
| `src/assets/turf-ground-diffuse.jpg` | Diffuse albedo, **sRGB** | <https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_ground/grass_ground_diff_1k.jpg> | `299047258586c762735b7284d3c662c3` | 876584 |
| `src/assets/turf-ground-normal.jpg` | OpenGL tangent-space normal, **linear / NoColorSpace** | <https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_ground/grass_ground_nor_gl_1k.jpg> | `d518c5b2af6f2c0297bc807b351f511f` | 1310516 |
| `src/assets/turf-ground-roughness.jpg` | Roughness, **linear / NoColorSpace** | <https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_ground/grass_ground_rough_1k.jpg> | `2e6afca246cf6b80bdb53f46fe7e5ce5` | 328190 |

All downloaded MD5 checksums matched the official metadata. The combined originals total **2,515,290 bytes (2.40 MiB)**, slightly above the preferred 2 MB budget; preserving the supplied JPEGs avoids unnecessary lossy normal-map conversion.

## Art direction and integration

The inspected photograph contains fine, worn, short grass with brown thatch, a few dark wear spots and olive patches; it does **not** contain prominent stones. It is naturally dry and muted. Directly replacing the green pitch with this albedo would produce a brown field. Use its restrained luminance/roughness variation under the game's greener macro palette, with a low-strength OpenGL normal and the existing close-up painted blades. Keep white lines and blue/orange paint readable. No displacement is required.

Use repeat wrapping and mipmaps with bounded anisotropy. Diffuse must be decoded from sRGB once; normal and roughness are data textures and must not be sRGB decoded. If the maps are used in a custom color node, preserve this distinction. Existing assets remain unchanged.
