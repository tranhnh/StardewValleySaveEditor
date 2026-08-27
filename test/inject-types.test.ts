import { describe, expect, it } from 'vitest'
import { parseSave, serializeSave, type ParsedSave } from '../src/lib/xml'
import { injectItem, readInventory, type ItemPayload } from '../src/lib/items'
import { SAVE_1_6, SAVE_1_6_BARE } from './fixture'

const roundTrip = (p: ParsedSave) => parseSave(serializeSave(p))
const firstSlot = (doc: XMLDocument) =>
  doc.querySelector('SaveGame > player > items')!.children[0]

const PAYLOADS: Record<string, ItemPayload> = {
  bigCraftable: { kind: 'bigCraftable', id: '10', name: 'Bee House', stack: 1, quality: 0 },
  hat: { kind: 'hat', id: '0', name: 'Cowboy Hat', stack: 1, quality: 0 },
  boots: { kind: 'boots', id: '504', name: 'Sneakers', stack: 1, quality: 0 },
  ring: { kind: 'ring', id: '517', name: 'Glow Ring', stack: 1, quality: 0 },
}

const EXPECTED_XSI: Record<string, string> = {
  bigCraftable: 'Object',
  hat: 'Hat',
  boots: 'Boots',
  ring: 'Ring',
}

describe.each(['bigCraftable', 'hat', 'boots', 'ring'] as const)('inject %s', (kind) => {
  const payload = PAYLOADS[kind]

  it('clones an existing node of that type (no fallback, no list growth)', () => {
    const parsed = parseSave(SAVE_1_6)
    const before = readInventory(parsed.doc).length

    const result = injectItem(parsed.doc, 0, payload)
    expect(result.usedFallbackTemplate).toBe(false)

    const out = serializeSave(parsed)
    expect(out).not.toContain('xmlns="http://www.w3.org/1999/xhtml"')

    const reparsed = parseSave(out)
    expect(readInventory(reparsed.doc)).toHaveLength(before)

    const node = firstSlot(reparsed.doc)
    expect(node.getAttribute('xsi:type')).toBe(EXPECTED_XSI[kind])
    expect(node.querySelector('name')?.textContent).toBe(payload.name)
    expect(node.querySelector('itemId')?.textContent).toBe(payload.id)
  })

  it('falls back to a bundled template when the save has no node to clone', () => {
    const parsed = parseSave(SAVE_1_6_BARE)
    const result = injectItem(parsed.doc, 0, payload)

    // big craftables reuse the Object clone path (Wood is present), so no fallback
    expect(result.usedFallbackTemplate).toBe(kind !== 'bigCraftable')

    const reparsed = roundTrip(parsed)
    expect(readInventory(reparsed.doc)).toHaveLength(4)

    const node = firstSlot(reparsed.doc)
    expect(node.getAttribute('xsi:type')).toBe(EXPECTED_XSI[kind])
    expect(node.querySelector('name')?.textContent).toBe(payload.name)
  })
})

describe('per-type field mapping from the catalog', () => {
  it('big craftable: flips bigCraftable, sets id and category', () => {
    const parsed = parseSave(SAVE_1_6)
    injectItem(parsed.doc, 0, PAYLOADS.bigCraftable)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.querySelector('bigCraftable')?.textContent).toBe('true')
    expect(node.querySelector('parentSheetIndex')?.textContent).toBe('10')
    expect(node.querySelector('category')?.textContent).toBe('-9')
  })

  it('hat: sets which is left nil, hair flags come from the catalog', () => {
    const parsed = parseSave(SAVE_1_6)
    injectItem(parsed.doc, 0, PAYLOADS.hat)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.querySelector('category')?.textContent).toBe('-95')
    expect(node.querySelector('itemId')?.textContent).toBe('0')
    // Cowboy Hat: ShowRealHair=false -> skipHairDraw true; HideHairstyle=true
    expect(node.querySelector('skipHairDraw')?.textContent).toBe('true')
    expect(node.querySelector('ignoreHairstyleOffset')?.textContent).toBe('true')
  })

  it('boots: stat bonuses and colour index come from the catalog', () => {
    const parsed = parseSave(SAVE_1_6)
    injectItem(parsed.doc, 0, PAYLOADS.boots)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.querySelector('category')?.textContent).toBe('-97')
    expect(node.querySelector('defenseBonus')?.textContent).toBe('1') // Sneakers +1 defense
    expect(node.querySelector('immunityBonus')?.textContent).toBe('0')
    expect(node.querySelector('indexInColorSheet')?.textContent).toBe('0')
    expect(node.querySelector('price')?.textContent).toBe('50')
  })

  it('ring: sets id fields and ring category', () => {
    const parsed = parseSave(SAVE_1_6)
    injectItem(parsed.doc, 0, PAYLOADS.ring)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.getAttribute('xsi:type')).toBe('Ring')
    expect(node.querySelector('category')?.textContent).toBe('-96')
    expect(node.querySelector('indexInTileSheet')?.textContent).toBe('517')
    expect(node.querySelector('itemId')?.textContent).toBe('517')
  })
})

describe('inventory read after injecting a non-object type', () => {
  it('shows the slot as a locked "other" entry with the right type name', () => {
    const parsed = parseSave(SAVE_1_6)
    injectItem(parsed.doc, 0, PAYLOADS.hat)
    const slot = readInventory(roundTrip(parsed).doc)[0]
    expect(slot.kind).toBe('other')
    expect(slot.typeName).toBe('Hat')
    expect(slot.name).toBe('Cowboy Hat')
  })
})

const NEW_PAYLOADS: Record<string, ItemPayload> = {
  weapon: { kind: 'weapon', id: '4', name: 'Galaxy Sword', stack: 1, quality: 0 },
  tool: { kind: 'tool', id: 'IridiumAxe', name: 'Iridium Axe', stack: 1, quality: 0 },
  shirt: { kind: 'shirt', id: '1000', name: 'Classic Overalls', stack: 1, quality: 0 },
  pants: { kind: 'pants', id: '1', name: 'Shorts', stack: 1, quality: 0 },
  furniture: { kind: 'furniture', id: '0', name: 'Oak Chair', stack: 1, quality: 0 },
}

describe.each([
  ['weapon', 'MeleeWeapon'],
  ['tool', 'Axe'],
  ['shirt', 'Clothing'],
  ['pants', 'Clothing'],
  ['furniture', 'Furniture'],
] as const)('inject %s', (kind, xsi) => {
  const payload = NEW_PAYLOADS[kind]

  it('round-trips from the bundled template on a bare save', () => {
    const parsed = parseSave(SAVE_1_6_BARE)
    const before = readInventory(parsed.doc).length
    injectItem(parsed.doc, 0, payload)

    const out = serializeSave(parsed)
    expect(out).not.toContain('xmlns="http://www.w3.org/1999/xhtml"')

    const reparsed = parseSave(out)
    expect(readInventory(reparsed.doc)).toHaveLength(before)
    const node = firstSlot(reparsed.doc)
    expect(node.getAttribute('xsi:type')).toBe(xsi)
    expect(node.querySelector('name')?.textContent).toBe(payload.name)
    expect(node.querySelector('itemId')?.textContent).toBe(payload.id)
  })

  it('clones an existing node when the save has one', () => {
    // SAVE_1_6 has a MeleeWeapon in the bag and equipped shirt/pants.
    const hasClone = kind === 'weapon' || kind === 'shirt' || kind === 'pants'
    if (!hasClone) return
    const parsed = parseSave(SAVE_1_6)
    const result = injectItem(parsed.doc, 0, payload)
    expect(result.usedFallbackTemplate).toBe(false)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.getAttribute('xsi:type')).toBe(xsi)
    expect(node.querySelector('name')?.textContent).toBe(payload.name)
  })
})

describe('per-type field mapping — weapons / tools / clothing / furniture', () => {
  it('weapon: damage, speed and crit come from the catalog', () => {
    const parsed = parseSave(SAVE_1_6_BARE)
    injectItem(parsed.doc, 0, NEW_PAYLOADS.weapon)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.querySelector('minDamage')?.textContent).toBe('60') // Galaxy Sword
    expect(node.querySelector('maxDamage')?.textContent).toBe('80')
    expect(node.querySelector('speed')?.textContent).toBe('8')
    expect(node.querySelector('critMultiplier')?.textContent).toBe('3')
  })

  it('tool: string itemId, upgrade level and padded attachment slots', () => {
    const parsed = parseSave(SAVE_1_6_BARE)
    injectItem(parsed.doc, 0, { kind: 'tool', id: 'IridiumRod', name: 'Iridium Rod', stack: 1, quality: 0 })
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.getAttribute('xsi:type')).toBe('FishingRod')
    expect(node.querySelector('itemId')?.textContent).toBe('IridiumRod')
    expect(node.querySelector('upgradeLevel')?.textContent).toBe('3')
    expect(node.querySelector('numAttachmentSlots')?.textContent).toBe('2')
    expect(node.getElementsByTagName('attachments')[0].children).toHaveLength(2)
  })

  it('clothing: clothesType differs for shirt vs pants', () => {
    const shirt = parseSave(SAVE_1_6_BARE)
    injectItem(shirt.doc, 0, NEW_PAYLOADS.shirt)
    expect(firstSlot(roundTrip(shirt).doc).querySelector('clothesType')?.textContent).toBe('0')

    const pants = parseSave(SAVE_1_6_BARE)
    injectItem(pants.doc, 0, NEW_PAYLOADS.pants)
    expect(firstSlot(roundTrip(pants).doc).querySelector('clothesType')?.textContent).toBe('1')
  })

  it('furniture: type id, rotations and source rect are computed', () => {
    const parsed = parseSave(SAVE_1_6_BARE)
    injectItem(parsed.doc, 0, NEW_PAYLOADS.furniture)
    const node = firstSlot(roundTrip(parsed).doc)
    expect(node.getElementsByTagName('furniture_type')[0].textContent).toBe('0') // chair
    expect(node.getElementsByTagName('rotations')[0].textContent).toBe('4')
    const rect = node.getElementsByTagName('sourceRect')[0]
    expect(rect.getElementsByTagName('Width')[0].textContent).toBe('16')
  })
})
