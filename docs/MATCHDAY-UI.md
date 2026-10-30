# Nivet matchday interface

The interface follows the owner's supplied Rocket League screenshots: a low, angled menu stack on the left, the actual car remaining prominent in the center/right, a bottom-left local-player strip with party control, large illustrated play cards, and a thin centered blue/orange scoreboard. Nivet's name and black/velvet menu identity remain; match colors remain blue/orange. Only implemented destinations are shown: Quick Match, VS AI, Private Match and Sandbox. There are no pretend competitive ranks, tournaments, live player totals or inactive storefront entries.

## Reference images and adaptation

- [Rocket League: First Look — Play Menu Changes](https://www.rocketleague.com/news/first-look-play-menu-changes-coming-to-rocket-league), official Psyonix/Epic announcement, 2023-11-21. It describes the square play-card layout and separation of offline/private/training destinations. Its [official menu reference image](https://bucket.psyonix.com/web/news/rl/play_menu_16x9.jpg) was inspected as layout reference.
- The classic main-menu, play-card, title-screen and gameplay-HUD images attached by the owner remain the primary placement references. Their main-menu emphasis is an unobstructed car, narrow left-hand action bars, local player/party information near the lower edge, and minimal match overlays.

These sources inform hierarchy and proportions. Rocket League logos, proprietary card illustrations, ranks, store art and screenshots are not redistributed as Nivet UI assets. The four new card images are original SVG scene illustrations embedded directly in CSS: a teal car/ball scene, an orange car/AI target, a velvet lock/shield, and a blue ball/trajectory scene. They require neither live WebGL capture nor additional runtime image requests. They are not AI-generated raster images.

## Font provenance

- Typeface: **Rajdhani Medium**, Indian Type Foundry, copyright 2014.
- Official distribution metadata: [Google Fonts CSS](https://fonts.googleapis.com/css2?family=Rajdhani:wght@500&display=swap).
- Unmodified official Latin WOFF2: <https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pb0EPOreec.woff2>.
- Local file: `src/assets/rajdhani-medium.woff2`, **15,084 bytes**. The Latin subset covers menu text, score digits and common punctuation; unsupported name glyphs use the system fallback font.
- License: [SIL Open Font License 1.1 in the official Google Fonts repository](https://raw.githubusercontent.com/google/fonts/main/ofl/rajdhani/OFL.txt). The complete license is kept in `src/assets/rajdhani-OFL.txt` and in the UI CSS comment, so the portable HTML carries the license alongside the embedded font.

`scripts/build.cjs` embeds the font as a `data:font/woff2;base64` URL. The game does not contact Google Fonts during loading or play. No font conversion or modification was performed.

## Layout and functional boundaries

- Desktop: the main actions occupy the left lower-middle area. The driver profile sits above a thin bottom status rail, with the actual party action alongside. The garage uses a narrow left panel; Settings and Party retain readable right-side panels. Play uses two rows of two large cards because Nivet has four functional destinations.
- Match selection: team-size and playlist controls remain above the cards. The launch action stays outside the scrolling setup region. Selected state, focus state and native form controls remain explicit. Existing IDs, keyboard/controller routing and private-match code input are preserved.
- Phone/tablet portrait: a single native vertical scroll surface contains the setup/garage/settings controls; there are no nested panel scrollers. The two-column cards retain touch-sized targets. The launch bar stays fixed above the compact player strip and safe-area inset. The return action remains reachable.
- Short landscape: header and profile heights shrink; setup remains scrollable and the launch action remains detached. Touch driving controls retain their reserved areas, and HUD instruments do not move into the steering/boost thumb regions.
- Match HUD: thin technical score/clock type, color-correct team blocks, a lower-left ball/car-camera label and a gold segmented boost dial. The requested speedometer remains smaller beside the boost gauge. The camera label uses the saved binding's existing text rather than a hardcoded key.

The new layer is `src/matchday-ui.css`, included last so older style layers do not undo the layout. It uses static SVG backgrounds and simple color/position changes, with no fullscreen blur or new live image-generation pass. Reduced-motion preferences remove the small hover/glow transitions. Responsive placement must still be judged from actual browser screenshots; headless DOM tests establish interaction and content contracts, not pixel accuracy or device FPS.
