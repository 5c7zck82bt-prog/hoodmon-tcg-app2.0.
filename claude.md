# HOODMON Battle App - Agent Instructions

Build on top of the existing React + TypeScript project. Do not replace or duplicate the rules engine in UI components.

## Canonical Series 1 rules — Official Core Rulebook v2.0 (September 2026)
- Standard starting LP: 2500.
- 40-card Hoodmon Deck, separate 6-card Task Deck, 1 Tamer outside the Hoodmon Deck.
- Starting hand: 5. A no-Basic opening hand may be revealed, reshuffled, and redrawn as needed.
- Setup: 1 Basic Hoodmon starts Active; up to 1 additional Basic may start Reserve. These setup placements cost 0 Bond.
- Starting Bond: 5. Bond max: 10. Gain +1 during Bond phase; unspent Bond carries over.
- Objective victory: 4 Objective Stars.
- Turn FSM: Refresh -> Draw -> Bond -> Main -> Command -> End.
- Separate 6-card Task Deck per player with a 3-slot visible Task Card Zone. Setup begins with one face-up Task from each Task Deck.
- Either player may attempt either face-up Task unless card text says otherwise.
- 1 Active Hoodmon, up to 3 Reserves, 3 Magic/Equipment zones, 2 Trap zones, 1 Field.
- A ready Hoodmon normally has 1 Command each turn. Active may Battle or Task; Reserve may Task and use legal skills but cannot normally Battle.
- Normal deployment: Main Phase, normally 1 Basic per turn, pay printed Bond Cost. If no Active exists it may enter Active; otherwise it enters an open Reserve slot.
- Evolution: Stage 1 Basic -> Stage 2 Evolved -> Stage 3 Ascended -> Stage 4 Transcended. No normal evolution in Round 1; from Round 2, Active or Reserve may evolve in Main using the correct next-stage card from hand and paying its printed Bond Cost.
- Evolution does not automatically heal damage.
- Printed attack damage is the default damage value. ATK is a reference/max base stat unless card text explicitly uses ATK in the damage formula.
- A normal Battle targets the opposing Active Hoodmon. Direct Tamer attacks are legal only when the opponent has no Active Hoodmon.
- Defenders do not automatically counterattack.
- Reaction Window: after an attack, Task declaration, evolution, or response-eligible effect, non-active player gets one legal Trap/Quick response, active player may answer once, then resolve newest-first.
- Generic Marked/Leashed runtime conditions are NOT core v2.0 mechanics. Do not reintroduce them unless specific card text creates a named effect.
- Win by opposing Tamer at 0 LP, 4 Objective Stars, or opponent drawing from an empty Hoodmon Deck.

## Architecture rule
Use `src/game/GameContext.tsx` as the React-facing store. Keep `src/game/engine/*` framework-neutral. UI must call context actions and render `GameState`; never reimplement phase logic, Bond, evolution legality, combat resolution, Task resolution, or win checks inside React components.

## Build priorities
1. Preserve v2.0 rule correctness in the engine.
2. Replace practice definitions with verified Series 1 executable card data through `src/game/engine/cardDataAdapter.ts`.
3. Feed each player's saved legal 40/6/1 deck into match setup once that card data is encoded.
4. Add actual Standard/Quick Magic, Trap, Equipment, Field, Tamer and printed skill effects without inventing text not present on cards.
5. Keep the visual style dark urban neon: black, electric blue, orange, magenta, crown motifs, graffiti/comic/anime energy.
