export interface Rgb {
  r: number
  g: number
  b: number
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

export function parseColorHex(hex: string | null | undefined): Rgb | null {
  if (!hex) return null
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = Number.parseInt(m[1], 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (v: number) => clampByte(v).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function packColor({ r, g, b }: Rgb, a = 255): number {
  return (clampByte(r) + clampByte(g) * 256 + clampByte(b) * 65536 + clampByte(a) * 16777216) >>> 0
}

export function unpackColor(packed: number): Rgb {
  const p = packed >>> 0
  return { r: p & 0xff, g: (p >>> 8) & 0xff, b: (p >>> 16) & 0xff }
}

export function isWhite(c: Rgb): boolean {
  return c.r === 255 && c.g === 255 && c.b === 255
}
