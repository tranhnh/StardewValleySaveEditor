// Pulls skeleton item nodes out of real saves in data/saves/ (git-ignored, pass
// --from <dir> to override) into src/lib/generated/nodeTemplates.json, used as
// injection fallbacks. Every id / owner / stat is zeroed, so only the element
// structure and order survive — no player data.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'src/lib/generated/nodeTemplates.json'
const fromFlag = process.argv.indexOf('--from')
const FROM = fromFlag >= 0 ? process.argv[fromFlag + 1] : 'data/saves'

// `injectXsi`: source element has no xsi:type of its own (equipped <shirtItem>).
// `rejectIf`: skip a candidate — a world-placed hat has a <boundingBox>, a worn
// one doesn't, and we want the clean worn one.
const TARGETS = [
  // Equipped-slot tags first so a clean worn item wins over a placed/chest one.
  { key: 'Hat', tags: ['hat', 'Item'], xsi: 'Hat', rejectIf: /<boundingBox>/ },
  { key: 'Boots', tags: ['boots', 'Item'], xsi: 'Boots', rejectIf: /<boundingBox>/ },
  { key: 'Ring', tags: ['leftRing', 'rightRing', 'Item'], xsi: 'Ring', rejectIf: /<boundingBox>/ },
  { key: 'MeleeWeapon', tags: ['Item'], xsi: 'MeleeWeapon' },
  { key: 'Clothing', tags: ['shirtItem', 'pantsItem'], noXsiType: true, injectXsi: 'Clothing' },
  { key: 'Furniture', tags: ['Item', 'Furniture'], xsi: 'Furniture', plainOnly: true },
  { key: 'Axe', tags: ['Item'], xsi: 'Axe' },
  { key: 'Pickaxe', tags: ['Item'], xsi: 'Pickaxe' },
  { key: 'Hoe', tags: ['Item'], xsi: 'Hoe' },
  { key: 'WateringCan', tags: ['Item'], xsi: 'WateringCan' },
  { key: 'FishingRod', tags: ['Item'], xsi: 'FishingRod' },
  { key: 'MilkPail', tags: ['Item'], xsi: 'MilkPail' },
  { key: 'Pan', tags: ['Item'], xsi: 'Pan' },
  { key: 'Shears', tags: ['Item'], xsi: 'Shears' },
  { key: 'GenericTool', tags: ['Item'], xsi: 'GenericTool' },
]

function findSaves(dir) {
  const out = []
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        walk(p)
        continue
      }
      if (/_old$|SaveGameInfo|\.(vdf|json|xnb|png|DS_Store)$/i.test(name)) continue
      if (st.size < 1000 || st.size > 80 * 1024 * 1024) continue
      const head = readFileSync(p, 'utf8').slice(0, 300)
      if (head.includes('<SaveGame')) out.push(p)
    }
  }
  walk(dir)
  return out
}

/** The full `<tag>…</tag>` substring from `from`, matching nesting. */
function extractBalanced(xml, tag, from) {
  const token = new RegExp(`<${tag}(?:\\s[^>]*?)?(/?)>|</${tag}>`, 'g')
  token.lastIndex = from
  let depth = 0
  let started = false
  let m
  while ((m = token.exec(xml))) {
    if (m[0].startsWith('</')) {
      depth--
      if (started && depth === 0) return xml.slice(from, token.lastIndex)
    } else if (m[1] === '/') {
      if (!started) return m[0] // self-closing start = empty node
    } else {
      depth++
      started = true
    }
  }
  return null
}

const FURNITURE_SUBCLASS_HINT = /<(bedType|screenPosition|tankFish|heldItems|bedSpot)\b/

function findNode(xml, target) {
  for (const tag of target.tags) {
    const open = target.noXsiType
      ? new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')
      : new RegExp(`<${tag}\\s[^>]*xsi:type="${target.xsi}"[^>]*>`, 'g')
    let m
    while ((m = open.exec(xml))) {
      if (m[0].endsWith('/>')) continue // nil / empty slot
      const node = extractBalanced(xml, tag, m.index)
      if (!node || node.endsWith('/>')) continue
      if (target.bigCraftable && !node.includes('<bigCraftable>true</bigCraftable>')) continue
      if (target.plainOnly && FURNITURE_SUBCLASS_HINT.test(node)) continue
      if (target.rejectIf && target.rejectIf.test(node)) continue
      if (node.includes('<items>') || node.includes('<heldItems>')) continue // containers
      return { node, tag }
    }
  }
  return null
}

const replaceLeaf = (xml, tag, value) =>
  xml.replace(new RegExp(`<${tag}>[^<]*</${tag}>`, 'g'), `<${tag}>${value}</${tag}>`)

const ZERO_TAGS = [
  'parentSheetIndex',
  'indexInTileSheet',
  'initialParentTileIndex',
  'InitialParentTileIndex',
  'currentParentTileIndex',
  'indexOfMenuItemView',
  'IndexOfMenuItemView',
  'itemId',
  'which',
  'uniqueID',
  'owner',
  'preservedParentSheetIndex',
  'price',
  'defenseBonus',
  'immunityBonus',
  'appliedBootSheetIndex',
  'indexInColorSheet',
  'minutesUntilReady',
  'quality',
  'SpecialVariable',
  // weapons
  'minDamage',
  'maxDamage',
  'speed',
  'addedPrecision',
  'addedDefense',
  'addedAreaOfEffect',
  'knockback',
  'critChance',
  'critMultiplier',
  'type',
  'swingTicker',
  'upgradeLevel',
  'numAttachmentSlots',
  // tools
  'WaterLeft',
  'waterLeft',
  'additionalPower',
  'CastDirection',
  // clothing
  'clothesType',
  'indexInTileSheetFemale',
  // furniture
  'currentRotation',
  'rotations',
  'drawHeightOffset',
  'sourceIndexOffset',
]

function neutralize(xml, key) {
  let out = xml
  for (const tag of ['name', 'Name', 'DisplayName']) out = replaceLeaf(out, tag, key)
  for (const tag of ZERO_TAGS) out = replaceLeaf(out, tag, '0')
  for (const tag of ['stack', 'Stack']) out = replaceLeaf(out, tag, '1')
  out = out
    .replace(/<tileLocation>.*?<\/tileLocation>/, '<tileLocation><X>0</X><Y>0</Y></tileLocation>')
    .replace(/<attachments>.*?<\/attachments>/, '<attachments />')
    .replace(/<modData>.*?<\/modData>/, '')
    .replace(/<modData\s*\/>/, '')
    .replace(
      /<clothesColor>.*?<\/clothesColor>/,
      '<clothesColor><R>255</R><G>255</G><B>255</B><A>255</A></clothesColor>',
    )
  return out
}

function renameOuter(node, tag, injectXsi) {
  if (tag !== 'Item') {
    node = node
      .replace(new RegExp(`^<${tag}(\\s|>)`), '<Item$1')
      .replace(new RegExp(`</${tag}>$`), '</Item>')
  }
  if (injectXsi && !/^<Item\s[^>]*xsi:type=/.test(node)) {
    node = node.replace(/^<Item(\s|>)/, `<Item xsi:type="${injectXsi}"$1`)
  }
  return node
}

function ensureXmlns(node) {
  if (node.includes('xmlns:xsi=')) return node
  return node.replace(/^<Item(\s|>)/, '<Item xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"$1')
}

function main() {
  if (!existsSync(FROM)) {
    console.error(`--from directory not found: ${FROM}`)
    process.exit(1)
  }
  const saves = findSaves(FROM)
  console.log(`Scanning ${saves.length} save file(s) under ${FROM}/`)
  if (!saves.length) process.exit(1)

  const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
  const templates = { ...existing }
  const found = []
  const missing = []

  for (const target of TARGETS) {
    let hit = null
    for (const savePath of saves) {
      const xml = readFileSync(savePath, 'utf8')
      const r = findNode(xml, target)
      if (r) {
        hit = { ...r, from: savePath }
        break
      }
    }
    if (!hit) {
      missing.push(target.key)
      delete templates[target.key]
      continue
    }
    const renamed = renameOuter(hit.node, hit.tag, target.injectXsi)
    const skeleton = ensureXmlns(neutralize(renamed, target.key))
    templates[target.key] = skeleton
    found.push(`${target.key} (${skeleton.length} chars, from ${hit.from.split('/').pop()})`)
  }

  writeFileSync(OUT, `${JSON.stringify(templates, null, 2)}\n`)
  console.log(`\nExtracted: ${found.join(', ') || 'none'}`)
  if (missing.length) {
    console.log(`Not found in any save (kept previous / none): ${missing.join(', ')}`)
  }
  console.log(`Wrote ${OUT}`)
}

main()
