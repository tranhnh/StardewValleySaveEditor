<script setup lang="ts">
import { ref } from 'vue'
import { useSaveStore } from '../stores/save'

const store = useSaveStore()
const dragOver = ref(false)
const input = ref<HTMLInputElement | null>(null)

async function handleFile(file: File | undefined | null) {
  if (!file) return
  const text = await file.text()
  store.load(text, file.name)
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  handleFile(event.dataTransfer?.files?.[0])
}

function onPick(event: Event) {
  const target = event.target as HTMLInputElement
  handleFile(target.files?.[0])
  target.value = ''
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ over: dragOver }"
    @dragover.prevent="dragOver = true"
    @dragleave.prevent="dragOver = false"
    @drop.prevent="onDrop"
    @click="input?.click()"
  >
    <p>Drop your save file here, or click to choose</p>
    <p class="muted">
      Pick the file named like <code>Farmer_123456789</code> (no extension) — not
      <code>SaveGameInfo</code> or the <code>_old</code> backup.
    </p>
    <input ref="input" type="file" hidden @change="onPick" />
  </div>

  <div v-if="store.errorMessage" class="note warn">
    <strong>Could not load that file.</strong>
    <pre style="white-space: pre-wrap; margin: 6px 0 0; font: inherit">{{ store.errorMessage }}</pre>
  </div>
</template>
