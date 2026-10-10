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

`dist/` is plain static files, so it can be hosted on GitHub Pages, Netlify,
itch.io, etc.

## Save file location

| OS | Path |
| --- | --- |
| Windows | `%AppData%\StardewValley\Saves\<FarmName_ID>\` |
| macOS | `~/.config/StardewValley/Saves/<FarmName_ID>/` |
| Linux | `~/.config/StardewValley/Saves/<FarmName_ID>/` |

Load the file named like `Farmer_123456789` (no extension), **not**
`SaveGameInfo` or `Farmer_123456789_old`.

## How it works

The save's XML is parsed with `DOMParser`, edited in place, then serialized
back with the original prolog/BOM — anything the editor doesn't touch is
preserved byte-for-byte. New inventory items are built by cloning a real node
of the right type from the save (or a bundled fallback skeleton) and
overwriting its identity/stats; see `src/lib/items.ts` and
`src/lib/generated/nodeTemplates.json` (regenerate with `npm run build:templates`).

The catalog browser is backed by `src/lib/generated/itemCatalog.json`, built
from unpacked game data via [StardewXnbHack](https://github.com/Pathoschild/StardewXnbHack)
and `npm run build:catalog`; a placeholder catalog ships so the app builds
without that step.

## Scope / limitations

- Edits the **host player** only (not farmhands).
- Inventory: nearly every item can be **added** — objects, big craftables, hats,
  boots, rings, weapons, tools, shirts, pants and (non-subclass) furniture. The
  Combined Ring and furniture subclasses (bed/TV/fish tank/dresser) are the
  exceptions. Non-object slots can't be edited in place, only cleared.
- Tools are added at their catalogued upgrade level (e.g. `IridiumAxe`), not a
  chosen one; watering cans/rods start empty.
- In shared-wallet co-op, the game may override player gold with the team total.
- Any object can also be added by entering a numeric id manually.
- **Always keep a backup of your save folder.**

## Not affiliated with ConcernedApe. Use at your own risk.
