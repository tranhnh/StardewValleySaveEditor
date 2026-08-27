// Extracts skeleton item-node templates from real save files, for use as
// injection fallbacks when a save contains no node of a given type to clone.
//
//   node scripts/extract-templates.mjs [--from <dir>]
//
// Default --from is data/saves/ (git-ignored). Every identity, owner and stat
// field is zeroed before writing, so the committed skeletons in
// src/lib/generated/nodeTemplates.json hold no player-specific data — only the
// element structure and order the game expects for that class.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'src/lib/generated/nodeTemplates.json'
const fromFlag = process.argv.indexOf('--from')
const FROM = fromFlag >= 0 ? process.argv[fromFlag + 1] : 'data/saves'

// key -> element names it may appear under, and the xsi:type.
// Big craftables aren't listed: they are Objects with <bigCraftable>true</bigCraftable>,
// so injection reuses the Object clone path rather than a template.
const TARGETS = [
  { key: 'Hat', tags: ['Item', 'hat'], xsi: 'Hat' },
  { key: 'Boots', tags: ['Item', 'boots'], xsi: 'Boots' },
  { key: 'Ring', tags: ['Item', 'leftRing', 'rightRing'], xsi: 'Ring' },
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

/** Return the full `<tag ...>...</tag>` substring starting at/after `from`. */
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

function findNode(xml, target) {
  for (const tag of target.tags) {
    const open = new RegExp(`<${tag}\\s[^>]*xsi:type="${target.xsi}"[^>]*>`, 'g')
    let m
    while ((m = open.exec(xml))) {
      const node = extractBalanced(xml, tag, m.index)
      if (!node) continue
      if (target.bigCraftable && !node.includes('<bigCraftable>true</bigCraftable>')) continue
      if (target.bigCraftable && node.includes('<items>')) continue // skip chests
      return { node, tag }
    }
  }
  return null
}

const replaceLeaf = (xml, tag, value) =>
  xml.replace(new RegExp(`<${tag}>[^<]*</${tag}>`, 'g'), `<${tag}>${value}</${tag}>`)

function neutralize(xml, key) {
  let out = xml
  for (const tag of ['name', 'Name', 'DisplayName']) out = replaceLeaf(out, tag, key)
  for (const tag of [
    'parentSheetIndex',
    'indexInTileSheet',
    'initialParentTileIndex',
    'itemId',
    'which',
    'uniqueID',
    'owner',
    'preservedParentSheetIndex',
    'price',
    'defenseBonus',
    'immunityBonus',
    'appliedBootSheetIndex',
    'minutesUntilReady',
    'quality',
    'SpecialVariable',
  ]) {
    out = replaceLeaf(out, tag, '0')
  }
  for (const tag of ['stack', 'Stack']) out = replaceLeaf(out, tag, '1')
  out = out.replace(
    /<tileLocation>.*?<\/tileLocation>/,
    '<tileLocation><X>0</X><Y>0</Y></tileLocation>',
  )
  return out
}

function renameOuter(node, tag) {
  if (tag === 'Item') return node
  return node
    .replace(new RegExp(`^<${tag}(\\s|>)`), '<Item$1')
    .replace(new RegExp(`</${tag}>$`), '</Item>')
}

function ensureXmlns(node) {
  if (node.includes('xmlns:xsi=')) return node
  return node.replace(/^<Item\s/, '<Item xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ')
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
    const skeleton = ensureXmlns(neutralize(renameOuter(hit.node, hit.tag), target.key))
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
