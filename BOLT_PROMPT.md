# Prompt to give Bolt after importing this project

Continue the HOODMON TCG app from the existing code. Treat `claude.md` and the engine constants as the current Official Core Rulebook v2.0 implementation.

The canonical battle logic lives in `src/game/engine/` and the React bridge lives in `src/game/GameContext.tsx`. Build the production UI around those APIs rather than recreating rules in React.

Requirements:
- Preserve phase order: Refresh -> Draw -> Bond -> Main -> Command -> End.
- Standard LP 2,500; opening hand 5; starting Bond 5; Bond cap 10; +1 Bond each Bond Phase.
- Objective victory is 4 Stars.
- 40-card Main Deck, separate 6-card Task Deck, 1 Tamer.
- Setup uses a no-Basic mulligan, one free starting Basic Active, and optional one free starting Basic Reserve.
- Each player has a 3-slot Task Card Zone but setup reveals only one face-up Task from each Task Deck.
- Either player may attempt either face-up Task with a ready Active or Reserve Hoodmon.
- Board zones per player: Tamer, 1 Active, 3 Reserves, 3 Magic/Equipment, 2 Traps, 1 Field, Discard, Banished, Hoodmon Deck, Task Deck.
- Normal Main Phase deployment is 1 Basic per turn for printed Bond Cost.
- Evolution is unavailable during Round 1, is legal for Active or Reserve from Round 2, uses the correct next-stage card from hand, costs printed Bond, and does not auto-heal.
- Combat uses printed attack damage. Do not add Hoodmon ATK unless card text explicitly does so.
- Reserve Hoodmon cannot normally Battle.
- Direct Tamer attack only when the opponent has no Active Hoodmon.
- Reaction Window opens for attacks, Tasks, evolution, and eligible effects; non-active gets one response, active may answer once, resolve newest-first.
- Do not add generic Marked/Leashed states; they are not core v2.0 mechanics.
- Keep the battle page as the signed-in player home.

Visual direction: dark urban HOODMON style, gritty black texture, neon blue/magenta/orange accents, crown motif, comic/anime presentation, with gameplay text and zones highly legible.
