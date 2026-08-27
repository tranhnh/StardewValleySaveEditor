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

const normTexture = (texture, fallback) => {
  if (!texture) return fallback
  return String(texture).replace(/\\/g, '/').split('/').pop()
}

function loadRaw() {
  if (!existsSync(RAW_DIR)) return {}
  const files = readdirSync(RAW_DIR, { recursive: true })
    .map((f) => join(RAW_DIR, f))
    .filter((f) => f.toLowerCase().endsWith('.json'))
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
    let spriteIndex = num(id) ?? 0
    let sheet = 'springobjects'
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
      spriteIndex = num(v.SpriteIndex) ?? spriteIndex
      sheet = normTexture(v.Texture, 'springobjects')
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
      injectable: kind === 'object' || (kind === 'ring' && id !== '880'),
      sprite: { sheet, index: spriteIndex },
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
      sprite: {
        sheet: isStr ? 'Craftables' : normTexture(v.Texture, 'Craftables'),
        index: (isStr ? null : num(v.SpriteIndex)) ?? num(id) ?? 0,
      },
    }
  })
}

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
      sprite: { sheet: 'springobjects', index: num(id) ?? 0 },
    }
  })
}

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
      sprite: { sheet: 'hats', index: num(p[6]) ?? num(id) ?? 0 },
    }
  })
}

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
      sprite: { sheet: 'weapons', index: num(id) ?? 0 },
    }
  })
}

function parseTools(data) {
  return Object.entries(data)
    .filter(([key]) => !/TrashCan$/.test(key))
    .map(([key, v]) => {
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

const NAMED_COLORS = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  gray: '#808080',
  grey: '#808080',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
}

function normalizeColor(spec) {
  if (spec == null) return null
  const s = String(spec).trim()
  if (!s) return null
  const named = NAMED_COLORS[s.toLowerCase()]
  if (named) return named
  const parts = s.split(/\s+/).map((n) => Number.parseInt(n, 10))
  if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
    const hex = parts
      .slice(0, 3)
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
      .join('')
    return `#${hex}`
  }
  return null
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
      defaultColor: normalizeColor(v?.DefaultColor),
    },
  }))
}

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
const FURNITURE_SUBCLASS = new Set([
  'tv',
  'bed',
  'bed double',
  'bed child',
  'fishtank',
  'dresser',
  'randomized_plant',
])

const FURNITURE_DEFAULT_SIZE = {
  chair: [1, 2],
  bench: [2, 2],
  couch: [3, 2],
  armchair: [2, 2],
  dresser: [2, 2],
  'long table': [5, 3],
  table: [2, 2],
  bookcase: [2, 3],
  painting: [2, 2],
  lamp: [1, 3],
  rug: [3, 2],
  window: [1, 2],
  fireplace: [1, 3],
  bed: [2, 3],
  torch: [1, 3],
  sconce: [1, 2],
  decor: [1, 1],
}

const FURNITURE_SHEET_W = { furniture: 512, furniture_2: 256, furniture_3: 208 }

function parseFurniture(data) {
  return Object.entries(data).map(([id, v]) => {
    const p = String(v).split('/')
    const type = (p[1] ?? 'decor').trim()

    const explicit = (p[2] ?? '').trim().split(' ').map((n) => Number.parseInt(n, 10))
    const [tileW, tileH] =
      explicit.length === 2 && explicit[0] > 0 && explicit[1] > 0
        ? explicit
        : (FURNITURE_DEFAULT_SIZE[type] ?? [1, 1])

    const box = (p[3] ?? '').trim().split(' ').map((n) => Number.parseInt(n, 10))
    const [boxW, boxH] = box.length === 2 && box[0] > 0 && box[1] > 0 ? box : [tileW, tileH]

    const sheet = normTexture((p[9] ?? '').trim() || null, 'furniture')
    const sheetW = FURNITURE_SHEET_W[sheet] ?? 512
    const index = num(p[8]) ?? num(id) ?? 0

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
        texture: sheet,
        srcX: (index * 16) % sheetW,
        srcY: Math.floor((index * 16) / sheetW) * 16,
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
