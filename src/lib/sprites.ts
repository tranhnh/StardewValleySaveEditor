import type { CatalogItem } from './catalog'

export interface SpriteRect {
  sheet: string
  sheetW: number
  sheetH: number
  x: number
  y: number
  w: number
  h: number
  /**
   * Shirts only: where the recolourable dye-mask sits (same w/h as the base).
   * Unused for now — the base sprite is drawn untinted. A later pass can render
   * this region tinted by `clothesColor` on top of the base.
   */
  dyeMask?: { x: number; y: number }
}

interface GridSheet {
  file: string
  w: number
  h: number
  cols: number
  tw: number
  th: number
}

const GRID: Record<string, GridSheet> = {
  springobjects: { file: 'springobjects.png', w: 384, h: 624, cols: 24, tw: 16, th: 16 },
  Objects_2: { file: 'Objects_2.png', w: 128, h: 320, cols: 8, tw: 16, th: 16 },
  Craftables: { file: 'Craftables.png', w: 128, h: 1472, cols: 8, tw: 16, th: 32 },
  weapons: { file: 'weapons.png', w: 128, h: 144, cols: 8, tw: 16, th: 16 },
  tools: { file: 'tools.png', w: 336, h: 384, cols: 21, tw: 16, th: 16 },
  hats: { file: 'hats.png', w: 240, h: 880, cols: 12, tw: 20, th: 20 },
}

const FURNITURE_SHEET: Record<string, { file: string; w: number; h: number }> = {
  furniture: { file: 'furniture.png', w: 512, h: 1488 },
  furniture_2: { file: 'furniture_2.png', w: 256, h: 512 },
  furniture_3: { file: 'furniture_3.png', w: 208, h: 432 },
}

// shirts.png: the left 128px is a dense 16-column, 8px grid of shirt icons; the
// right 128px mirrors it as grayscale dye masks (empty for non-dyeable shirts).
const SHIRTS = { file: 'shirts.png', w: 256, h: 608, cols: 16, tile: 8, dyeDX: 128 }

function fromGrid(sheet: GridSheet, index: number): SpriteRect {
  return {
    sheet: sheet.file,
    sheetW: sheet.w,
    sheetH: sheet.h,
    x: (index % sheet.cols) * sheet.tw,
    y: Math.floor(index / sheet.cols) * sheet.th,
    w: sheet.tw,
    h: sheet.th,
  }
}

function shirtRect(index: number): SpriteRect {
  const x = (index % SHIRTS.cols) * SHIRTS.tile
  const y = Math.floor(index / SHIRTS.cols) * SHIRTS.tile
  return {
    sheet: SHIRTS.file,
    sheetW: SHIRTS.w,
    sheetH: SHIRTS.h,
    x,
    y,
    w: SHIRTS.tile,
    h: SHIRTS.tile,
    dyeMask: { x: x + SHIRTS.dyeDX, y },
  }
}

export function spriteRect(item: CatalogItem): SpriteRect | null {
  if (item.kind === 'furniture') {
    const f = item.furniture
    if (!f) return null
    const s = FURNITURE_SHEET[f.texture] ?? FURNITURE_SHEET.furniture
    return { sheet: s.file, sheetW: s.w, sheetH: s.h, x: f.srcX, y: f.srcY, w: f.srcW, h: f.srcH }
  }

  if (item.kind === 'tool') {
    const idx = item.tool?.menuSpriteIndex
    return idx == null ? null : fromGrid(GRID.tools, idx)
  }

  if (item.kind === 'shirt') {
    const idx = item.clothing?.spriteIndex
    return idx == null ? null : shirtRect(idx)
  }

  const sp = item.sprite
  if (!sp) return null
  const sheet = GRID[sp.sheet]
  return sheet ? fromGrid(sheet, sp.index) : null
}
