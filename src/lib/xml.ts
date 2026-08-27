// Low-level XML plumbing: capture the prolog, parse, serialize, download.
// The parsed document is kept for the whole session and mutated in place so
// that everything we do not touch is preserved byte-for-byte.

export const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance'

const DEFAULT_PROLOG = '<?xml version="1.0" encoding="utf-8"?>'

export interface ParsedSave {
  doc: XMLDocument
  /** The exact `<?xml ... ?>` string from the original file (BOM stripped). */
  prolog: string
}

/**
 * Parse raw save text. Throws with a readable message if the file is not the
 * XML we expect.
 */
export function parseSave(raw: string): ParsedSave {
  const prologMatch = raw.match(/^﻿?\s*<\?xml[^>]*\?>/)
  const prolog = prologMatch ? prologMatch[0].replace(/^﻿/, '').trim() : DEFAULT_PROLOG

  const doc = new DOMParser().parseFromString(raw, 'application/xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error(
      'This file is not valid XML. Make sure you picked the main save file ' +
        '(e.g. "Farmer_123456789"), not "SaveGameInfo" or the folder.\n\n' +
        (parserError.textContent ?? '').trim(),
    )
  }

  if (doc.documentElement.nodeName !== 'SaveGame') {
    throw new Error(
      `Expected a <SaveGame> document but the root element is <${doc.documentElement.nodeName}>. ` +
        'Pick the main farmer save file.',
    )
  }

  return { doc, prolog }
}

/** Serialize the (possibly mutated) document back to a save-compatible string. */
export function serializeSave({ doc, prolog }: ParsedSave): string {
  const body = new XMLSerializer().serializeToString(doc.documentElement)
  return `${prolog}\n${body}`
}

/** Trigger a browser download. The save file has no extension, so neither does this. */
export function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------------------
// Small DOM helpers used across the model layer.
// ---------------------------------------------------------------------------

/** First direct-child element with the given tag name. */
export function child(parent: Element, tag: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const el = parent.children[i]
    if (el.tagName === tag) return el
  }
  return null
}

/** All direct-child elements with the given tag name. */
export function children(parent: Element, tag: string): Element[] {
  const out: Element[] = []
  for (let i = 0; i < parent.children.length; i++) {
    const el = parent.children[i]
    if (el.tagName === tag) out.push(el)
  }
  return out
}

/** Text content of a direct child, or `null` if the child is absent. */
export function childText(parent: Element, tag: string): string | null {
  const el = child(parent, tag)
  return el ? (el.textContent ?? '') : null
}

/**
 * Set the text of a direct child if it exists. Returns whether a node was
 * found — callers use this to know if a field is present in this save version.
 */
export function setChildText(parent: Element, tag: string, value: string): boolean {
  const el = child(parent, tag)
  if (!el) return false
  el.textContent = value
  return true
}

/**
 * Create an element in the null namespace, matching the rest of the save.
 * `document.createElement` on an XML document can land the node in the XHTML
 * namespace (and inject an `xmlns` attribute) depending on the DOM
 * implementation, which would corrupt the save.
 */
export function createEl(doc: Document, tag: string): Element {
  return doc.createElementNS(null, tag)
}

/** Parse text as an integer, falling back to `fallback` on missing/NaN. */
export function toInt(text: string | null, fallback = 0): number {
  if (text == null) return fallback
  const n = Number.parseInt(text.trim(), 10)
  return Number.isFinite(n) ? n : fallback
}
