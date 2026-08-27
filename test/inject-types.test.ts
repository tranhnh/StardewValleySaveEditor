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
