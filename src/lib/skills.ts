export type SkillKey = 'farming' | 'fishing' | 'foraging' | 'mining' | 'combat' | 'luck'

export const XP_ORDER: SkillKey[] = ['farming', 'fishing', 'foraging', 'mining', 'combat', 'luck']

export const LEVEL_TAG: Record<SkillKey, string> = {
  farming: 'farmingLevel',
  fishing: 'fishingLevel',
  foraging: 'foragingLevel',
  mining: 'miningLevel',
  combat: 'combatLevel',
  luck: 'luckLevel',
}

export const XP_FOR_LEVEL: number[] = [
  0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000,
]

export function levelForXp(xp: number): number {
  let level = 0
  for (let i = 1; i < XP_FOR_LEVEL.length; i++) {
    if (xp >= XP_FOR_LEVEL[i]) level = i
  }
  return level
}

export interface ProfessionChoice {
  id: number
  name: string
}

export interface SkillProfessions {
  tier5: [ProfessionChoice, ProfessionChoice]
  tier10: Record<number, [ProfessionChoice, ProfessionChoice]>
}

export const PROFESSIONS: Record<Exclude<SkillKey, 'luck'>, SkillProfessions> = {
  farming: {
    tier5: [
      { id: 0, name: 'Rancher' },
      { id: 1, name: 'Tiller' },
    ],
    tier10: {
      0: [
        { id: 2, name: 'Coopmaster' },
        { id: 3, name: 'Shepherd' },
      ],
      1: [
        { id: 4, name: 'Artisan' },
        { id: 5, name: 'Agriculturist' },
      ],
    },
  },
  fishing: {
    tier5: [
      { id: 6, name: 'Fisher' },
      { id: 7, name: 'Trapper' },
    ],
    tier10: {
      6: [
        { id: 8, name: 'Angler' },
        { id: 9, name: 'Pirate' },
      ],
      7: [
        { id: 10, name: 'Mariner' },
        { id: 11, name: 'Luremaster' },
      ],
    },
  },
  foraging: {
    tier5: [
      { id: 12, name: 'Forester' },
      { id: 13, name: 'Gatherer' },
    ],
    tier10: {
      12: [
        { id: 14, name: 'Lumberjack' },
        { id: 15, name: 'Tapper' },
      ],
      13: [
        { id: 16, name: 'Botanist' },
        { id: 17, name: 'Tracker' },
      ],
    },
  },
  mining: {
    tier5: [
      { id: 18, name: 'Miner' },
      { id: 19, name: 'Geologist' },
    ],
    tier10: {
      18: [
        { id: 20, name: 'Blacksmith' },
        { id: 21, name: 'Prospector' },
      ],
      19: [
        { id: 22, name: 'Excavator' },
        { id: 23, name: 'Gemologist' },
      ],
    },
  },
  combat: {
    tier5: [
      { id: 24, name: 'Fighter' },
      { id: 25, name: 'Scout' },
    ],
    tier10: {
      24: [
        { id: 26, name: 'Brute' },
        { id: 27, name: 'Defender' },
      ],
      25: [
        { id: 28, name: 'Acrobat' },
        { id: 29, name: 'Desperado' },
      ],
    },
  },
}

export const SKILL_LABEL: Record<SkillKey, string> = {
  farming: 'Farming',
  fishing: 'Fishing',
  foraging: 'Foraging',
  mining: 'Mining',
  combat: 'Combat',
  luck: 'Luck (unused)',
}
