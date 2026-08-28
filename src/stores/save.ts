import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import {
  downloadText,
  parseSave,
  serializeSave,
  type ParsedSave,
} from '../lib/xml'
import {
  readCore,
  readSkills,
  writeCore,
  writeSkills,
  type CoreStats,
  type SkillsState,
} from '../lib/saveModel'
import {
  clearSlot,
  detectEra,
  gameVersionString,
  injectItem,
  maxItems,
  readInventory,
  setSlotQuality,
  setSlotStack,
  type GameEra,
  type InventorySlot,
  type ItemPayload,
  type Quality,
} from '../lib/items'

export const useSaveStore = defineStore('save', () => {
  // shallowRef: the document is large and only ever mutated via the lib helpers.
  const parsed = shallowRef<ParsedSave | null>(null)
  const rawText = ref('') // kept so revert() can re-parse the original
  const fileName = ref('')
  const errorMessage = ref('')
  const era = ref<GameEra>('legacy')
  const gameVersion = ref('')

  const core = ref<CoreStats | null>(null)
  const skills = ref<SkillsState | null>(null)
  const inventory = ref<InventorySlot[]>([])
  const capacity = ref(36)

  const loaded = computed(() => parsed.value !== null)

  function load(text: string, name: string): void {
    errorMessage.value = ''
    try {
      const result = parseSave(text)
      parsed.value = result
      rawText.value = text
      fileName.value = name
      era.value = detectEra(result.doc)
      gameVersion.value = gameVersionString(result.doc)
      core.value = readCore(result.doc)
      skills.value = readSkills(result.doc)
      capacity.value = maxItems(result.doc)
      inventory.value = readInventory(result.doc)
    } catch (err) {
      parsed.value = null
      core.value = null
      skills.value = null
      inventory.value = []
      errorMessage.value = err instanceof Error ? err.message : String(err)
    }
  }

  function revert(): void {
    if (rawText.value) load(rawText.value, fileName.value)
  }

  function unload(): void {
    parsed.value = null
    rawText.value = ''
    fileName.value = ''
    errorMessage.value = ''
    core.value = null
    skills.value = null
    inventory.value = []
  }

  watch(
    core,
    (value) => {
      if (parsed.value && value) writeCore(parsed.value.doc, value)
    },
    { deep: true },
  )
  watch(
    skills,
    (value) => {
      if (parsed.value && value) writeSkills(parsed.value.doc, value)
    },
    { deep: true },
  )

  function refreshInventory(): void {
    if (parsed.value) inventory.value = readInventory(parsed.value.doc)
  }

  function editStack(index: number, stack: number): void {
    if (!parsed.value) return
    setSlotStack(parsed.value.doc, index, Math.max(1, Math.trunc(stack)))
    refreshInventory()
  }

  function editQuality(index: number, quality: Quality): void {
    if (!parsed.value) return
    setSlotQuality(parsed.value.doc, index, quality)
    refreshInventory()
  }

  function removeItem(index: number): void {
    if (!parsed.value) return
    clearSlot(parsed.value.doc, index)
    refreshInventory()
  }

  /** Returns a warning string when a fallback template was used, else "". */
  function addItem(index: number, payload: ItemPayload): string {
    if (!parsed.value) return ''
    const { usedFallbackTemplate } = injectItem(parsed.value.doc, index, payload)
    refreshInventory()
    return usedFallbackTemplate
      ? 'Added using a built-in template because the save had no item to copy. ' +
          'Load this save in-game to confirm it works before relying on it.'
      : ''
  }

  function buildOutput(): string {
    if (!parsed.value) throw new Error('No save loaded.')
    return serializeSave(parsed.value)
  }

  function download(): void {
    downloadText(fileName.value, buildOutput())
  }

  return {
    loaded,
    fileName,
    errorMessage,
    era,
    gameVersion,
    core,
    skills,
    inventory,
    capacity,
    load,
    revert,
    unload,
    editStack,
    editQuality,
    removeItem,
    addItem,
    buildOutput,
    download,
  }
})
