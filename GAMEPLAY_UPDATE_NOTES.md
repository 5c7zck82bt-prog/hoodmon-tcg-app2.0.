# HOODMON Gameplay/Home Update

This build is based on the uploaded `project-bolt-github-rj9vleyu.zip` source.

## Player home / session flow
- Added a lightweight local player-session prototype because this source archive does not include a backend authentication provider.
- Signed-in players now land directly on **Battle**.
- The HOODMON brand button returns signed-in players to Battle.
- The signed-in navigation prioritizes **Battle → Cards → Deck Builder → Rules** and removes the redundant Home tab.
- Public/unsigned players still see the promotional landing page.
- Match state stays mounted while visiting Cards, Deck Builder, or Rules.
- Match state is stored locally per player tag and can survive a browser refresh.

## Battle UX improvements
- Added phase-specific guidance so players know what to do in Refresh, Draw, Bond, Main, Command, and End.
- Main Phase now exposes supported **Evolution** and **Active/Reserve switching** actions.
- Command Phase now exposes **Attack** and **Task** actions instead of only Attack.
- Face-up Tasks show name, tier, difficulty, and Objective Star reward status.
- Hoodmon zones now show remaining HP, health bars, ATK, TASK, Ready/Exhausted state, and actual Reserve Hoodmon.
- Player headers now show hand count in addition to LP, Bond, and Objective Stars.
- Reaction windows have clearer priority and resolution messaging.
- Battle feed replaces the developer-facing "Engine Log" wording.

## Engine improvements
- Added Hoodmon knockout detection after combat damage.
- Added an `awaiting_promotion` flow when the knocked-out player has Reserve Hoodmon.
- Added Reserve-to-Active promotion and battle UI for choosing the promoted Hoodmon.
- Added Active/Reserve switching during Main Phase.
- Removed obsolete **Marked** and **Leashed** runtime hooks from the digital engine.
- Kept the normal evolution restriction: no normal evolution during Round 1.
- Updated demo battle data so Tasks, evolution, attack/reaction flow, knockout, and promotion can all be exercised in one playable match.

## Validation performed
- Full source TypeScript structure checked with local React stubs because the container dependency install was unavailable/incomplete.
- Engine TypeScript compiled independently with strict checking.
- Engine smoke test passed for: phase progression, Task completion, attack/reaction resolution, Round 2 evolution, knockout, and Reserve promotion.

## Still not fully wired
The app's complete 110-card visual database is not yet a complete 110-card executable rules database. The current battle engine still uses a smaller set of explicit `CardDefinition` gameplay records. The next major gameplay milestone should be converting the approved Series 1 card rules into executable definitions/effects, then feeding a player's saved 40/6/1 deck directly into battle setup.
