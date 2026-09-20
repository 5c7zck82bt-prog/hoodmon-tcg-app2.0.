# HOODMON TCG Digital Arena — Series 1 Integrated Build

This package is the HOODMON Vite/React app source with the Series 1 remaster card library integrated.

## Included

- 110 Series 1 card images under `public/cards/` (optimized WebP runtime assets)
- Card database in `src/data/series1Cards.ts`
- Home dashboard
- Searchable/filterable 110-card collection
- Persistent deck builder with 40-card Main Deck / 6-card Task Deck / 1 Tamer sections
- Local browser persistence for deck builds
- Existing HOODMON FSM battle engine and battle UI
- Current quick-reference values used by the digital engine: 2,500 LP, starting Bond 5, Bond cap 10, 3 Objective Stars
- Responsive desktop/mobile layout

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Bolt

Upload the project folder/ZIP to Bolt and run the normal Vite workflow. No external image hosting is required; all card art used by the app is bundled in `public/cards`.

## Card assets

`CARD_ASSET_SOURCES.json` records which corrected/remastered source image was used for each numbered Series 1 card. Runtime assets are resized WebP copies for fast app loading; source master PNGs are not duplicated in this code ZIP.

## Battle engine note

The engine source is included and drives turn/phase/attack/reaction state. The complete 110-card visual database is available to the Collection and Deck Builder. Individual printed effects remain represented by the card assets; only definitions explicitly wired in `src/game/demoData.ts` are executed in the battle demo until each Series 1 effect is encoded as engine effects.
