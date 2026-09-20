# HOODMON Integration Status

## Complete in this build

- 110 current Series 1 card visuals integrated
- Collection browsing/search/filtering
- Card full-screen preview
- Deck construction and section limits
- Local deck persistence
- Core battle-state engine included
- Battle phase progression and reaction windows
- Responsive presentation matching the neon/grunge HOODMON direction

## Engine data still intentionally explicit

The card art is authoritative for the full remastered text. The TypeScript battle engine does not infer gameplay logic from pixels. To make every printed effect executable online, add a `CardDefinition` for each card in the card database and map its effect text to the engine's effect primitives.

This avoids silently inventing card behavior that differs from the approved physical card.
