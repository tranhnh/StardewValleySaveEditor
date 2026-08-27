// The full item catalog that powers search / category browsing in the
// inventory tab.
//
// `generated/itemCatalog.json` is produced by `scripts/build-item-catalog.mjs`
// from unpacked game data (see README). A small placeholder catalog is checked
// in so the app builds before that data is provided; running the script
// overwrites it with the real thing.

import raw from './generated/itemCatalog.json'

export type ItemKind =
  | 'object'
  | 'ring'
  | 'bigCraftable'
  | 'weapon'
  | 'tool'
  | 'boots'
  | 'hat'
  | 'furniture'
  | 'shirt'
  | 'pants'

export interface CatalogItem {
  /** Qualified id used by the game, e.g. "(O)74", "(BC)16", "(F)1466". */
  qualifiedId: string
  /** Unqualified id as a string, e.g. "74" or "Axe". */
  id: string
  kind: ItemKind
  name: string
  /** Raw vanilla `Type` string for objects (e.g. "Minerals"), else null. */
  type: string | null
  /** Vanilla numeric category for objects / big craftables, else null. */
  category: number | null
  /** Human-readable group used by the category filter. */
  categoryLabel: string
  price: number | null
  edibility: number | null
  /** Whether the current editor knows how to inject this item (objects only). */
  injectable: boolean
}

export const CATALOG: readonly CatalogItem[] = raw as CatalogItem[]

const byQualifiedId = new Map(CATALOG.map((item) => [item.qualifiedId, item]))

export function catalogByQualifiedId(qualifiedId: string): CatalogItem | undefined {
  return byQualifiedId.get(qualifiedId)
}

/** Look up a plain object by its unqualified numeric id. */
export function catalogObject(objectId: number): CatalogItem | undefined {
  return byQualifiedId.get(`(O)${objectId}`)
}

/** Distinct category labels, sorted, for the filter dropdown. */
export function catalogCategories(): string[] {
  return [...new Set(CATALOG.map((item) => item.categoryLabel))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export interface CatalogQuery {
  text?: string
  /** A `categoryLabel`, or 'all'. */
  category?: string
}

/** Filter the catalog by free text (name or id) and category. */
export function queryCatalog(query: CatalogQuery): CatalogItem[] {
  const text = (query.text ?? '').trim().toLowerCase()
  const category = query.category ?? 'all'

  return CATALOG.filter((item) => {
    if (category !== 'all' && item.categoryLabel !== category) return false
    if (!text) return true
    return (
      item.name.toLowerCase().includes(text) ||
      item.id.toLowerCase() === text ||
      item.qualifiedId.toLowerCase() === text
    )
  })
}
