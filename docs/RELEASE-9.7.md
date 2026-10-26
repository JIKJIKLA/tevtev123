# 9.7 Momentum

The update makes the game usable across touch, keyboard/mouse and standard controllers while carrying personal paint through the full match presentation.

- Screen size, orientation, coarse-pointer capability, touch points and the most recent input determine the layout. No hardware identification or user-agent fingerprint is collected. Automatic, forced touch and keyboard/controller choices are saved locally.
- Touch pointers are independent: steer, boost and jump can be held together; jump is edge-triggered for online synchronization. Pause, overlays, blur, orientation changes and pointer cancellation release held controls. Tapping empty turf does not trigger mouse boost.
- Garage adds RGB, hue and eight quick colors, including black. Colors save with presets; dedicated-server profiles validate RGB integers. The scoreboard follows the effective captain paint and selects dark/light digits for contrast. Pitch painting keeps its texture object so both grass shader backends keep sampling the updated paint.
- Twin nozzles, warm cores and 96 pooled trail sprites replace the simple boost flame. Goals use 72 pooled shards/ribbons and three expanding rings, plus a scorer/assist/speed stinger. Very dark paint gets a readable effect accent without altering the car.
- Goal hold is 7.2 seconds offline and on the authority. Replays start after 1.5 seconds of live celebration, play for 4.4 seconds and slow to half speed near contact. Countdown and match-clock rules are unchanged.
- Effects add no lights, render passes or generated assets. Quiet celebration and reduced-motion preferences suppress bursts/filter motion. Existing audio is preserved; music remains opt-in.

Validation covers multitouch state and cancellation, saved layouts, RGB persistence/contrast, pooled-effect lifecycle, Soccar/Heatseeker at all three team sizes, server paint synchronization and the extended goal clock. Browser checks cover desktop and narrow portrait/landscape layouts. Real-device frame rates still depend on the device and graphics backend.
