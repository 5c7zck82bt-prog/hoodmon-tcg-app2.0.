# HOODMON Battle Hand + Drag/Drop Update

This build makes the signed-in player's hand a primary battle control surface.

## Added
- Persistent P1 hand tray at the bottom of the battle arena.
- Real card art in hand with overlap/fan presentation.
- Hover preview and click-to-select fallback.
- HTML5 drag-and-drop from hand to legal board zones.
- Valid zones glow for the currently dragged/selected card.
- Targeted Stage 1 deployment to legal Active/Reserve zones.
- Drag evolution cards directly onto the matching Active/Reserve Hoodmon.
- Field placement/replacement engine action.
- Trap setting into either empty Trap zone.
- Magic/Equipment placement into any open Magic/Equipment zone.
- Standard/Quick one-shot Magic routing to Discard after its placement shell resolves.
- Board art rendering for persistent support cards and hidden opponent Trap presentation.
- Illegal drop attempts are rejected by the rules engine and reported in the battle feed.

## Important gameplay scope
The drag/drop interaction is rules-aware, but Series 1 card-specific effects still need to be encoded card-by-card. This update does not invent missing printed effects.
