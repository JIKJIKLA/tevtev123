# Tevin League 9.4 — Arena lobby

The title, main menu and garage now use the live arena. The home navigation is a compact left-hand list and match destinations are illustrated with CSS symbols and color panels. No generated imagery is used.

The car is framed close to the turf at its wheel baseline. Drag the preview to rotate, drag vertically to change camera elevation, scroll to zoom, or focus the preview and use the arrow keys. Reset View restores framing.

The initial loading screen builds the stadium, loads effects and compiles car-body materials. The scene stays in memory for the current visit. A new visit prepares GPU resources again; quality and roster changes can require additional preparation. Browser HTTP caching remains available; there is no service worker retaining stale releases.

Presentation changes: antialiasing on the preferred renderer; brighter hemisphere lighting and paint reflections; denser nearby grass; adaptive resolution floor raised to 80% and changes made less frequent; supplied RLCS 2025 dial images embedded for boost and speed. User-supplied overlays retain their original pixels. They are presentation assets, not an affiliation claim.

Movement: interpolation snapshots now run at the 120 Hz solver rate. Up to 100 ms of simulation is caught up rather than discarding time after 66 ms. Camera position is transported with the rendered car before smoothing its offset, reducing the car's visible lag within the view.

Validation: 28 automated tests, including a 100 ms frame-stall regression, garage controls, physics soak and embedded HUD assets. Physical Chromebook benchmarking was not available.
