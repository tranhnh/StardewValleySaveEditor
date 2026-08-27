import { child, childText, children, createEl, setChildText, toInt } from './xml'
import { LEVEL_TAG, XP_ORDER, type SkillKey } from './skills'

const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export interface CoreStats {
  name: string
  farmName: string
  favoriteThing: string
  money: number
  totalMoneyEarned: number
  maxHealth: number
  maxStamina: number
  hoursPlayed: number
  season: Season
  year: number
  dayOfMonth: number
}

export interface SkillsState {
  levels: Record<SkillKey, number>
  /** Six entries, in XP_ORDER. */
  xp: number[]
  professions: number[]
}

function playerEl(doc: XMLDocument): Element {
  const el = doc.querySelector('SaveGame > player')
  if (!el) throw new Error('Save has no <player> element.')
  return el
}

function saveEl(doc: XMLDocument): Element {
  return doc.documentElement
}

export function readCore(doc: XMLDocument): CoreStats {
  const player = playerEl(doc)
  const save = saveEl(doc)
  const ms = toInt(childText(player, 'millisecondsPlayed'), 0)
  const seasonText = (childText(save, 'currentSeason') ?? 'spring').toLowerCase()

  return {
    name: childText(player, 'name') ?? '',
    farmName: childText(player, 'farmName') ?? '',
    favoriteThing: childText(player, 'favoriteThing') ?? '',
    money: toInt(childText(player, 'money'), 0),
    totalMoneyEarned: toInt(childText(player, 'totalMoneyEarned'), 0),
    maxHealth: toInt(childText(player, 'maxHealth'), 100),
    maxStamina: toInt(childText(player, 'maxStamina'), 270),
    hoursPlayed: Math.round((ms / 3_600_000) * 10) / 10,
    season: (SEASONS as readonly string[]).includes(seasonText) ? (seasonText as Season) : 'spring',
    year: Math.max(1, toInt(childText(save, 'year'), 1)),
    dayOfMonth: toInt(childText(save, 'dayOfMonth'), 1),
  }
}

export function writeCore(doc: XMLDocument, core: CoreStats): void {
  const player = playerEl(doc)
  const save = saveEl(doc)

  setChildText(player, 'name', core.name)
  setChildText(player, 'farmName', core.farmName)
  setChildText(player, 'favoriteThing', core.favoriteThing)
  setChildText(player, 'money', String(Math.trunc(core.money)))
  setChildText(player, 'totalMoneyEarned', String(Math.trunc(core.totalMoneyEarned)))
  setChildText(player, 'maxHealth', String(Math.trunc(core.maxHealth)))
  setChildText(player, 'maxStamina', String(Math.trunc(core.maxStamina)))
  setChildText(player, 'millisecondsPlayed', String(Math.max(0, Math.round(core.hoursPlayed * 3_600_000))))

  // The date is stored on <SaveGame> and mirrored onto <player>.
  const seasonIndex = SEASONS.indexOf(core.season)
  setChildText(save, 'currentSeason', core.season)
  setChildText(player, 'seasonForSaveGame', String(seasonIndex))
  setChildText(save, 'year', String(Math.max(1, Math.trunc(core.year))))
  setChildText(player, 'yearForSaveGame', String(Math.max(1, Math.trunc(core.year))))
  const day = Math.min(28, Math.max(1, Math.trunc(core.dayOfMonth)))
  setChildText(save, 'dayOfMonth', String(day))
  setChildText(player, 'dayOfMonthForSaveGame', String(day))
}

export function formatPlayTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function experiencePointsEl(doc: XMLDocument): Element {
  const el = child(playerEl(doc), 'experiencePoints')
  if (!el) throw new Error('Save has no <experiencePoints> element.')
  return el
}

export function readSkills(doc: XMLDocument): SkillsState {
  const player = playerEl(doc)

  const levels = {} as Record<SkillKey, number>
  for (const key of XP_ORDER) {
    levels[key] = toInt(childText(player, LEVEL_TAG[key]), 0)
  }

  const intNodes = children(experiencePointsEl(doc), 'int')
  const xp = XP_ORDER.map((_, i) => toInt(intNodes[i]?.textContent ?? null, 0))

  const professionsEl = child(player, 'professions')
  const professions = professionsEl
    ? children(professionsEl, 'int').map((n) => toInt(n.textContent, 0))
    : []

  return { levels, xp, professions }
}

export function writeSkills(doc: XMLDocument, skills: SkillsState): void {
  const player = playerEl(doc)

  for (const key of XP_ORDER) {
    const level = clampLevel(skills.levels[key])
    setChildText(player, LEVEL_TAG[key], String(level))
  }

  const xpEl = experiencePointsEl(doc)
  const intNodes = children(xpEl, 'int')
  skills.xp.forEach((value, i) => {
    const safe = String(Math.max(0, Math.trunc(value)))
    if (intNodes[i]) {
      intNodes[i].textContent = safe
    } else {
      const created = createEl(doc, 'int')
      created.textContent = safe
      xpEl.appendChild(created)
    }
  })

  const professionsEl = child(player, 'professions')
  if (professionsEl) {
    while (professionsEl.firstChild) professionsEl.removeChild(professionsEl.firstChild)
    for (const id of [...new Set(skills.professions)].sort((a, b) => a - b)) {
      const node = createEl(doc, 'int')
      node.textContent = String(id)
      professionsEl.appendChild(node)
    }
  }
}

function clampLevel(n: number): number {
  return Math.min(10, Math.max(0, Math.trunc(n)))
}
