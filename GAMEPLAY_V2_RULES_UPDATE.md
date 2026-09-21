# HOODMON Gameplay Rules Sync — Official Core Rulebook v2.0

This pass corrects the digital battle engine and UI to the September 2026 Official Core Rulebook v2.0.

## Corrected standard settings
- 2,500 starting LP.
- 40-card Hoodmon Deck, separate 6-card Task Deck, 1 Tamer.
- 5-card opening hand with repeatable no-Basic mulligan.
- Free setup placement of 1 Basic Active and optional 1 Basic Reserve.
- 5 starting Bond, +1 each Bond Phase, cap 10, carryover enabled.
- 4 Objective Stars to win (replaces the outdated 3-Star prototype value).
- Refresh → Draw → Bond → Main → Command → End.
- Round 1 evolution lock; Round 2+ normal evolution.

## Gameplay fixes
- Main-Phase Basic deployment now comes from hand, costs printed Bond, and is limited to one normal deployment per turn.
- Evolution can target Active or Reserve Hoodmon, requires the matching next-stage card in hand, consumes that card, costs printed Bond, preserves damage, and opens a Reaction Window.
- Active Hoodmon may Battle or Task; Reserve Hoodmon may Task.
- Either player may attempt either player's face-up Task.
- Task attempts open Reaction Windows before resolution.
- Task success uses TASK vs Difficulty; failure leaves the Task face-up unless card text later says otherwise.
- Major/Crisis practice Tasks award Objective Stars; Objective victory now triggers at 4.
- Empty Task source zones refill from their own Task Deck during End Phase.
- Printed attack damage remains separate from the Hoodmon ATK stat.
- Direct Tamer damage only occurs when no Active Hoodmon existed at attack declaration.
- If an attack's declared Active target leaves play during reactions, the attack no longer incorrectly converts into direct Tamer damage.
- Knockout → Reserve promotion remains enforced after the current action resolves.
- Random first-player determination is supported.
- Generic free Active/Reserve switching is no longer exposed as a normal core action.
- Generic Marked/Leashed engine states remain removed.

## UI/reference fixes
- Battle remains the signed-in player home.
- Player panels now show 4-Star victory tracking and Tamer zones.
- Main Phase controls show legal deployments and hand-based evolutions.
- Command Phase shows Active Battle and Active/Reserve Task actions.
- Task controls display which player's Task source is being attempted.
- Rule/reference screens and Bolt/agent instruction files now match v2.0 instead of older prototype values.
- Match persistence key bumped to v3 so incompatible saved prototype match state is not restored.

## Validation
- Engine TypeScript strict compile: PASS.
- Full React source structural type check with local React stubs: PASS.
- Engine smoke test: setup, draw, Bond, deployment, Reserve Task, cross-player Task targeting, Reaction Window, round advancement, Round 2 evolution, hand consumption, evolution stack, and persistent damage: PASS.
- Objective win test: 3 Stars does not win; 4 Stars wins: PASS.

## Still intentionally incomplete
The 110-card visual library is not yet a 110-card executable rules database. The practice arena only executes definitions that have been explicitly encoded and verified. Standard/Quick Magic, Trap, Equipment, Field, Tamer, and the rest of the Series 1 printed effects should be implemented from the approved card text rather than guessed.
