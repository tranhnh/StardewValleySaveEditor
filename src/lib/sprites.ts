import type { CatalogItem } from './catalog'

export interface SpriteRect {
  sheet: string
  sheetW: number
  sheetH: number
  x: number
  y: number
  w: number
  h: number
}

const SHEET = {
  objects: { file: 'springobjects.png', w: 384, h: 624, cols: 24 },
  craftables: { file: 'Craftables.png', w: 128, h: 1472, cols: 8 },
  weapons: { file: 'weapons.png', w: 128, h: 144, cols: 8 },
  tools: { file: 'tools.png', w: 336, h: 384, cols: 21 },
  furniture: { file: 'furniture.png', w: 512, h: 1488 },
  hats: { file: 'hats.png', w: 240, h: 880, cols: 12 },
  shirts: { file: 'shirts.png', w: 256, h: 608, cols: 32 },
} as const

function grid(index: number, tileW: number, tileH: number, cols: number) {
  return {
    x: (index % cols) * tileW,
    y: Math.floor(index / cols) * tileH,
    w: tileW,
    h: tileH,
  }
}

export function spriteRect(item: CatalogItem): SpriteRect | null {
  const n = Number.parseInt(item.id, 10)
  const numeric = Number.isFinite(n)

  switch (item.kind) {
    case 'object':
    case 'ring': {
      if (!numeric) return null
      const s = SHEET.objects
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, ...grid(n, 16, 16, s.cols) }
    }
    case 'bigCraftable': {
      if (!numeric) return null
      const s = SHEET.craftables
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, ...grid(n, 16, 32, s.cols) }
    }
    case 'weapon': {
      if (!numeric) return null
      const s = SHEET.weapons
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, ...grid(n, 16, 16, s.cols) }
    }
    case 'tool': {
      const idx = item.tool?.menuSpriteIndex
      if (idx == null) return null
      const s = SHEET.tools
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, ...grid(idx, 16, 16, s.cols) }
    }
    case 'furniture': {
      const f = item.furniture
      if (!f) return null
      const s = SHEET.furniture
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, x: f.srcX, y: f.srcY, w: f.srcW, h: f.srcH }
    }
    case 'hat': {
      if (!numeric) return null
      const s = SHEET.hats
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, ...grid(n, 20, 20, s.cols) }
    }
    case 'shirt': {
      const idx = item.clothing?.spriteIndex
      if (idx == null) return null
      const s = SHEET.shirts
      return { sheet: s.file, sheetW: s.w, sheetH: s.h, ...grid(idx, 8, 8, s.cols) }
    }
    default:
      return null // pants, boots — no clean inventory sprite
  }
}
