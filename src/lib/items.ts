import {
  catalogByQualifiedId,
  type CatalogItem,
  type InjectableKind,
} from './catalog'
import { packColor, parseColorHex, unpackColor, type Rgb } from './color'
import nodeTemplates from './generated/nodeTemplates.json'
import { XSI_NS, child, childText, createEl, setChildText, toInt } from './xml'

export type Quality = 0 | 1 | 2 | 4

export const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Silver' },
  { value: 2, label: 'Gold' },
  { value: 4, label: 'Iridium' },
]

export interface ItemPayload {
  kind: InjectableKind
  id: string
  name: string
  stack: number
  quality: Quality
  color?: string | null
}

export type GameEra = 'v16plus' | 'legacy'

export type SlotKind = 'empty' | 'object' | 'other' | 'clothing'

export interface InventorySlot {
  index: number
  kind: SlotKind
  typeName: string
  name: string
  objectId: number | null
  stack: number
  quality: Quality
  qualifiedId?: string | null
  clothesColor?: Rgb | null
  isPrismatic?: boolean
}

export interface InjectResult {
  usedFallbackTemplate: boolean
}

export function detectEra(doc: XMLDocument): GameEra {
  const raw = doc.querySelector('SaveGame > gameVersion')?.textContent?.trim() ?? ''
  const [major, minor] = raw.split('.').map((p) => Number.parseInt(p, 10))
  if (Number.isFinite(major) && (major > 1 || (major === 1 && Number.isFinite(minor) && minor >= 6))) {
    return 'v16plus'
  }
  return 'legacy'
}

export function gameVersionString(doc: XMLDocument): string {
  return doc.querySelector('SaveGame > gameVersion')?.textContent?.trim() || 'unknown (pre-1.3)'
}

export function inventoryEl(doc: XMLDocument): Element {
  const player = doc.querySelector('SaveGame > player')
  if (!player) throw new Error('Save has no <player> element.')
  const items = child(player, 'items')
  if (!items) throw new Error('Save has no <player><items> element.')
  return items
}

export function maxItems(doc: XMLDocument): number {
  const player = doc.querySelector('SaveGame > player')
  const fromNode = player ? toInt(childText(player, 'maxItems'), 0) : 0
  if (fromNode > 0) return fromNode
  return inventoryEl(doc).children.length || 36
}

function xsiType(el: Element): string {
  return el.getAttributeNS(XSI_NS, 'type') ?? el.getAttribute('xsi:type') ?? ''
}

function isNil(el: Element): boolean {
  return (el.getAttributeNS(XSI_NS, 'nil') ?? el.getAttribute('xsi:nil')) === 'true'
}

export function readInventory(doc: XMLDocument): InventorySlot[] {
  const items = inventoryEl(doc)
  const slots: InventorySlot[] = []
  const kids = Array.from(items.children)

  for (let index = 0; index < kids.length; index++) {
    const el = kids[index]
    if (isNil(el)) {
      slots.push({ index, kind: 'empty', typeName: '', name: '', objectId: null, stack: 0, quality: 0 })
      continue
    }
    const type = xsiType(el)
    if (type === 'Object') {
      slots.push({
        index,
        kind: 'object',
        typeName: 'Object',
        name: childText(el, 'name') ?? childText(el, 'Name') ?? '(unknown)',
        objectId: toInt(childText(el, 'parentSheetIndex') ?? childText(el, 'itemId'), 0),
        stack: toInt(childText(el, 'stack') ?? childText(el, 'Stack'), 1),
        quality: toQuality(toInt(childText(el, 'quality'), 0)),
      })
    } else if (type === 'Clothing') {
      const idRaw = (childText(el, 'itemId') ?? childText(el, 'parentSheetIndex') ?? '').trim()
      const ct = (childText(el, 'clothesType') ?? '').trim().toUpperCase()
      const prefix = ct === 'PANTS' || ct === '1' ? '(P)' : '(S)'
      slots.push({
        index,
        kind: 'clothing',
        typeName: 'Clothing',
        name: childText(el, 'name') ?? childText(el, 'Name') ?? '',
        objectId: null,
        stack: 1,
        quality: 0,
        qualifiedId: idRaw ? `${prefix}${idRaw}` : null,
        clothesColor: readClothesColor(el),
        isPrismatic: (childText(el, 'isPrismatic') ?? 'false') === 'true',
      })
    } else {
      const typeName = type || el.tagName
      const idRaw = (childText(el, 'itemId') ?? childText(el, 'parentSheetIndex') ?? '').trim()
      const prefix = otherQidPrefix(type)
      slots.push({
        index,
        kind: 'other',
        typeName,
        name: childText(el, 'name') ?? childText(el, 'Name') ?? '',
        objectId: null,
        stack: 1,
        quality: 0,
        qualifiedId: prefix && idRaw ? `(${prefix})${idRaw}` : null,
      })
    }
  }
  return slots
}

export function toQuality(n: number): Quality {
  return n === 1 || n === 2 || n === 4 ? n : 0
}

function otherQidPrefix(type: string): string | null {
  if (type === 'MeleeWeapon' || type === 'Slingshot') return 'W'
  if (type === 'Hat') return 'H'
  if (type === 'Boots') return 'B'
  if (type === 'Ring') return 'O'
  if (type === 'Furniture') return 'F'
  if (TOOL_CLASSES.includes(type)) return 'T'
  return null
}

function readClothesColor(el: Element): Rgb | null {
  const cc = child(el, 'clothesColor')
  if (!cc || isNil(cc)) return null
  const packed = childText(cc, 'PackedValue')
  if (packed != null && packed.trim() !== '') {
    const n = Number(packed.trim())
    if (Number.isFinite(n)) return unpackColor(n)
  }
  const r = toInt(childText(cc, 'R'), -1)
  const g = toInt(childText(cc, 'G'), -1)
  const b = toInt(childText(cc, 'B'), -1)
  return r >= 0 && g >= 0 && b >= 0 ? { r, g, b } : null
}

function slotAt(doc: XMLDocument, index: number): Element {
  const el = inventoryEl(doc).children[index]
  if (!el) throw new Error(`No inventory slot at index ${index}.`)
  return el
}

export function setSlotStack(doc: XMLDocument, index: number, stack: number): void {
  const el = slotAt(doc, index)
  setChildText(el, 'stack', String(stack))
  setChildText(el, 'Stack', String(stack))
}

export function setSlotQuality(doc: XMLDocument, index: number, quality: Quality): void {
  setChildText(slotAt(doc, index), 'quality', String(quality))
}

export function clearSlot(doc: XMLDocument, index: number): void {
  const items = inventoryEl(doc)
  const current = items.children[index]
  if (!current) throw new Error(`No inventory slot at index ${index}.`)
  const empty = createEl(doc, 'Item')
  empty.setAttributeNS(XSI_NS, 'xsi:nil', 'true')
  items.replaceChild(empty, current)
}

function isPlainObjectNode(el: Element): boolean {
  if (xsiType(el) !== 'Object') return false
  if ((childText(el, 'bigCraftable') ?? 'false') === 'true') return false
  if (childText(el, 'minutesUntilReady') && toInt(childText(el, 'minutesUntilReady'), 0) !== 0) return false
  const held = child(el, 'heldObject')
  if (held && held.children.length > 0) return false
  if (child(el, 'items')) return false
  return true
}

function findTemplateNode(doc: XMLDocument): { node: Element; renameToItem: boolean } | null {
  for (const el of Array.from(inventoryEl(doc).children)) {
    if (isPlainObjectNode(el)) return { node: el, renameToItem: false }
  }
  for (const el of Array.from(doc.getElementsByTagName('Item'))) {
    if (isPlainObjectNode(el)) return { node: el, renameToItem: false }
  }
  for (const el of Array.from(doc.getElementsByTagName('Object'))) {
    if (isPlainObjectNode(el)) return { node: el, renameToItem: true }
  }
  return null
}

function renameElement(el: Element, newTag: string): Element {
  const doc = el.ownerDocument
  const replacement = createEl(doc, newTag)
  for (const attr of Array.from(el.attributes)) {
    if (attr.namespaceURI) replacement.setAttributeNS(attr.namespaceURI, attr.name, attr.value)
    else replacement.setAttribute(attr.name, attr.value)
  }
  while (el.firstChild) replacement.appendChild(el.firstChild)
  return replacement
}

function neutralize(node: Element): void {
  const zero: Record<string, string> = {
    minutesUntilReady: '0',
    readyForHarvest: 'false',
    isSpawnedObject: 'false',
    isOn: 'true',
    questItem: 'false',
    questId: '0',
    owner: '0',
    preservedParentSheetIndex: '0',
    hasBeenInInventory: 'true',
    hasBeenPickedUpByFarmer: 'true',
    isRecipe: 'false',
    isLostItem: 'false',
  }
  for (const [tag, value] of Object.entries(zero)) setChildText(node, tag, value)

  const tile = child(node, 'tileLocation')
  if (tile) {
    setChildText(tile, 'X', '0')
    setChildText(tile, 'Y', '0')
  }
  const held = child(node, 'heldObject')
  if (held) {
    while (held.firstChild) held.removeChild(held.firstChild)
    held.setAttributeNS(XSI_NS, 'xsi:nil', 'true')
  }
}

const QID_PREFIX: Record<InjectableKind, string> = {
  object: 'O',
  bigCraftable: 'BC',
  hat: 'H',
  boots: 'B',
  ring: 'O',
  weapon: 'W',
  tool: 'T',
  shirt: 'S',
  pants: 'P',
  furniture: 'F',
}

function resolveXsiType(kind: InjectableKind, def: CatalogItem | undefined): string {
  switch (kind) {
    case 'object':
    case 'bigCraftable':
      return 'Object'
    case 'hat':
      return 'Hat'
    case 'boots':
      return 'Boots'
    case 'ring':
      return 'Ring'
    case 'weapon':
      return def && ['32', '33', '34'].includes(def.id) ? 'Slingshot' : 'MeleeWeapon'
    case 'tool':
      return def?.tool?.className ?? 'GenericTool'
    case 'shirt':
    case 'pants':
      return 'Clothing'
    case 'furniture':
      return 'Furniture'
  }
}

const EQUIPPED_SLOTS: Record<string, string[]> = {
  Hat: ['hat'],
  Boots: ['boots'],
  Ring: ['leftRing', 'rightRing'],
  Clothing: ['shirtItem', 'pantsItem'],
}

const TOOL_CLASSES = [
  'Axe',
  'Pickaxe',
  'Hoe',
  'WateringCan',
  'FishingRod',
  'MilkPail',
  'Shears',
  'Pan',
  'Lantern',
  'Wand',
  'GenericTool',
]

function findTypedNode(doc: XMLDocument, xsi: string): { node: Element; tag: string } | null {
  for (const el of Array.from(doc.getElementsByTagName('Item'))) {
    if (xsiType(el) === xsi && !isNil(el)) return { node: el, tag: 'Item' }
  }
  for (const slot of EQUIPPED_SLOTS[xsi] ?? []) {
    for (const el of Array.from(doc.getElementsByTagName(slot))) {
      if (!isNil(el) && el.children.length > 0) return { node: el, tag: slot }
    }
  }
  return null
}

function parseTemplate(doc: XMLDocument, xml: string): Element {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml')
  if (parsed.querySelector('parsererror')) throw new Error('Internal: node template failed to parse.')
  const node = doc.importNode(parsed.documentElement, true) as Element
  node.removeAttribute('xmlns:xsi')
  return node
}

const HAND_TEMPLATES: Record<string, string> = {
  Ring:
    `<Item xmlns:xsi="${XSI_NS}" xsi:type="Ring">` +
    '<isLostItem>false</isLostItem><category>-96</category>' +
    '<hasBeenInInventory>true</hasBeenInInventory><name>Ring</name>' +
    '<parentSheetIndex>0</parentSheetIndex><itemId>0</itemId>' +
    '<specialItem>false</specialItem><isRecipe>false</isRecipe>' +
    '<quality>0</quality><stack>1</stack><SpecialVariable>0</SpecialVariable>' +
    '<indexInTileSheet>0</indexInTileSheet><uniqueID>0</uniqueID></Item>',
  Slingshot:
    `<Item xmlns:xsi="${XSI_NS}" xsi:type="Slingshot">` +
    '<isLostItem>false</isLostItem><category>-98</category>' +
    '<hasBeenInInventory>true</hasBeenInInventory><name>Slingshot</name>' +
    '<parentSheetIndex>0</parentSheetIndex><itemId>0</itemId>' +
    '<specialItem>false</specialItem><isRecipe>false</isRecipe>' +
    '<quality>0</quality><stack>1</stack><SpecialVariable>0</SpecialVariable>' +
    '<initialParentTileIndex>0</initialParentTileIndex>' +
    '<currentParentTileIndex>0</currentParentTileIndex>' +
    '<indexOfMenuItemView>0</indexOfMenuItemView><instantUse>false</instantUse>' +
    '<isEfficient>false</isEfficient><animationSpeedModifier>1</animationSpeedModifier>' +
    '<upgradeLevel>0</upgradeLevel><numAttachmentSlots>1</numAttachmentSlots>' +
    '<attachments><Object xsi:nil="true" /></attachments></Item>',
}

function templateFor(xsi: string): string | undefined {
  const direct = (nodeTemplates as Record<string, string>)[xsi] ?? HAND_TEMPLATES[xsi]
  if (direct) return direct
  if (TOOL_CLASSES.includes(xsi)) {
    const templates = nodeTemplates as Record<string, string>
    const base = templates.Hoe ?? templates.GenericTool
    if (base) return base.replace(/xsi:type="[A-Za-z]+"/, `xsi:type="${xsi}"`)
  }
  return undefined
}

interface ObtainedNode {
  node: Element
  usedFallbackTemplate: boolean
}

function obtainNode(doc: XMLDocument, xsi: string): ObtainedNode {
  if (xsi === 'Object') {
    const template = findTemplateNode(doc)
    if (template) {
      let node = template.node.cloneNode(true) as Element
      if (template.renameToItem) node = renameElement(node, 'Item')
      return { node, usedFallbackTemplate: false }
    }
    if (detectEra(doc) !== 'legacy') {
      throw new Error(
        'This save has no existing item to safely copy, and automatic template ' +
          'generation is only trusted for pre-1.6 saves. Add any item to your ' +
          'inventory in-game, save, and try again.',
      )
    }
    return { node: parseTemplate(doc, LEGACY_OBJECT_TEMPLATE), usedFallbackTemplate: true }
  }

  const existing = findTypedNode(doc, xsi)
  if (existing) {
    let node = existing.node.cloneNode(true) as Element
    if (existing.tag !== 'Item') {
      node = renameElement(node, 'Item')
      if (!node.getAttribute('xsi:type')) node.setAttributeNS(XSI_NS, 'xsi:type', xsi)
    }
    return { node, usedFallbackTemplate: false }
  }
  const tpl = templateFor(xsi)
  if (!tpl) {
    throw new Error(`This save has no ${xsi} to copy and no bundled ${xsi} template is available.`)
  }
  return { node: parseTemplate(doc, tpl), usedFallbackTemplate: true }
}

function isNumericId(id: string): boolean {
  return /^-?\d+$/.test(id)
}

function spriteIndexFor(id: string, def: CatalogItem | undefined): string {
  if (isNumericId(id)) return id
  return String(def?.sprite?.index ?? -1)
}

function setId(node: Element, id: string, era: GameEra, spriteIndex: string): void {
  for (const tag of ['parentSheetIndex', 'indexInTileSheet', 'initialParentTileIndex']) {
    setChildText(node, tag, spriteIndex)
  }
  if (era === 'v16plus') setChildText(node, 'itemId', id)
}

function applyObject(
  node: Element,
  payload: ItemPayload,
  def: CatalogItem | undefined,
  era: GameEra,
): void {
  for (const tag of ['name', 'Name', 'DisplayName']) setChildText(node, tag, payload.name)
  setId(node, payload.id, era, spriteIndexFor(payload.id, def))

  if (payload.kind === 'bigCraftable') {
    setChildText(node, 'bigCraftable', 'true')
    setChildText(node, 'type', def?.type || 'Crafting')
    setChildText(node, 'category', '-9')
    setChildText(node, 'Category', '-9')
    setChildText(node, 'edibility', '-300')
    setChildText(node, 'quality', '0')
    for (const tag of ['stack', 'Stack']) setChildText(node, tag, String(payload.stack))
    if (def?.price != null) setChildText(node, 'price', String(def.price))
    return
  }

  for (const tag of ['stack', 'Stack']) setChildText(node, tag, String(payload.stack))
  setChildText(node, 'quality', String(payload.quality))
  if (def) {
    if (def.category != null) {
      setChildText(node, 'category', String(def.category))
      setChildText(node, 'Category', String(def.category))
    }
    if (def.type) setChildText(node, 'type', def.type)
    if (def.price != null) setChildText(node, 'price', String(def.price))
    if (def.edibility != null) setChildText(node, 'edibility', String(def.edibility))
  }
}

function applyHat(node: Element, payload: ItemPayload, def: CatalogItem | undefined): void {
  setChildText(node, 'name', payload.name)
  setChildText(node, 'itemId', payload.id)
  setChildText(node, 'parentSheetIndex', spriteIndexFor(payload.id, def))
  setChildText(node, 'category', '-95')
  setChildText(node, 'quality', '0')
  setChildText(node, 'stack', '1')
  if (def?.hat) {
    setChildText(node, 'skipHairDraw', String(def.hat.skipHairDraw))
    setChildText(node, 'ignoreHairstyleOffset', String(def.hat.ignoreHairstyleOffset))
  }
}

function applyBoots(node: Element, payload: ItemPayload, def: CatalogItem | undefined): void {
  setChildText(node, 'name', payload.name)
  for (const tag of ['parentSheetIndex', 'itemId', 'indexInTileSheet']) {
    setChildText(node, tag, payload.id)
  }
  setChildText(node, 'category', '-97')
  setChildText(node, 'quality', '0')
  setChildText(node, 'stack', '1')
  if (def?.boots) {
    setChildText(node, 'defenseBonus', String(def.boots.defense))
    setChildText(node, 'immunityBonus', String(def.boots.immunity))
    setChildText(node, 'indexInColorSheet', String(def.boots.colorIndex))
  }
  if (def?.price != null) setChildText(node, 'price', String(def.price))
}

function applyRing(node: Element, payload: ItemPayload): void {
  setChildText(node, 'name', payload.name)
  for (const tag of ['parentSheetIndex', 'itemId', 'indexInTileSheet']) {
    setChildText(node, tag, payload.id)
  }
  setChildText(node, 'category', '-96')
  setChildText(node, 'quality', '0')
  setChildText(node, 'stack', '1')
}

function setRect(node: Element, tag: string, x: number, y: number, w: number, h: number): void {
  const rect = child(node, tag)
  if (!rect) return
  setChildText(rect, 'X', String(x))
  setChildText(rect, 'Y', String(y))
  setChildText(rect, 'Width', String(w))
  setChildText(rect, 'Height', String(h))
  const loc = child(rect, 'Location')
  if (loc) {
    setChildText(loc, 'X', String(x))
    setChildText(loc, 'Y', String(y))
  }
  const size = child(rect, 'Size')
  if (size) {
    setChildText(size, 'X', String(w))
    setChildText(size, 'Y', String(h))
  }
}

const WEAPON_ID_TAGS = [
  'parentSheetIndex',
  'itemId',
  'initialParentTileIndex',
  'InitialParentTileIndex',
  'currentParentTileIndex',
  'indexOfMenuItemView',
  'IndexOfMenuItemView',
]

function applyWeapon(node: Element, payload: ItemPayload, def: CatalogItem | undefined): void {
  setChildText(node, 'name', payload.name)
  const spriteIndex = spriteIndexFor(payload.id, def)
  for (const tag of WEAPON_ID_TAGS) {
    setChildText(node, tag, tag === 'itemId' ? payload.id : spriteIndex)
  }
  setChildText(node, 'category', '-98')
  setChildText(node, 'stack', '1')
  setChildText(node, 'quality', '0')
  const w = def?.weapon
  if (w) {
    setChildText(node, 'minDamage', String(w.minDamage))
    setChildText(node, 'maxDamage', String(w.maxDamage))
    setChildText(node, 'speed', String(w.speed))
    setChildText(node, 'addedPrecision', String(w.precision))
    setChildText(node, 'addedDefense', String(w.defense))
    setChildText(node, 'addedAreaOfEffect', String(w.areaOfEffect))
    setChildText(node, 'knockback', String(w.knockback))
    setChildText(node, 'critChance', String(w.critChance))
    setChildText(node, 'critMultiplier', String(w.critMultiplier))
    setChildText(node, 'type', String(w.type))
  }
}

function applyTool(node: Element, payload: ItemPayload, def: CatalogItem | undefined): void {
  setChildText(node, 'name', payload.name)
  setChildText(node, 'itemId', payload.id)
  setChildText(node, 'category', '-99')
  setChildText(node, 'stack', '1')
  setChildText(node, 'quality', '0')

  const t = def?.tool
  if (t) {
    for (const tag of ['parentSheetIndex', 'indexOfMenuItemView', 'IndexOfMenuItemView']) {
      setChildText(node, tag, String(t.menuSpriteIndex))
    }
    for (const tag of ['initialParentTileIndex', 'InitialParentTileIndex', 'currentParentTileIndex']) {
      setChildText(node, tag, String(t.spriteIndex))
    }
    setChildText(node, 'upgradeLevel', String(t.upgradeLevel))
    setChildText(node, 'numAttachmentSlots', String(t.attachmentSlots))
  }

  const attachments = child(node, 'attachments')
  if (attachments) {
    while (attachments.firstChild) attachments.removeChild(attachments.firstChild)
    for (let i = 0; i < (t?.attachmentSlots ?? 0); i++) {
      const nil = createEl(node.ownerDocument, 'Object')
      nil.setAttributeNS(XSI_NS, 'xsi:nil', 'true')
      attachments.appendChild(nil)
    }
  }
  setChildText(node, 'WaterLeft', '0')
  setChildText(node, 'waterLeft', '0')
}

function setClothesColor(node: Element, rgb: Rgb): void {
  const doc = node.ownerDocument
  let cc = child(node, 'clothesColor')
  if (!cc) {
    cc = createEl(doc, 'clothesColor')
    node.appendChild(cc)
  }
  cc.removeAttributeNS(XSI_NS, 'nil')
  cc.removeAttribute('xsi:nil')
  while (cc.firstChild) cc.removeChild(cc.firstChild)
  const parts: [string, number][] = [
    ['R', rgb.r],
    ['G', rgb.g],
    ['B', rgb.b],
    ['A', 255],
    ['PackedValue', packColor(rgb)],
  ]
  for (const [tag, value] of parts) {
    const el = createEl(doc, tag)
    el.textContent = String(value)
    cc.appendChild(el)
  }
}

function applyClothing(node: Element, payload: ItemPayload, def: CatalogItem | undefined): void {
  setChildText(node, 'name', payload.name)
  setChildText(node, 'itemId', payload.id)
  setChildText(node, 'category', '-100')
  setChildText(node, 'stack', '1')
  setChildText(node, 'quality', '0')
  const c = def?.clothing
  if (c) {
    setChildText(node, 'parentSheetIndex', String(c.spriteIndex))
    setChildText(node, 'indexInTileSheet', String(c.spriteIndex))
    setChildText(node, 'clothesType', String(c.clothesType))
    setChildText(node, 'dyeable', String(c.dyeable))
    setChildText(node, 'isPrismatic', String(c.isPrismatic))
  }
  if (def?.price != null) setChildText(node, 'price', String(def.price))

  const rgb =
    parseColorHex(payload.color) ?? parseColorHex(c?.defaultColor ?? null) ?? { r: 255, g: 255, b: 255 }
  setClothesColor(node, rgb)
}

function applyFurniture(node: Element, payload: ItemPayload, def: CatalogItem | undefined): void {
  setChildText(node, 'name', payload.name)
  setChildText(node, 'parentSheetIndex', spriteIndexFor(payload.id, def))
  setChildText(node, 'itemId', payload.id)
  setChildText(node, 'stack', '1')
  setChildText(node, 'quality', '0')
  if (def?.price != null) setChildText(node, 'price', String(def.price))
  const f = def?.furniture
  if (f) {
    setChildText(node, 'furniture_type', String(f.furnitureType))
    setChildText(node, 'rotations', String(f.rotations))
    setChildText(node, 'currentRotation', '0')
    setRect(node, 'sourceRect', f.srcX, f.srcY, f.srcW, f.srcH)
    setRect(node, 'defaultSourceRect', f.srcX, f.srcY, f.srcW, f.srcH)
    setRect(node, 'boundingBox', 0, 0, f.boxW, f.boxH)
    setRect(node, 'defaultBoundingBox', 0, 0, f.boxW, f.boxH)
  }
}

export function injectItem(doc: XMLDocument, index: number, payload: ItemPayload): InjectResult {
  const items = inventoryEl(doc)
  const target = items.children[index]
  if (!target) throw new Error(`No inventory slot at index ${index}.`)
  if (!isNil(target)) throw new Error(`Slot ${index} is not empty. Clear it first.`)

  const def = catalogByQualifiedId(`(${QID_PREFIX[payload.kind]})${payload.id}`)
  const xsi = resolveXsiType(payload.kind, def)
  const { node, usedFallbackTemplate } = obtainNode(doc, xsi)
  neutralize(node)

  const era = detectEra(doc)
  switch (payload.kind) {
    case 'object':
    case 'bigCraftable':
      applyObject(node, payload, def, era)
      break
    case 'hat':
      applyHat(node, payload, def)
      break
    case 'boots':
      applyBoots(node, payload, def)
      break
    case 'ring':
      applyRing(node, payload)
      break
    case 'weapon':
      applyWeapon(node, payload, def)
      break
    case 'tool':
      applyTool(node, payload, def)
      break
    case 'shirt':
    case 'pants':
      applyClothing(node, payload, def)
      break
    case 'furniture':
      applyFurniture(node, payload, def)
      break
  }

  items.replaceChild(node, target)
  return { usedFallbackTemplate }
}

const LEGACY_OBJECT_TEMPLATE = `<Item xmlns:xsi="${XSI_NS}" xsi:type="Object">
  <isLostItem>false</isLostItem>
  <category>-2</category>
  <hasBeenInInventory>true</hasBeenInInventory>
  <name>Item</name>
  <parentSheetIndex>0</parentSheetIndex>
  <specialItem>false</specialItem>
  <SpecialVariable>0</SpecialVariable>
  <DisplayName>Item</DisplayName>
  <Name>Item</Name>
  <Category>-2</Category>
  <hasBeenPickedUpByFarmer>true</hasBeenPickedUpByFarmer>
  <isRecipe>false</isRecipe>
  <price>0</price>
  <edibility>-300</edibility>
  <stack>1</stack>
  <quality>0</quality>
  <bigCraftable>false</bigCraftable>
  <setOutdoors>false</setOutdoors>
  <setIndoors>false</setIndoors>
  <readyForHarvest>false</readyForHarvest>
  <showNextIndex>false</showNextIndex>
  <flipped>false</flipped>
  <isLamp>false</isLamp>
  <minutesUntilReady>0</minutesUntilReady>
  <boundingBox>
    <X>0</X><Y>0</Y><Width>64</Width><Height>64</Height>
    <Location><X>0</X><Y>0</Y></Location>
    <Size><X>64</X><Y>64</Y></Size>
  </boundingBox>
  <scale><X>0</X><Y>0</Y></scale>
  <uses>0</uses>
  <preservedParentSheetIndex>0</preservedParentSheetIndex>
  <destroyOvernight>false</destroyOvernight>
</Item>`
