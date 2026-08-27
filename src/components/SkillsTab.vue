<script setup lang="ts">
import { useSaveStore } from '../stores/save'
import {
  PROFESSIONS,
  SKILL_LABEL,
  XP_FOR_LEVEL,
  XP_ORDER,
  type SkillKey,
} from '../lib/skills'

const store = useSaveStore()

const rows = XP_ORDER
const professionSkills = ['farming', 'fishing', 'foraging', 'mining', 'combat'] as const
type ProfSkill = (typeof professionSkills)[number]

function xpIndex(key: SkillKey): number {
  return XP_ORDER.indexOf(key)
}

function selectValue(event: Event): number {
  return event.target instanceof HTMLSelectElement ? Number(event.target.value) : -1
}

function syncXpToLevel(key: SkillKey): void {
  if (!store.skills) return
  const level = Math.min(10, Math.max(0, Math.trunc(store.skills.levels[key])))
  store.skills.xp[xpIndex(key)] = XP_FOR_LEVEL[level]
}

function syncAll(): void {
  for (const key of rows) syncXpToLevel(key)
}

function tier5Value(skill: ProfSkill): number {
  const owned = store.skills?.professions ?? []
  for (const choice of PROFESSIONS[skill].tier5) {
    if (owned.includes(choice.id)) return choice.id
  }
  return -1
}

function tier10Options(skill: ProfSkill) {
  const t5 = tier5Value(skill)
  return t5 >= 0 ? (PROFESSIONS[skill].tier10[t5] ?? []) : []
}

function tier10Value(skill: ProfSkill): number {
  const owned = store.skills?.professions ?? []
  for (const choice of tier10Options(skill)) {
    if (owned.includes(choice.id)) return choice.id
  }
  return -1
}

function setTier5(skill: ProfSkill, id: number): void {
  if (!store.skills) return
  const { tier5, tier10 } = PROFESSIONS[skill]
  const remove = new Set<number>([tier5[0].id, tier5[1].id])
  for (const key of Object.keys(tier10)) {
    for (const choice of tier10[Number(key)]) remove.add(choice.id)
  }
  const next = store.skills.professions.filter((p) => !remove.has(p))
  if (id >= 0) next.push(id)
  store.skills.professions = next
}

function setTier10(skill: ProfSkill, id: number): void {
  if (!store.skills) return
  const remove = new Set<number>(tier10Options(skill).map((c) => c.id))
  const next = store.skills.professions.filter((p) => !remove.has(p))
  if (id >= 0) next.push(id)
  store.skills.professions = next
}
</script>

<template>
  <template v-if="store.skills">
    <section class="card">
      <h2>Levels &amp; experience</h2>
      <p class="muted" style="margin-top: 0">
        Levels and XP are stored separately. After changing a level, use
        <em>match XP</em> so the game doesn't re-award perks.
        <button class="ghost sm" @click="syncAll()">Match all XP to levels</button>
      </p>

      <div v-for="key in rows" :key="key" class="row" style="margin-bottom: 12px">
        <div class="field" style="margin: 0; width: 130px">
          <label>{{ SKILL_LABEL[key] }}</label>
          <input type="number" min="0" max="10" v-model.number="store.skills.levels[key]" />
        </div>
        <div class="field" style="margin: 0; flex: 1">
          <label>XP</label>
          <input type="number" min="0" v-model.number="store.skills.xp[xpIndex(key)]" />
        </div>
        <button class="ghost sm" @click="syncXpToLevel(key)">Match XP</button>
      </div>
    </section>

    <section class="card">
      <h2>Professions</h2>
      <p class="muted" style="margin-top: 0">
        Level-5 choices unlock at level 5, level-10 at level 10. Changing a level-5
        choice clears the matching level-10 choice.
      </p>

      <div v-for="skill in professionSkills" :key="skill" class="field">
        <label>{{ SKILL_LABEL[skill] }}</label>
        <div class="row">
          <select
            style="flex: 1"
            :value="tier5Value(skill)"
            :disabled="store.skills.levels[skill] < 5"
            @change="setTier5(skill, selectValue($event))"
          >
            <option :value="-1">— none —</option>
            <option v-for="p in PROFESSIONS[skill].tier5" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
          <select
            style="flex: 1"
            :value="tier10Value(skill)"
            :disabled="store.skills.levels[skill] < 10 || tier5Value(skill) < 0"
            @change="setTier10(skill, selectValue($event))"
          >
            <option :value="-1">— none —</option>
            <option v-for="p in tier10Options(skill)" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
      </div>
    </section>
  </template>
</template>
