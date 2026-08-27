// Builds src/lib/generated/itemCatalog.json from unpacked game data.
//
// Drop the JSON files exported by StardewXnbHack (or equivalent) into
// data/raw/, then run:  npm run build:catalog
//
// Recognised files (case-insensitive, 1.6 and pre-1.6 shapes both handled):
//   Objects.json / ObjectInformation.json
//   BigCraftables.json / BigCraftablesInformation.json
//   Weapons.json
//   Tools.json
//   Boots.json
//   Hats.json
//   Furniture.json
//   Shirts.json
//   Pants.json
//
// Only ids, names, categories and prices are extracted — no descriptions or
// other prose — so the generated catalog is plain factual metadata.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const RAW_DIR = 'data/raw'
const OUT = 'src/lib/generated/itemCatalog.json'

const OBJ_CATEGORY = {
  '-2': 'Gems',
  '-4': 'Fish',
  '-5': 'Eggs',
  '-6': 'Milk',
  '-7': 'Cooking',
  '-8': 'Crafting',
  '-9': 'Big Craftables',
  '-12': 'Minerals',
  '-14': 'Meat',
  '-15': 'Metal Resources',
  '-16': 'Building Resources',
  '-17': 'Sell at Pierre and Marnie',
  '-18': 'Animal Products',
  '-19': 'Fertilizer',
  '-20': 'Junk',
  '-21': 'Bait',
  '-22': 'Tackle',
  '-23': 'Fishing',
  '-24': 'Decor',
  '-25': 'Cooking Ingredients',
  '-26': 'Artisan Goods',
  '-27': 'Artisan Goods',
  '-28': 'Monster Loot',
  '-29': 'Equipment',
  '-74': 'Seeds',
  '-75': 'Vegetables',
  '-79': 'Fruits',
  '-80': 'Flowers',
  '-81': 'Forage',
  '-96': 'Rings',
  '-98': 'Weapons',
  '-99': 'Tools',
  '-100': 'Clothing',
  '-101': 'Trinkets',
  '-102': 'Books',
  '-103': 'Skill Books',
}

const num = (x) => {
  const n = Number.parseInt(x, 10)
  return Number.isFinite(n) ? n : null
}

const cleanName = (name, displayName, id) => {
  if (typeof name === 'string' && name && !name.startsWith('[')) return name
  if (typeof displayName === 'string' && displayName && !displayName.startsWith('[')) {
    return displayName
  }
  return String(id)
}

const objLabel = (category, type) =>
  OBJ_CATEGORY[String(category)] ?? (type && type !== 'Basic' ? type : 'Other')

function loadRaw() {
  if (!existsSync(RAW_DIR)) return {}
  const files = readdirSync(RAW_DIR).filter((f) => f.toLowerCase().endsWith('.json'))
  const find = (...names) => {
    for (const n of names) {
      const hit = files.find((f) => basename(f, '.json').toLowerCase() === n.toLowerCase())
      if (hit) return JSON.parse(readFileSync(join(RAW_DIR, hit), 'utf8'))
    }
    return null
  }
  return {
    objects: find('Objects', 'ObjectInformation'),
    bigCraftables: find('BigCraftables', 'BigCraftablesInformation'),
    weapons: find('Weapons'),
    tools: find('Tools'),
    boots: find('Boots'),
    hats: find('Hats'),
    furniture: find('Furniture'),
    shirts: find('Shirts'),
    pants: find('Pants'),
  }
}

function parseObjects(data) {
  return Object.entries(data).map(([id, v]) => {
    let name
    let type
    let category
    let price
    let edibility
    if (typeof v === 'string') {
      const p = v.split('/')
      name = p[0]
      price = num(p[1])
      edibility = num(p[2])
      const tc = (p[3] ?? '').split(' ')
      type = tc[0] || null
      category = tc.length > 1 ? num(tc[1]) : null
    } else {
      name = cleanName(v.Name, v.DisplayName, id)
      type = v.Type ?? null
      category = typeof v.Category === 'number' ? v.Category : null
      price = num(v.Price)
      edibility = typeof v.Edibility === 'number' ? v.Edibility : null
    }
    const kind = type === 'Ring' ? 'ring' : 'object'
    return {
      qualifiedId: `(O)${id}`,
      id: String(id),
      kind,
      name,
      type,
      category,
      categoryLabel: kind === 'ring' ? 'Rings' : objLabel(category, type),
      price,
      edibility,
      injectable: kind === 'object',
    }
  })
}

function parseBigCraftables(data) {
  return Object.entries(data).map(([id, v]) => {
    const isStr = typeof v === 'string'
    const p = isStr ? v.split('/') : null
    return {
      qualifiedId: `(BC)${id}`,
      id: String(id),
      kind: 'bigCraftable',
      name: isStr ? p[0] : cleanName(v.Name, v.DisplayName, id),
      type: null,
      category: -9,
      categoryLabel: 'Big Craftables',
      price: isStr ? num(p[1]) : num(v.Price),
      edibility: null,
      injectable: false,
    }
  })
}

function parseWeapons(data) {
  return Object.entries(data).map(([id, v]) => {
    const isStr = typeof v === 'string'
    return {
      qualifiedId: `(W)${id}`,
      id: String(id),
      kind: 'weapon',
      name: isStr ? String(v).split('/')[0] : cleanName(v.Name, v.DisplayName, id),
      type: null,
      category: -98,
      categoryLabel: 'Weapons',
      price: isStr ? null : num(v.Price),
      edibility: null,
      injectable: false,
    }
  })
}

function parseTools(data) {
  return Object.entries(data).map(([key, v]) => ({
    qualifiedId: `(T)${key}`,
    id: String(key),
    kind: 'tool',
    name: cleanName(v?.Name, v?.DisplayName, key),
    type: null,
    category: -99,
    categoryLabel: 'Tools',
    price: v && num(v.SalePrice) != null && num(v.SalePrice) >= 0 ? num(v.SalePrice) : null,
    edibility: null,
    injectable: false,
  }))
}

function parseSlashList(data, prefix, kind, categoryLabel, priceIndex) {
  return Object.entries(data).map(([id, v]) => {
    const p = String(v).split('/')
    return {
      qualifiedId: `${prefix}${id}`,
      id: String(id),
      kind,
      name: p[0],
      type: null,
      category: null,
      categoryLabel,
      price: priceIndex != null ? num(p[priceIndex]) : null,
      edibility: null,
      injectable: false,
    }
  })
}

function parseClothes(data, prefix, kind, categoryLabel) {
  return Object.entries(data).map(([id, v]) => ({
    qualifiedId: `${prefix}${id}`,
    id: String(id),
    kind,
    name: cleanName(v?.Name, v?.DisplayName, id),
    type: null,
    category: -100,
    categoryLabel,
    price: num(v?.Price),
    edibility: null,
    injectable: false,
  }))
}

function main() {
  const raw = loadRaw()
  const items = []
  const add = (label, list) => {
    if (!list) return
    items.push(...list)
    console.log(`  ${label.padEnd(16)} ${list.length}`)
  }

  console.log(`Reading ${RAW_DIR}/`)
  if (raw.objects) add('Objects', parseObjects(raw.objects))
  if (raw.bigCraftables) add('BigCraftables', parseBigCraftables(raw.bigCraftables))
  if (raw.weapons) add('Weapons', parseWeapons(raw.weapons))
  if (raw.tools) add('Tools', parseTools(raw.tools))
  if (raw.boots) add('Boots', parseSlashList(raw.boots, '(B)', 'boots', 'Boots', 2))
  if (raw.hats) add('Hats', parseSlashList(raw.hats, '(H)', 'hat', 'Hats', null))
  if (raw.furniture) add('Furniture', parseSlashList(raw.furniture, '(F)', 'furniture', 'Furniture', 5))
  if (raw.shirts) add('Shirts', parseClothes(raw.shirts, '(S)', 'shirt', 'Clothing'))
  if (raw.pants) add('Pants', parseClothes(raw.pants, '(P)', 'pants', 'Clothing'))

  if (!items.length) {
    console.warn(
      `\nNo recognised files in ${RAW_DIR}/. Leaving ${OUT} unchanged ` +
        '(placeholder catalog still in use).',
    )
    return
  }

  const byId = new Map()
  for (const it of items) if (it.name) byId.set(it.qualifiedId, it)
  const catalog = [...byId.values()].sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind.localeCompare(b.kind),
  )

  writeFileSync(OUT, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`\nWrote ${catalog.length} items to ${OUT}`)
}

main()
