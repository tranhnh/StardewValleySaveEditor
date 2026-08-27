<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogItem } from '../lib/catalog'
import { spriteRect } from '../lib/sprites'

const props = defineProps<{ item?: CatalogItem | null; size?: number }>()

const style = computed(() => {
  const box = props.size ?? 22
  const rect = props.item ? spriteRect(props.item) : null
  if (!rect) return { width: `${box}px`, height: `${box}px` }
  const scale = Math.min(box / rect.w, box / rect.h)
  return {
    width: `${Math.round(rect.w * scale)}px`,
    height: `${Math.round(rect.h * scale)}px`,
    backgroundImage: `url(${import.meta.env.BASE_URL}sprites/${rect.sheet})`,
    backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
    backgroundSize: `${rect.sheetW * scale}px ${rect.sheetH * scale}px`,
  }
})

const isPlaceholder = computed(() => !(props.item && spriteRect(props.item)))
</script>

<template>
  <span class="item-icon" :class="{ placeholder: isPlaceholder }" :style="style" aria-hidden="true" />
</template>

<style scoped>
.item-icon {
  flex: none;
  display: inline-block;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
.item-icon.placeholder {
  background: var(--surface-sunk);
  border: 1px solid var(--border);
  border-radius: 3px;
}
</style>
