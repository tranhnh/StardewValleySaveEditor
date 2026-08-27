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
  qualifiedId: string
  id: string
  kind: ItemKind
  name: string
  type: string | null
  category: number | null
  categoryLabel: string
  price: number | null
  edibility: number | null
  injectable: boolean
  sprite?: { sheet: string; index: number }
  boots?: { defense: number; immunity: number; colorIndex: number }
  hat?: { skipHairDraw: boolean; ignoreHairstyleOffset: boolean }
  weapon?: {
    minDamage: number
    maxDamage: number
    knockback: number
    speed: number
    precision: number
    defense: number
    type: number
    areaOfEffect: number
    critChance: number
    critMultiplier: number
  }
  tool?: {
    className: string
    spriteIndex: number
    menuSpriteIndex: number
    upgradeLevel: number
    attachmentSlots: number
  }
  clothing?: {
    clothesType: number
    spriteIndex: number
    dyeable: boolean
    isPrismatic: boolean
    defaultColor: string | null
  }
  furniture?: {
    furnitureType: number
    rotations: number
    texture: string
    srcX: number
    srcY: number
    srcW: number
    srcH: number
    boxW: number
    boxH: number
  }
}

export const INJECTABLE_KINDS = [
  'object',
  'bigCraftable',
  'hat',
  'boots',
  'ring',
  'weapon',
  'tool',
  'shirt',
  'pants',
  'furniture',
] as const
export type InjectableKind = (typeof INJECTABLE_KINDS)[number]

export function isInjectableKind(kind: ItemKind): kind is InjectableKind {
  return (INJECTABLE_KINDS as readonly ItemKind[]).includes(kind)
}

export const CATALOG: readonly CatalogItem[] = raw as CatalogItem[]

const byQualifiedId = new Map(CATALOG.map((item) => [item.qualifiedId, item]))

export function catalogByQualifiedId(qualifiedId: string): CatalogItem | undefined {
  return byQualifiedId.get(qualifiedId)
}

export function catalogObject(objectId: number): CatalogItem | undefined {
  return byQualifiedId.get(`(O)${objectId}`)
}

export function catalogCategories(): string[] {
  return [...new Set(CATALOG.map((item) => item.categoryLabel))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export interface CatalogQuery {
  text?: string
  category?: string
}

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
