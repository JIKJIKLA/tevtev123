# Tevin League 9.5

Gold vector boost and speed instruments follow the supplied segmented-arc reference. Both Shift keys boost with the default binding; left-clicking the game canvas also boosts. Held-key release respects simultaneous Shift keys. Custom remaps remain authoritative.

Removed the 720p Chromebook pixel budget and automatic undersampling. Rendering now uses native screen resolution up to a 3.69-million-pixel budget, with high-DPI scaling capped at 1.5. The lightweight geometry preset remains available. This prioritizes clarity and may cost GPU frame time on weaker hardware.

31 automated tests pass, including actual Shift event dispatch, fuel consumption, native 1080p resolution, and gauge fill at zero/half/full.
