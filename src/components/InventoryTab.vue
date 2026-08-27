<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSaveStore } from '../stores/save'
import { QUALITY_OPTIONS, toQuality, type ItemPayload } from '../lib/items'
import { COMMON_ITEMS } from '../lib/itemData'

const store = useSaveStore()

const mode = ref<'preset' | 'custom'>('preset')
const presetId = ref<number>(COMMON_ITEMS[0].id)
const customId = ref<number>(0)
const customName = ref('')
const newStack = ref<number>(1)
const newQuality = ref<number>(0)
const notice = ref('')

const firstEmpty = computed<number>(
  () => store.inventory.find((s) => s.kind === 'empty')?.index ?? -1,
)

function addItem(): void {
  notice.value = ''
  const index = firstEmpty.value
  if (index < 0) return

  let payload: ItemPayload
  if (mode.value === 'preset') {
    const def = COMMON_ITEMS.find((d) => d.id === presetId.value)
    if (!def) return
    payload = {
      objectId: def.id,
      name: def.name,
      stack: Math.max(1, Math.trunc(newStack.value)),
      quality: toQuality(newQuality.value),
    }
  } else {
    const id = Math.trunc(customId.value)
    if (!Number.isFinite(id) || id <= 0) {
      notice.value = 'Enter a positive numeric object id.'
      return
    }
    payload = {
      objectId: id,
      name: customName.value.trim() || `Item ${id}`,
      stack: Math.max(1, Math.trunc(newStack.value)),
      quality: toQuality(newQuality.value),
    }
  }

  try {
    notice.value = store.addItem(index, payload)
  } catch (err) {
    notice.value = err instanceof Error ? err.message : String(err)
  }
}

function fieldNumber(event: Event): number {
  const el = event.target
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) return Number(el.value)
  return 0
}

function onStackInput(index: number, event: Event): void {
  store.editStack(index, fieldNumber(event))
}

function onQualityInput(index: number, event: Event): void {
  store.editQuality(index, toQuality(fieldNumber(event)))
}
</script>

<template>
  <section class="card">
    <h2>Add an item</h2>
    <p class="muted" style="margin-top: 0">
      Regular items (<code>Object</code>) only. Tools, weapons, rings, boots and hats use
      different formats and are shown locked below.
    </p>

    <div class="field">
      <label>Source</label>
      <div class="row">
        <label style="font-weight: 500; display: flex; gap: 6px; align-items: center; margin: 0">
          <input type="radio" value="preset" v-model="mode" /> Common item
        </label>
        <label style="font-weight: 500; display: flex; gap: 6px; align-items: center; margin: 0">
          <input type="radio" value="custom" v-model="mode" /> Custom object id
        </label>
      </div>
    </div>

    <div v-if="mode === 'preset'" class="field">
      <label>Item</label>
      <select v-model.number="presetId">
        <option v-for="d in COMMON_ITEMS" :key="d.id" :value="d.id">
          {{ d.name }} (#{{ d.id }})
        </option>
      </select>
    </div>

    <div v-else class="grid">
      <div class="field">
        <label>Object id</label>
        <input type="number" min="1" v-model.number="customId" />
      </div>
      <div class="field">
        <label>Name (label only)</label>
        <input type="text" v-model="customName" />
      </div>
    </div>

    <div class="row">
      <div class="field" style="margin: 0">
        <label>Stack</label>
        <input type="number" min="1" style="width: 96px" v-model.number="newStack" />
      </div>
      <div class="field" style="margin: 0">
        <label>Quality</label>
        <select v-model.number="newQuality" style="width: auto">
          <option v-for="q in QUALITY_OPTIONS" :key="q.value" :value="q.value">{{ q.label }}</option>
        </select>
      </div>
      <button class="primary" :disabled="firstEmpty < 0" @click="addItem">
        Add to first empty slot
      </button>
    </div>
    <p v-if="firstEmpty < 0" class="muted">Inventory is full — clear a slot first.</p>
    <p v-if="notice" class="note warn" style="white-space: pre-wrap">{{ notice }}</p>
  </section>

  <section class="card">
    <h2>Slots</h2>
    <div class="slot-list">
      <div v-for="slot in store.inventory" :key="slot.index" class="slot">
        <span class="idx">{{ slot.index }}</span>

        <template v-if="slot.kind === 'empty'">
          <span class="muted grow">empty</span>
        </template>

        <template v-else-if="slot.kind === 'other'">
          <span class="locked grow">
            {{ slot.typeName }}{{ slot.name ? ` · ${slot.name}` : '' }} (locked)
          </span>
        </template>

        <template v-else>
          <span class="name">{{ slot.name }}</span>
          <code>#{{ slot.objectId }}</code>
          <span class="grow" />
          <span class="inline">
            stack
            <input
              type="number"
              min="1"
              :value="slot.stack"
              @change="onStackInput(slot.index, $event)"
            />
          </span>
          <select :value="slot.quality" @change="onQualityInput(slot.index, $event)">
            <option v-for="q in QUALITY_OPTIONS" :key="q.value" :value="q.value">{{ q.label }}</option>
          </select>
          <button class="ghost danger sm" @click="store.removeItem(slot.index)">Clear</button>
        </template>
      </div>
    </div>
  </section>
</template>
