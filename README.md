# Stardew Valley Save Editor

A small browser app for editing a Stardew Valley save. Vue 3 + Vite + Pinia +
TypeScript. **No backend** — the save file is read, edited and written entirely
in your browser, and never uploaded.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks, then outputs static files to dist/
npm run preview  # serve the built dist/
```

`dist/` is plain static files (relative asset paths), so it can be hosted on
GitHub Pages, Netlify, itch.io, etc.

## Save file location

| OS | Path |
| --- | --- |
| Windows | `%AppData%\StardewValley\Saves\<FarmName_ID>\` |
| macOS | `~/.config/StardewValley/Saves/<FarmName_ID>/` |
| Linux | `~/.config/StardewValley/Saves/<FarmName_ID>/` |

Load the file named like `Farmer_123456789` (no extension), **not**
`SaveGameInfo` or `Farmer_123456789_old`.

## How it works

1. **Parse.** The `<?xml … ?>` prolog is captured with a regex, then the body is
   parsed with `DOMParser` into an `XMLDocument` that is kept for the session.
2. **Read.** Only the handful of nodes the UI exposes are read into a typed,
   reactive model (`src/lib/saveModel.ts`, `src/lib/items.ts`).
3. **Edit.** Core stats and skills write straight back to their DOM nodes on
   change. Inventory changes are discrete DOM operations.
4. **Serialize.** `XMLSerializer` on the root element, with the original prolog
   prepended. Everything the editor did not touch is preserved exactly.
5. **Download.** A `Blob` download using the original filename (no extension).

### Adding inventory items

The game is strict about each class's XML schema and element order, so the
editor never hand-writes an item node. Instead (`src/lib/items.ts`):

1. It finds an existing empty slot — an `<Item xsi:nil="true" />` — and never
   grows the `<items>` list past `<maxItems>`.
2. It finds a real, already-valid node of the right `xsi:type` to clone:
   - **Objects** (and big craftables, which are `Object` + `bigCraftable=true`):
     the player's bag, then any `<Item>` / world `<Object>` in the save.
   - **Hats, boots, rings:** any `<Item xsi:type="…">` plus the equipped slots
     `<hat>`, `<boots>`, `<leftRing>`, `<rightRing>`. Equipped tags are renamed
     to `<Item>` — same class, same schema.
3. It overwrites only identity and that type's own fields (hat hair flags, boots
   defense/immunity, etc.), pulled from the catalog, and neutralises world/
   machine state.
4. It swaps the clone into the empty slot with `replaceChild`.

If the save has no node of that type to clone, it falls back to a bundled
skeleton from `src/lib/generated/nodeTemplates.json` (see below). The object
fallback is only trusted for pre-1.6 saves; the UI warns when any fallback runs.

Weapons, tools, clothing and furniture are **not** insertable yet — they appear
in the catalog for reference only.

### Node templates

`src/lib/generated/nodeTemplates.json` holds one zeroed skeleton per class
(`Hat`, `Boots`, …), extracted from real saves so the element order is correct
for the current game version:

```bash
# copy a save file or two into data/saves/ (git-ignored), then:
npm run build:templates
```

Only structure is kept — every id, name and stat is zeroed. `Ring` is
hand-authored in `items.ts` (no ring in the sample saves); drop in a save with
a ring equipped and re-run to replace it with a verified one.

### Item catalog

The inventory tab's search / category browser is backed by
`src/lib/generated/itemCatalog.json`, generated from unpacked game data:

1. Export the game's data files with [StardewXnbHack](https://github.com/Pathoschild/StardewXnbHack)
   (drop it in the game folder and run it).
2. Copy these JSON files into `data/raw/` (git-ignored — game content is never
   committed): `Objects`, `BigCraftables`, `Weapons`, `Tools`, `Boots`, `Hats`,
   `Furniture`, `Shirts`, `Pants`.
3. Run `npm run build:catalog`. It extracts only ids, names, categories and
   prices into `src/lib/generated/itemCatalog.json`, which *is* committed.

A small placeholder catalog is checked in so the app builds without step 1–3.

## Scope / limitations

- Edits the **host player** only (not farmhands).
- Inventory: the catalog lists every item type. Objects, big craftables, hats,
  boots and rings can be **added**; weapons, tools, clothing and furniture are
  searchable but not yet insertable. Non-object slots can't be edited in place,
  only cleared.
- In shared-wallet co-op, the game may override player gold with the team total.
- Any object can also be added by entering a numeric id manually.
- **Always keep a backup of your save folder.**

## Not affiliated with ConcernedApe. Use at your own risk.
