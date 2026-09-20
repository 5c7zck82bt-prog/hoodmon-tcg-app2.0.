# Prompt to give Bolt after importing this project

Continue the HOODMON TCG app from the existing code. Do not replace or rewrite the rules engine.

The canonical battle logic lives in `src/game/engine/` and the React bridge lives in `src/game/GameContext.tsx`. Build the production UI around those APIs.

Requirements:

- Preserve the finite-state phase order: Refresh -> Draw -> Bond -> Main -> Command -> End.
- Standard LP is fixed at 2,500.
- Starting Bond is 5; max Bond is 10.
- Objective victory is 3 Stars.
- Each player has a separate 6-card Task Deck and 3 visible Task slots.
- Card board zones per player: Tamer, Active Hoodmon, 3 Reserves, 3 Magic, 2 Traps, 1 Field, Discard, Banished, Hoodmon Deck, Task Deck.
- Marked and Leashed are official binary conditions and must be shown visually on affected Hoodmon.
- Stage 4 Transcended is supported. Evolution is unavailable during Round 1.
- Combat uses the printed attack damage from card data. Do not substitute the Hoodmon ATK stat unless an attack explicitly opts into ATK-based math.
- When an attack, Task, evolution, or eligible effect opens a Reaction Window, pause normal controls and show response priority.
- Use `viewportOwner` and `needsPassInterstitial` for local face-to-face privacy/orientation behavior.
- Trigger the game-over overlay immediately when the engine returns a winner.

Visual direction: dark urban HOODMON style, gritty black texture, neon blue/magenta/orange accents, crown motif, comic/anime presentation, but keep gameplay text and zone labels highly legible.
