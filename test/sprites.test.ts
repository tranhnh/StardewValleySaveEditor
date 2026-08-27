import { describe, expect, it } from 'vitest'
import { catalogByQualifiedId } from '../src/lib/catalog'
import { spriteRect } from '../src/lib/sprites'

const rectFor = (qualifiedId: string) => {
  const item = catalogByQualifiedId(qualifiedId)
  expect(item, qualifiedId).toBeDefined()
  return spriteRect(item!)
}

describe('spriteRect', () => {
  it('resolves a plain numeric object against springobjects', () => {
    expect(rectFor('(O)74')).toEqual({
      sheet: 'springobjects.png',
      sheetW: 384,
      sheetH: 624,
      x: (74 % 24) * 16,
      y: Math.floor(74 / 24) * 16,
      w: 16,
      h: 16,
    })
  })

  it('resolves a string-id 1.6 object against Objects_2 ((O)SeaJelly, index 134)', () => {
    expect(rectFor('(O)SeaJelly')).toEqual({
      sheet: 'Objects_2.png',
      sheetW: 128,
      sheetH: 320,
      x: (134 % 8) * 16,
      y: Math.floor(134 / 8) * 16,
      w: 16,
      h: 16,
    })
  })

  it('resolves a numeric object that lives in Objects_2 ((O)348 Wine, index 123)', () => {
    const r = rectFor('(O)348')
    expect(r?.sheet).toBe('Objects_2.png')
    expect(r).toMatchObject({ x: (123 % 8) * 16, y: Math.floor(123 / 8) * 16 })
  })

  it('resolves a string-id hat against hats.png ((H)TricornHat, index 95)', () => {
    expect(rectFor('(H)TricornHat')).toEqual({
      sheet: 'hats.png',
      sheetW: 240,
      sheetH: 880,
      x: (95 % 12) * 20,
      y: Math.floor(95 / 12) * 20,
      w: 20,
      h: 20,
    })
  })

  it('resolves a string-id big craftable against Craftables.png ((BC)BaitMaker, index 285)', () => {
    expect(rectFor('(BC)BaitMaker')).toEqual({
      sheet: 'Craftables.png',
      sheetW: 128,
      sheetH: 1472,
      x: (285 % 8) * 16,
      y: Math.floor(285 / 8) * 32,
      w: 16,
      h: 32,
    })
  })

  it('resolves a boot against springobjects by numeric id ((B)504)', () => {
    expect(rectFor('(B)504')).toEqual({
      sheet: 'springobjects.png',
      sheetW: 384,
      sheetH: 624,
      x: (504 % 24) * 16,
      y: Math.floor(504 / 24) * 16,
      w: 16,
      h: 16,
    })
  })

  it('gives a default-size furniture item its full source rect ((F)1800 fireplace, 1x3)', () => {
    const r = rectFor('(F)1800')
    expect(r?.sheet).toBe('furniture.png')
    expect(r).toMatchObject({ w: 16, h: 48 }) // fireplace default is 1x3 tiles
  })

  it('uses the override texture for furniture that declares one ((F)MessyShirt -> furniture_3)', () => {
    const r = rectFor('(F)MessyShirt')
    expect(r?.sheet).toBe('furniture_3.png')
    expect(r?.sheetW).toBe(208)
    // sprite-index override 224 on the 13-wide furniture_3 sheet
    expect(r).toMatchObject({ x: (224 * 16) % 208, y: Math.floor((224 * 16) / 208) * 16 })
  })

  it('resolves shirts on the dense 16-column, 8px grid (left half of shirts.png)', () => {
    // Classic Overalls, SpriteIndex 0
    expect(rectFor('(S)1000')).toMatchObject({
      sheet: 'shirts.png',
      x: 0,
      y: 0,
      w: 8,
      h: 8,
      dyeMask: { x: 128, y: 0 },
    })
    // Navy Tuxedo, SpriteIndex 185 — 185 % 32 = 25 landed in the empty dye-mask
    // half under the old 32-column math; the real grid is 16 cols x 8px.
    const y = Math.floor(185 / 16) * 8
    const x = (185 % 16) * 8
    expect(rectFor('(S)1185')).toMatchObject({
      sheet: 'shirts.png',
      x,
      y,
      w: 8,
      h: 8,
      dyeMask: { x: x + 128, y },
    })
  })

  it('returns null for pants (no clean inventory sprite)', () => {
    expect(rectFor('(P)1')).toBeNull()
  })

  it('returns null when the sheet is an unknown (mod) texture', () => {
    const fake = { kind: 'object' as const, id: 'x', name: 'x', type: null, category: null,
      categoryLabel: '', price: null, edibility: null, injectable: true,
      sprite: { sheet: 'SomeMod_Sheet', index: 3 } }
    expect(spriteRect(fake)).toBeNull()
  })
})
