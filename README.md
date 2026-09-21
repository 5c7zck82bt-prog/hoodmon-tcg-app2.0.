# HOODMON TCG Digital Arena — Series 1 Integrated Build

This package is the HOODMON Vite/React app source with the Series 1 remaster library and the Official Core Rulebook v2.0 battle settings integrated.

## Included
- Series 1 card database in `src/data/series1Cards.ts`
- Searchable/filterable Collection
- Persistent 40 Main / 6 Task / 1 Tamer deck builder
- Signed-in Battle page as the player home
- Framework-neutral battle engine in `src/game/engine/`
- v2.0 standard settings: 2,500 LP, 5-card opening hand, 5 starting Bond, 10 Bond cap, 4 Objective Stars, 6-card Task Deck, three Task slots, Round 2+ evolution
- Setup/mulligan, free starting Basic placement, deployment, Active/Reserve Commands, cross-player Task attempts, printed attack damage, Reaction Windows, knockout promotion, deck-out and objective victory

## Run locally
```bash
npm install
npm run dev
```

Production build:
```bash
npm run build
```

## Battle engine note
The full 110-card visual database and the executable gameplay database are intentionally separate. Only cards whose printed rules have been encoded and verified belong in the executable definition map. The current arena uses a practice fixture for engine testing; do not invent missing Series 1 effects. The next content milestone is encoding the approved printed rules for the full set and feeding saved legal player decks into battle setup.
