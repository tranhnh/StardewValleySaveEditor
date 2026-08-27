import { describe, expect, it } from 'vitest'
import { parseSave, serializeSave } from '../src/lib/xml'
import { readCore, readSkills, writeCore, writeSkills } from '../src/lib/saveModel'
import {
  clearSlot,
  detectEra,
  injectItem,
  maxItems,
  readInventory,
  setSlotQuality,
  setSlotStack,
} from '../src/lib/items'
import { SAVE_1_6, SAVE_LEGACY_EMPTY } from './fixture'

describe('xml', () => {
  it('round-trips an untouched save with the original prolog', () => {
    const parsed = parseSave(SAVE_1_6)
    const out = serializeSave(parsed)
    expect(out.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true)
    expect(out).toContain('<name>Alex</name>')
    // re-parsing the output must still succeed
    expect(() => parseSave(out)).not.toThrow()
  })

  it('rejects non-SaveGame documents', () => {
    expect(() => parseSave('<SaveGameInfo><x/></SaveGameInfo>')).toThrow()
    expect(() => parseSave('not xml at all <')).toThrow()
  })
})

describe('core stats', () => {
  it('reads expected values', () => {
    const { doc } = parseSave(SAVE_1_6)
    const core = readCore(doc)
    expect(core).toMatchObject({
      name: 'Alex',
      farmName: 'Willow',
      favoriteThing: 'Coding',
      money: 5000,
      totalMoneyEarned: 18000,
      maxHealth: 100,
      maxStamina: 270,
      hoursPlayed: 2,
      season: 'spring',
      year: 1,
      dayOfMonth: 1,
    })
  })

  it('writes values back, including the SaveGame-level date mirrors', () => {
    const parsed = parseSave(SAVE_1_6)
    const core = readCore(parsed.doc)
    core.name = 'Robin'
    core.money = 999999
    core.season = 'winter'
    core.year = 3
    core.dayOfMonth = 20
    core.hoursPlayed = 10
    writeCore(parsed.doc, core)

    const reparsed = parseSave(serializeSave(parsed))
    const after = readCore(reparsed.doc)
    expect(after.name).toBe('Robin')
    expect(after.money).toBe(999999)
    expect(after.season).toBe('winter')
    expect(after.year).toBe(3)
    expect(after.dayOfMonth).toBe(20)
    expect(after.hoursPlayed).toBe(10)
    expect(reparsed.doc.querySelector('SaveGame > currentSeason')?.textContent).toBe('winter')
    expect(reparsed.doc.querySelector('SaveGame > player > seasonForSaveGame')?.textContent).toBe('3')
    expect(reparsed.doc.querySelector('SaveGame > dayOfMonth')?.textContent).toBe('20')
  })

  it('clamps day of month to 1..28 and year to >= 1', () => {
    const parsed = parseSave(SAVE_1_6)
    const core = readCore(parsed.doc)
    core.dayOfMonth = 99
    core.year = -5
    writeCore(parsed.doc, core)
    const after = readCore(parseSave(serializeSave(parsed)).doc)
    expect(after.dayOfMonth).toBe(28)
    expect(after.year).toBe(1)
  })
})

describe('skills', () => {
  it('reads levels, xp (in xp-array order) and professions', () => {
    const { doc } = parseSave(SAVE_1_6)
    const skills = readSkills(doc)
    expect(skills.levels).toEqual({
      farming: 3,
      mining: 1,
      combat: 0,
      foraging: 2,
      fishing: 5,
      luck: 0,
    })
    // xp order: farming, fishing, foraging, mining, combat, luck
    expect(skills.xp).toEqual([770, 2150, 380, 100, 0, 0])
    expect(skills.professions).toEqual([6])
  })

  it('writes levels/xp/professions back and de-dupes + sorts professions', () => {
    const parsed = parseSave(SAVE_1_6)
    const skills = readSkills(parsed.doc)
    skills.levels.combat = 10
    skills.xp[4] = 15000
    skills.professions = [24, 6, 24, 26]
    writeSkills(parsed.doc, skills)

    const after = readSkills(parseSave(serializeSave(parsed)).doc)
    expect(after.levels.combat).toBe(10)
    expect(after.xp[4]).toBe(15000)
    expect(after.professions).toEqual([6, 24, 26])
  })

  it('does not inject an xmlns namespace onto created <int> nodes', () => {
    const parsed = parseSave(SAVE_1_6)
    const skills = readSkills(parsed.doc)
    skills.professions = [1, 2, 3]
    skills.xp = [1, 2, 3, 4, 5, 6, 7, 8] // more entries than exist -> forces node creation
    writeSkills(parsed.doc, skills)
    const out = serializeSave(parsed)
    expect(out).not.toContain('xmlns="http://www.w3.org/1999/xhtml"')
    expect(out).not.toMatch(/<int xmlns=/)
  })

  it('clamps levels to 0..10 and xp to >= 0', () => {
    const parsed = parseSave(SAVE_1_6)
    const skills = readSkills(parsed.doc)
    skills.levels.farming = 99
    skills.xp[0] = -100
    writeSkills(parsed.doc, skills)
    const after = readSkills(parseSave(serializeSave(parsed)).doc)
    expect(after.levels.farming).toBe(10)
    expect(after.xp[0]).toBe(0)
  })
})

describe('inventory', () => {
  it('detects era and capacity', () => {
    expect(detectEra(parseSave(SAVE_1_6).doc)).toBe('v16plus')
    expect(detectEra(parseSave(SAVE_LEGACY_EMPTY).doc)).toBe('legacy')
    expect(maxItems(parseSave(SAVE_1_6).doc)).toBe(36)
    expect(maxItems(parseSave(SAVE_LEGACY_EMPTY).doc)).toBe(12)
  })

  it('reads slots: empty, object, and locked non-object', () => {
    const { doc } = parseSave(SAVE_1_6)
    const slots = readInventory(doc)
    expect(slots[0]).toMatchObject({ index: 0, kind: 'empty' })
    expect(slots[1]).toMatchObject({ kind: 'object', name: 'Diamond', objectId: 72, stack: 1, quality: 0 })
    expect(slots[2]).toMatchObject({ kind: 'other', typeName: 'MeleeWeapon' })
    expect(slots[3]).toMatchObject({ kind: 'empty' })
  })

  it('edits stack and quality without touching the list length', () => {
    const parsed = parseSave(SAVE_1_6)
    setSlotStack(parsed.doc, 1, 200)
    setSlotQuality(parsed.doc, 1, 4)
    const slots = readInventory(parseSave(serializeSave(parsed)).doc)
    expect(slots).toHaveLength(5)
    expect(slots[1]).toMatchObject({ stack: 200, quality: 4 })
  })

  it('injects into an empty slot by cloning an existing Object (no fallback, no list growth)', () => {
    const parsed = parseSave(SAVE_1_6)
    const before = readInventory(parsed.doc).length
    const result = injectItem(parsed.doc, 0, { objectId: 74, name: 'Prismatic Shard', stack: 5, quality: 2 })
    expect(result.usedFallbackTemplate).toBe(false)

    const reparsed = parseSave(serializeSave(parsed))
    const slots = readInventory(reparsed.doc)
    expect(slots).toHaveLength(before)
    expect(slots[0]).toMatchObject({ kind: 'object', name: 'Prismatic Shard', objectId: 74, stack: 5, quality: 2 })

    const node = reparsed.doc.querySelector('SaveGame > player > items')!.children[0]
    expect(node.getAttribute('xsi:type')).toBe('Object')
    expect(node.querySelector('itemId')?.textContent).toBe('74') // 1.6 field kept
    expect(node.querySelector('parentSheetIndex')?.textContent).toBe('74')
    expect(node.querySelector('category')?.textContent).toBe('-2') // from COMMON_ITEMS
  })

  it('refuses to inject into a non-empty slot', () => {
    const parsed = parseSave(SAVE_1_6)
    expect(() =>
      injectItem(parsed.doc, 1, { objectId: 74, name: 'x', stack: 1, quality: 0 }),
    ).toThrow(/not empty/)
  })

  it('falls back to a template when nothing is clonable in a legacy save', () => {
    const parsed = parseSave(SAVE_LEGACY_EMPTY)
    const result = injectItem(parsed.doc, 0, { objectId: 336, name: 'Gold Bar', stack: 3, quality: 0 })
    expect(result.usedFallbackTemplate).toBe(true)
    const reparsed = parseSave(serializeSave(parsed))
    const slots = readInventory(reparsed.doc)
    expect(slots).toHaveLength(2)
    expect(slots[0]).toMatchObject({ kind: 'object', name: 'Gold Bar', objectId: 336, stack: 3 })
    // legacy save: no <itemId> element should have been invented
    expect(reparsed.doc.querySelector('SaveGame > player > items')!.children[0].querySelector('itemId'))
      .toBeNull()
  })

  it('clears a populated slot back to xsi:nil without namespace pollution', () => {
    const parsed = parseSave(SAVE_1_6)
    clearSlot(parsed.doc, 1)
    const out = serializeSave(parsed)
    expect(out).not.toContain('xmlns="http://www.w3.org/1999/xhtml"')
    const slots = readInventory(parseSave(out).doc)
    expect(slots).toHaveLength(5)
    expect(slots[1].kind).toBe('empty')
  })

  it('injected nodes carry no xmlns attribute', () => {
    const parsed = parseSave(SAVE_1_6)
    injectItem(parsed.doc, 0, { objectId: 74, name: 'Prismatic Shard', stack: 1, quality: 0 })
    expect(serializeSave(parsed)).not.toContain('xmlns="http://www.w3.org/1999/xhtml"')
  })

  it('preserves untouched parts of the document byte-for-byte after an edit', () => {
    const parsed = parseSave(SAVE_1_6)
    setSlotStack(parsed.doc, 1, 42)
    const out = serializeSave(parsed)
    expect(out).toContain('<name>Weeds</name>') // the world object is untouched
    expect(out).toContain('<favoriteThing>Coding</favoriteThing>')
  })
})
