// Builds src/lib/generated/itemCatalog.json from unpacked game data.
//
// Put the JSON exported by StardewXnbHack (or equivalent) anywhere under
// data/raw/ — a single file, a handful, or the whole "Content (unpacked)"
// folder; the script searches recursively. Then run: npm run build:catalog
//
// Localised variants (Boots.de-DE.json etc.) are ignored: only an exact
// basename match counts.
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
import { basename, join, sep } from 'node:path'

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
  '-24': 'Furniture',
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

// Only a few of the raw object `Type` strings make sensible filter buckets;
// the rest ("Basic", "asdf", "interactive", ...) collapse to "Other".
const TYPE_LABEL = {
  Minerals: 'Minerals',
  Fish: 'Fish',
  Cooking: 'Cooking',
  Crafting: 'Crafting',
  Seeds: 'Seeds',
  Arch: 'Artifacts',
  Ring: 'Rings',
  Litter: 'Litter',
  Quest: 'Quest Items',
}

const objLabel = (category, type) =>
  OBJ_CATEGORY[String(category)] ?? TYPE_LABEL[type] ?? 'Other'

function loadRaw() {
  if (!existsSync(RAW_DIR)) return {}
  const files = readdirSync(RAW_DIR, { recursive: true })
    .map((f) => join(RAW_DIR, f))
    .filter((f) => f.toLowerCase().endsWith('.json'))
    // shallowest path first, so a top-level file wins over a nested copy
    .sort((a, b) => a.split(sep).length - b.split(sep).length)
  const find = (...names) => {
    for (const n of names) {
      const hit = files.find((f) => basename(f, '.json').toLowerCase() === n.toLowerCase())
      if (hit) return JSON.parse(readFileSync(hit, 'utf8'))
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
      // The Combined Ring (880) has nested combinedRings state we can't build.
      injectable: kind === 'object' || (kind === 'ring' && id !== '880'),
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
      injectable: true,
    }
  })
}

// Data/Boots: Name/Description/Price/AddedDefense/AddedImmunity/ColorIndex/DisplayName
function parseBoots(data) {
  return Object.entries(data).map(([id, v]) => {
    const p = String(v).split('/')
    return {
      qualifiedId: `(B)${id}`,
      id: String(id),
      kind: 'boots',
      name: p[0],
      type: null,
      category: -97,
      categoryLabel: 'Boots',
      price: num(p[2]),
      edibility: null,
      injectable: true,
      boots: {
        defense: num(p[3]) ?? 0,
        immunity: num(p[4]) ?? 0,
        colorIndex: num(p[5]) ?? 0,
      },
    }
  })
}

// Data/Hats: Name/Description/ShowRealHair/HideHairstyleOffset/tags/DisplayName
function parseHats(data) {
  return Object.entries(data).map(([id, v]) => {
    const p = String(v).split('/')
    return {
      qualifiedId: `(H)${id}`,
      id: String(id),
      kind: 'hat',
      name: p[0],
      type: null,
      category: -95,
      categoryLabel: 'Hats',
      price: null,
      edibility: null,
      injectable: true,
      hat: {
        skipHairDraw: (p[2] ?? '').toLowerCase() !== 'true',
        ignoreHairstyleOffset: (p[3] ?? '').toLowerCase() === 'true',
      },
    }
  })
}

// Pre-1.6 Weapons is slash: Name/Desc/MinDmg/MaxDmg/Knockback/Speed/Precision/Defense/Type/...
function parseWeapons(data) {
  return Object.entries(data).map(([id, v]) => {
    const isStr = typeof v === 'string'
    const p = isStr ? String(v).split('/') : null
    const w = isStr
      ? {
          minDamage: num(p[2]) ?? 0,
          maxDamage: num(p[3]) ?? 0,
          knockback: num(p[4]) ?? 0,
          speed: num(p[5]) ?? 0,
          precision: num(p[6]) ?? 0,
          defense: num(p[7]) ?? 0,
          type: num(p[8]) ?? 3,
          areaOfEffect: num(p[11]) ?? 0,
          critChance: 0.02,
          critMultiplier: 3,
        }
      : {
          minDamage: num(v.MinDamage) ?? 0,
          maxDamage: num(v.MaxDamage) ?? 0,
          knockback: Number(v.Knockback) || 0,
          speed: num(v.Speed) ?? 0,
          precision: num(v.Precision) ?? 0,
          defense: num(v.Defense) ?? 0,
          type: num(v.Type) ?? 3,
          areaOfEffect: num(v.AreaOfEffect) ?? 0,
          critChance: Number(v.CritChance) || 0.02,
          critMultiplier: Number(v.CritMultiplier) || 3,
        }
    return {
      qualifiedId: `(W)${id}`,
      id: String(id),
      kind: 'weapon',
      name: isStr ? p[0] : cleanName(v.Name, v.DisplayName, id),
      type: null,
      category: -98,
      categoryLabel: 'Weapons',
      price: null,
      edibility: null,
      injectable: true,
      weapon: w,
    }
  })
}

function parseTools(data) {
  return Object.entries(data).map(([key, v]) => {
    const menu = num(v?.MenuSpriteIndex)
    const sprite = num(v?.SpriteIndex) ?? 0
    const upgrade = num(v?.UpgradeLevel)
    const slots = num(v?.AttachmentSlots)
    return {
      qualifiedId: `(T)${key}`,
      id: String(key),
      kind: 'tool',
      name: cleanName(v?.Name, v?.DisplayName, key),
      type: null,
      category: -99,
      categoryLabel: 'Tools',
      price: null,
      edibility: null,
      injectable: true,
      tool: {
        className: String(v?.ClassName ?? key),
        spriteIndex: sprite,
        menuSpriteIndex: menu != null && menu >= 0 ? menu : sprite,
        upgradeLevel: upgrade != null && upgrade >= 0 ? upgrade : 0,
        attachmentSlots: slots != null && slots >= 0 ? slots : 0,
      },
    }
  })
}

function parseClothes(data, prefix, kind, categoryLabel) {
  const clothesType = kind === 'pants' ? 1 : 0
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
    injectable: true,
    clothing: {
      clothesType,
      spriteIndex: num(v?.SpriteIndex) ?? 0,
      dyeable: v?.CanBeDyed === true,
      isPrismatic: v?.IsPrismatic === true,
    },
  }))
}

// Furniture type string -> the game's furniture_type int (getTypeNumberFromName).
const FURNITURE_TYPE = {
  chair: 0,
  bench: 1,
  couch: 2,
  armchair: 3,
  dresser: 4,
  'long table': 5,
  painting: 6,
  lamp: 7,
  decor: 8,
  bookcase: 10,
  table: 11,
  rug: 12,
  window: 13,
  fireplace: 14,
  bed: 15,
  torch: 16,
  sconce: 17,
}
// Types with dedicated Furniture subclasses we don't build yet.
const FURNITURE_SUBCLASS = new Set([
  'tv',
  'bed',
  'bed double',
  'bed child',
  'fishtank',
  'dresser',
  'randomized_plant',
])

// Data/Furniture slash: name/type/tilesheetSize/boundingBoxSize/rotations/price/...
function parseFurniture(data) {
  const SHEET_W = 512
  return Object.entries(data).map(([id, v]) => {
    const p = String(v).split('/')
    const type = (p[1] ?? 'decor').trim()
    const [tileW = 1, tileH = 1] = (p[2] ?? '-1 -1').split(' ').map((n) => {
      const x = Number.parseInt(n, 10)
      return Number.isFinite(x) && x > 0 ? x : 1
    })
    const [boxW = 1, boxH = 1] = (p[3] ?? '-1 -1').split(' ').map((n) => {
      const x = Number.parseInt(n, 10)
      return Number.isFinite(x) && x > 0 ? x : 1
    })
    const index = Number.parseInt(id, 10) || 0
    return {
      qualifiedId: `(F)${id}`,
      id: String(id),
      kind: 'furniture',
      name: p[0],
      type: null,
      category: null,
      categoryLabel: 'Furniture',
      price: num(p[5]),
      edibility: null,
      injectable: !FURNITURE_SUBCLASS.has(type) && type !== 'tv',
      furniture: {
        furnitureType: FURNITURE_TYPE[type] ?? 8,
        rotations: num(p[4]) ?? 1,
        srcX: (index * 16) % SHEET_W,
        srcY: Math.floor((index * 16) / SHEET_W) * 16,
        srcW: tileW * 16,
        srcH: tileH * 16,
        boxW: boxW * 64,
        boxH: boxH * 64,
      },
    }
  })
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
  if (raw.boots) add('Boots', parseBoots(raw.boots))
  if (raw.hats) add('Hats', parseHats(raw.hats))
  if (raw.furniture) add('Furniture', parseFurniture(raw.furniture))
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
