# HOODMON Battle App - Agent Instructions

Build on top of the existing React + TypeScript project. Do not replace or duplicate the rules engine in UI components.

## Canonical Series 1 rules
- Standard starting LP: 2500.
- Starting Bond: 5. Bond max: 10. Gain +1 during Bond phase.
- Objective victory: 3 Objective Stars.
- Turn FSM: Refresh -> Draw -> Bond -> Main -> Command -> End.
- 40-card Hoodmon Deck.
- Separate 6-card Task Deck per player with 3 visible Task slots.
- 1 Active Hoodmon, up to 3 Reserves, 3 Magic zones, 2 Trap zones, 1 Field.
- Evolution: Stage 1 Basic -> Stage 2 Evolved -> Stage 3 Ascended -> Stage 4 Transcended.
- Evolution is locked during Round 1.
- Printed attack damage is the default damage value. ATK is a reference stat unless a card explicitly references ATK.
- Marked and Leashed are official binary, non-stacking runtime conditions.
- Marked/Leashed persist through Active/Reserve movement and evolution, and clear when the Hoodmon leaves play or an effect removes them.
- Reaction Window: opponent gets one Trap/Quick response, active player may answer once, then resolve newest-first.
- Local face-to-face mode uses viewportOwner and needsPassInterstitial to protect private information and rotate the view.

## Architecture rule
Use `src/game/GameContext.tsx` as the React-facing store. Keep `src/game/engine/*` framework-neutral. UI must call context actions and render `GameState`; never reimplement phase logic, Bond, evolution legality, combat resolution, status persistence, Task resolution, or win checks inside React components.

## Build priorities
1. Preserve the engine.
2. Replace demo data with real CMS JSON through `src/game/engine/cardDataAdapter.ts`.
3. Build the polished HOODMON battle UI around the existing zones and actions.
4. Add card inspection, targeting overlays, Reaction Window UI, pass-and-play screen, victory overlay, and animation without changing engine rules.
5. Keep the visual style dark urban neon: black, electric blue, orange, magenta, crown motifs, graffiti/comic/anime energy.
