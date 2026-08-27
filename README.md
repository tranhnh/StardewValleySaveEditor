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

The game is strict about the `Object` XML schema and element order, so the
editor never hand-writes an item node. Instead (`src/lib/items.ts`):

1. It finds an existing empty slot — an `<Item xsi:nil="true" />` — and never
   grows the `<items>` list past `<maxItems>`.
2. It finds a real, already-valid `Object` node to use as a template: first in
   the player's inventory, then anywhere in the save (other players, chests,
   world debris). A world `<Object>` is cloned and its tag renamed to `<Item>`;
   the class and schema are identical.
3. It overwrites only identity (`name`, `parentSheetIndex`, `itemId` on 1.6+),
   `stack` and `quality` on the clone, and neutralises any machine/world state
   it carried.
4. It swaps the clone into the empty slot with `replaceChild`.

Only if the save contains no `Object` anywhere to clone does it fall back to a
bundled template, and that path is only trusted for pre-1.6 saves. The UI warns
when the fallback is used.

## Scope / limitations

- Edits the **host player** only (not farmhands).
- Inventory: `Object` items only. Tools, weapons, rings, boots and hats are
  shown but locked.
- In shared-wallet co-op, the game may override player gold with the team total.
- `src/lib/itemData.ts` is a short curated list for the "add item" dropdown; any
  other item can be added by entering a numeric object id.
- **Always keep a backup of your save folder.**

## Not affiliated with ConcernedApe. Use at your own risk.
