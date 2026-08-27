// Inventory reading and, importantly, safe item injection.
//
// Strategy for adding an item (see README):
//   1. Never grow the <items> list. Find an existing <Item xsi:nil="true" />.
//   2. Never hand-write a class schema. Instead clone a real, already-valid node
//      of the same xsi:type from the save (the game is strict about element
//      order; a real node is correct for this exact game version). For hats,
//      boots and rings that also means equipped slots (<hat>, <boots>,
//      <leftRing>, <rightRing>), with the tag renamed to <Item>.
//   3. Overwrite only identity + the type's own fields, neutralise any
//      world/machine state, then replaceChild into the empty slot.
//   4. Fall back to a bundled skeleton (src/lib/generated/nodeTemplates.json,
//      extracted from real saves) only when the save has no node of that type.

import {
  catalogByQualifiedId,
  type CatalogItem,
  type InjectableKind,
} from './catalog'
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
  /** Unqualified id as a string, e.g. "74". */
  id: string
  name: string
  stack: number
  quality: Quality
}

export type GameEra = 'v16plus' | 'legacy'

export type SlotKind = 'empty' | 'object' | 'other'

export interface InventorySlot {
  index: number
  kind: SlotKind
  /** For `other`: the xsi:type, e.g. "MeleeWeapon", "Hat", "Ring", "Boots". */
  typeName: string
  name: string
  objectId: number | null
  stack: number
  quality: Quality
}

export interface InjectResult {
  usedFallbackTemplate: boolean
}

// ---------------------------------------------------------------------------

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

/** The host player's <items> element. */
export function inventoryEl(doc: XMLDocument): Element {
  const player = doc.querySelector('SaveGame > player')
  if (!player) throw new Error('Save has no <player> element.')
  const items = child(player, 'items')
  if (!items) throw new Error('Save has no <player><items> element.')
  return items
}

/** Backpack capacity: 12, 24 or 36. Falls back to the actual node count. */
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

// ---------------------------------------------------------------------------

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
    } else {
      slots.push({
        index,
        kind: 'other',
        typeName: type || el.tagName,
        name: childText(el, 'name') ?? childText(el, 'Name') ?? '',
        objectId: null,
        stack: 1,
        quality: 0,
      })
    }
  }
  return slots
}

/** Coerce any number to a valid quality tier (0 normal, 1 silver, 2 gold, 4 iridium). */
export function toQuality(n: number): Quality {
  return n === 1 || n === 2 || n === 4 ? n : 0
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

/** Turn a populated slot back into an empty one: <Item xsi:nil="true" />. */
export function clearSlot(doc: XMLDocument, index: number): void {
  const items = inventoryEl(doc)
  const current = items.children[index]
  if (!current) throw new Error(`No inventory slot at index ${index}.`)
  const empty = createEl(doc, 'Item')
  empty.setAttributeNS(XSI_NS, 'xsi:nil', 'true')
  items.replaceChild(empty, current)
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/**
 * True when `el` is a plain object node we can safely clone: not a big
 * craftable, not a machine holding something, not a container.
 */
function isPlainObjectNode(el: Element): boolean {
  if (xsiType(el) !== 'Object') return false
  if ((childText(el, 'bigCraftable') ?? 'false') === 'true') return false
  if (childText(el, 'minutesUntilReady') && toInt(childText(el, 'minutesUntilReady'), 0) !== 0) return false
  const held = child(el, 'heldObject')
  if (held && held.children.length > 0) return false
  if (child(el, 'items')) return false // chest-like
  return true
}

/** Find any clonable Object anywhere in the document. */
function findTemplateNode(doc: XMLDocument): { node: Element; renameToItem: boolean } | null {
  const inv = inventoryEl(doc)

  // 1. Prefer the host player's own inventory.
  for (const el of Array.from(inv.children)) {
    if (isPlainObjectNode(el)) return { node: el, renameToItem: false }
  }
  // 2. Any other <Item xsi:type="Object"> in the save (other players, etc.).
  for (const el of Array.from(doc.getElementsByTagName('Item'))) {
    if (isPlainObjectNode(el)) return { node: el, renameToItem: false }
  }
  // 3. Any world/chest <Object xsi:type="Object">. Same class, same schema, so
  //    cloning and renaming the tag to <Item> is safe.
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

/** Reset world/machine-only state carried over from a cloned node. */
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

/** The xsi:type each injectable kind serializes as inside <items>. */
const XSI_TYPE: Record<InjectableKind, 'Object' | 'Hat' | 'Boots' | 'Ring'> = {
  object: 'Object',
  bigCraftable: 'Object', // big craftable = Object with <bigCraftable>true</bigCraftable>
  hat: 'Hat',
  boots: 'Boots',
  ring: 'Ring',
}

/** Catalog qualified-id prefix per kind (rings live under "(O)" in the catalog). */
const QID_PREFIX: Record<InjectableKind, string> = {
  object: 'O',
  bigCraftable: 'BC',
  hat: 'H',
  boots: 'B',
  ring: 'O',
}

/** Equipped-slot element names on <player> that hold each xsi:type. */
const EQUIPPED_SLOTS: Record<string, string[]> = {
  Hat: ['hat'],
  Boots: ['boots'],
  Ring: ['leftRing', 'rightRing'],
}

/** Find an existing <Item xsi:type="X"> — or equipped <hat>/<boots>/<ring> — to clone. */
function findTypedNode(doc: XMLDocument, xsi: string): { node: Element; tag: string } | null {
  for (const el of Array.from(doc.getElementsByTagName('Item'))) {
    if (xsiType(el) === xsi && !isNil(el)) return { node: el, tag: 'Item' }
  }
  for (const slot of EQUIPPED_SLOTS[xsi] ?? []) {
    for (const el of Array.from(doc.getElementsByTagName(slot))) {
      if (xsiType(el) === xsi && !isNil(el)) return { node: el, tag: slot }
    }
  }
  return null
}

function parseTemplate(doc: XMLDocument, xml: string): Element {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml')
  if (parsed.querySelector('parsererror')) throw new Error('Internal: node template failed to parse.')
  const node = doc.importNode(parsed.documentElement, true) as Element
  // The <SaveGame> root already declares xmlns:xsi; drop the template's own copy
  // so the serialized slot matches the game's own (unprefixed-declaration) style.
  node.removeAttribute('xmlns:xsi')
  return node
}

// Skeletons extracted from real saves live in nodeTemplates.json. Ring is not
// present in the sample saves, so this hand-authored skeleton (mirroring the
// 1.6 Boots field order, which shares the Item base) is the last resort; the
// clone-from-equipped path covers it whenever the save has a ring anywhere.
const HAND_TEMPLATES: Record<string, string> = {
  Ring:
    `<Item xmlns:xsi="${XSI_NS}" xsi:type="Ring">` +
    '<isLostItem>false</isLostItem><category>-96</category>' +
    '<hasBeenInInventory>true</hasBeenInInventory><name>Ring</name>' +
    '<parentSheetIndex>0</parentSheetIndex><itemId>0</itemId>' +
    '<specialItem>false</specialItem><isRecipe>false</isRecipe>' +
    '<quality>0</quality><stack>1</stack><SpecialVariable>0</SpecialVariable>' +
    '<indexInTileSheet>0</indexInTileSheet><uniqueID>0</uniqueID></Item>',
}

function templateFor(xsi: string): string | undefined {
  const fromSaves = (nodeTemplates as Record<string, string>)[xsi]
  return fromSaves ?? HAND_TEMPLATES[xsi]
}

interface ObtainedNode {
  node: Element
  usedFallbackTemplate: boolean
}

function obtainNode(doc: XMLDocument, kind: InjectableKind): ObtainedNode {
  const xsi = XSI_TYPE[kind]

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
    if (existing.tag !== 'Item') node = renameElement(node, 'Item')
    return { node, usedFallbackTemplate: false }
  }
  const tpl = templateFor(xsi)
  if (!tpl) {
    throw new Error(`This save has no ${xsi} to copy and no bundled ${xsi} template is available.`)
  }
  return { node: parseTemplate(doc, tpl), usedFallbackTemplate: true }
}

// --- per-kind field setters ------------------------------------------------

function setId(node: Element, id: string, era: GameEra): void {
  for (const tag of ['parentSheetIndex', 'indexInTileSheet', 'initialParentTileIndex']) {
    setChildText(node, tag, id)
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
  setId(node, payload.id, era)

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
  setChildText(node, 'parentSheetIndex', payload.id) // pre-1.6 only; no-op on 1.6
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

/**
 * Inject an item into the empty slot at `index`. Throws if the slot is not
 * empty, or if the type can neither be cloned from the save nor templated.
 */
export function injectItem(doc: XMLDocument, index: number, payload: ItemPayload): InjectResult {
  const items = inventoryEl(doc)
  const target = items.children[index]
  if (!target) throw new Error(`No inventory slot at index ${index}.`)
  if (!isNil(target)) throw new Error(`Slot ${index} is not empty. Clear it first.`)

  const def = catalogByQualifiedId(`(${QID_PREFIX[payload.kind]})${payload.id}`)
  const { node, usedFallbackTemplate } = obtainNode(doc, payload.kind)
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
  }

  items.replaceChild(node, target)
  return { usedFallbackTemplate }
}

// Last-resort Object template, only for pre-1.6 saves with an empty inventory.
// Field order follows StardewValley.Object's 1.5 serialization.
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
