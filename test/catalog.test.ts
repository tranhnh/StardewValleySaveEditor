import { describe, expect, it } from 'vitest'
import {
  CATALOG,
  catalogCategories,
  catalogByQualifiedId,
  catalogObject,
  queryCatalog,
} from '../src/lib/catalog'

describe('catalog', () => {
  it('has entries, each with a qualified id and a category label', () => {
    expect(CATALOG.length).toBeGreaterThan(0)
    for (const item of CATALOG) {
      expect(item.qualifiedId).toMatch(/^\([A-Z]+\)/)
      expect(item.categoryLabel.length).toBeGreaterThan(0)
    }
  })

  it('looks items up by qualified and unqualified id', () => {
    const shard = catalogObject(74)
    expect(shard?.name).toBe('Prismatic Shard')
    expect(catalogByQualifiedId('(O)74')).toBe(shard)
    expect(catalogObject(99999)).toBeUndefined()
  })

  it('lists distinct sorted categories', () => {
    const cats = catalogCategories()
    expect(cats).toEqual([...new Set(cats)].sort((a, b) => a.localeCompare(b)))
    expect(cats).toContain('Gems')
  })

  it('search matches name substring, case-insensitively', () => {
    const hits = queryCatalog({ text: 'diamond' })
    expect(hits.some((i) => i.name === 'Diamond')).toBe(true)
  })

  it('search matches an exact id', () => {
    const hits = queryCatalog({ text: '74' })
    expect(hits.some((i) => i.qualifiedId === '(O)74')).toBe(true)
  })

  it('filters by category', () => {
    const gems = queryCatalog({ category: 'Gems' })
    expect(gems.length).toBeGreaterThan(0)
    expect(gems.every((i) => i.categoryLabel === 'Gems')).toBe(true)
  })

  it('combines text and category filters', () => {
    const hits = queryCatalog({ text: 'diamond', category: 'Gems' })
    expect(hits.every((i) => i.categoryLabel === 'Gems' && /diamond/i.test(i.name))).toBe(true)
  })

  it('empty query returns the whole catalog', () => {
    expect(queryCatalog({}).length).toBe(CATALOG.length)
  })

  it('trash cans are listed but not injectable; the other tool families stay injectable', () => {
    const trashCans = CATALOG.filter((i) => /TrashCan$/.test(i.id))
    expect(trashCans.length).toBeGreaterThan(0)
    expect(trashCans.every((i) => i.injectable === false)).toBe(true)

    const upgradeFamilies = CATALOG.filter(
      (i) => i.kind === 'tool' && /(Axe|Pickaxe|Hoe|WateringCan)$/.test(i.id),
    )
    expect(upgradeFamilies.length).toBe(20) // 4 families x (base + 4 tiers)
    expect(upgradeFamilies.every((i) => i.injectable === true)).toBe(true)
  })
})
