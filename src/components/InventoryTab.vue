<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSaveStore } from '../stores/save'
import { QUALITY_OPTIONS, toQuality, type ItemPayload } from '../lib/items'
import {
  CATALOG,
  catalogCategories,
  isInjectableKind,
  queryCatalog,
  type CatalogItem,
} from '../lib/catalog'

/** Kinds that carry a stack + quality (the others are one-per-slot equipment). */
const STACKABLE_KINDS = new Set(['object', 'bigCraftable'])

const store = useSaveStore()

const MAX_ROWS = 60
const categories = catalogCategories()

const search = ref('')
const category = ref<string>('all')
const selected = ref<CatalogItem | null>(null)
const newStack = ref<number>(1)
const newQuality = ref<number>(0)
const notice = ref('')

const showCustom = ref(false)
const customId = ref<number>(0)
const customName = ref('')

const results = computed(() =>
  queryCatalog({ text: search.value, category: category.value }),
)
const shown = computed(() => results.value.slice(0, MAX_ROWS))

const firstEmpty = computed<number>(
  () => store.inventory.find((s) => s.kind === 'empty')?.index ?? -1,
)

const canAdd = computed(() => {
  if (firstEmpty.value < 0) return false
  if (showCustom.value) return Math.trunc(customId.value) > 0
  return selected.value?.injectable === true
})

/** Show stack + quality only when the selection (or the manual path) is stackable. */
const showStackQuality = computed(() => {
  if (showCustom.value) return true
  return selected.value ? STACKABLE_KINDS.has(selected.value.kind) : false
})

function pick(item: CatalogItem): void {
  if (!item.injectable) return
  selected.value = item
  notice.value = ''
}

function addItem(): void {
  notice.value = ''
  const index = firstEmpty.value
  if (index < 0) return

  let payload: ItemPayload
  if (showCustom.value) {
    const id = Math.trunc(customId.value)
    if (!Number.isFinite(id) || id <= 0) {
      notice.value = 'Enter a positive numeric object id.'
      return
    }
    payload = {
      kind: 'object',
      id: String(id),
      name: customName.value.trim() || `Item ${id}`,
      stack: Math.max(1, Math.trunc(newStack.value)),
      quality: toQuality(newQuality.value),
    }
  } else {
    const item = selected.value
    if (!item || !item.injectable || !isInjectableKind(item.kind)) return
    payload = {
      kind: item.kind,
      id: item.id,
      name: item.name,
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
      Browsing {{ CATALOG.length.toLocaleString() }} items. Almost everything is
      insertable now — the exceptions (the Combined Ring, and beds / TVs / fish tanks /
      dressers) are marked <em>not yet</em>.
    </p>

    <div class="row" style="align-items: flex-end">
      <div class="field grow" style="margin: 0">
        <label>Search</label>
        <input type="text" v-model="search" placeholder="Prismatic Shard" />
      </div>
      <div class="field" style="margin: 0">
        <label>Category</label>
        <select v-model="category">
          <option value="all">All categories</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <div class="catalog-list" role="listbox" aria-label="Item search results">
      <button
        v-for="item in shown"
        :key="item.qualifiedId"
        type="button"
        class="catalog-row"
        :class="{
          selected: selected?.qualifiedId === item.qualifiedId,
          disabled: !item.injectable,
        }"
        role="option"
        :aria-selected="selected?.qualifiedId === item.qualifiedId"
        :aria-disabled="!item.injectable"
        @click="pick(item)"
      >
        <span class="name">{{ item.name }}</span>
        <code>{{ item.qualifiedId }}</code>
        <span class="grow" />
        <span class="muted">{{ item.categoryLabel }}</span>
        <span v-if="!item.injectable" class="tag">not yet</span>
      </button>
      <p v-if="!shown.length" class="muted" style="padding: 10px 12px; margin: 0">
        No items match.
      </p>
    </div>
    <p class="muted" style="margin: 6px 0 0">
      <template v-if="results.length > MAX_ROWS">
        Showing first {{ MAX_ROWS }} of {{ results.length.toLocaleString() }} — refine your
        search.
      </template>
      <template v-else>{{ results.length.toLocaleString() }} match.</template>
      <button class="ghost sm" @click="showCustom = !showCustom">
        {{ showCustom ? 'Hide manual id' : 'Enter an id manually' }}
      </button>
    </p>

    <div v-if="showCustom" class="grid" style="margin-top: 12px">
      <div class="field" style="margin: 0">
        <label>Object id</label>
        <input type="number" min="1" v-model.number="customId" />
      </div>
      <div class="field" style="margin: 0">
        <label>Name (label only)</label>
        <input type="text" v-model="customName" />
      </div>
    </div>

    <div class="row" style="margin-top: 14px">
      <div v-if="showStackQuality" class="field" style="margin: 0">
        <label>Stack</label>
        <input type="number" min="1" style="width: 96px" v-model.number="newStack" />
      </div>
      <div v-if="showStackQuality" class="field" style="margin: 0">
        <label>Quality</label>
        <select v-model.number="newQuality" style="width: auto">
          <option v-for="q in QUALITY_OPTIONS" :key="q.value" :value="q.value">{{ q.label }}</option>
        </select>
      </div>
      <button class="primary" :disabled="!canAdd" @click="addItem">
        Add to first empty slot
      </button>
    </div>

    <p v-if="!showCustom && selected" class="muted" style="margin: 8px 0 0">
      Selected: <strong>{{ selected.name }}</strong> <code>{{ selected.qualifiedId }}</code>
    </p>
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
          <button class="ghost danger sm" @click="store.removeItem(slot.index)">Clear</button>
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
