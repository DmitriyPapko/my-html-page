# Warcraft HUD

This directory contains a minimal Warcraft-style user interface.

To enable it, import `initUI` and `drawUI` from `src/ui.js` and call
`initUI({ ctx, world, players })` once at start, then call `drawUI(dt)`
from your main render loop.  The palette and sizing constants can be
found in `themeWarcraft.js`.

To disable the HUD simply skip these calls.
