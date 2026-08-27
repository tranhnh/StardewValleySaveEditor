<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogItem } from '../lib/catalog'
import { spriteRect } from '../lib/sprites'

const props = defineProps<{
  item?: CatalogItem | null
  size?: number
  tint?: string | null
  prismatic?: boolean
}>()

const resolved = computed(() => {
  const box = props.size ?? 22
  const rect = props.item ? spriteRect(props.item) : null
  if (!rect) return null
  const scale = Math.min(box / rect.w, box / rect.h)
  return { rect, scale }
})

const style = computed(() => {
  const r = resolved.value
  if (!r) {
    const box = props.size ?? 22
    return { width: `${box}px`, height: `${box}px` }
  }
  const { rect, scale } = r
  return {
    width: `${Math.round(rect.w * scale)}px`,
    height: `${Math.round(rect.h * scale)}px`,
    backgroundImage: `url(${import.meta.env.BASE_URL}sprites/${rect.sheet})`,
    backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
    backgroundSize: `${rect.sheetW * scale}px ${rect.sheetH * scale}px`,
  }
})

const maskVars = computed(() => {
  const r = resolved.value
  if (!r) return null
  const { rect, scale } = r
  return {
    '--m-img': `url(${import.meta.env.BASE_URL}sprites/${rect.sheet})`,
    '--m-pos': `-${rect.x * scale}px -${rect.y * scale}px`,
    '--m-size': `${rect.sheetW * scale}px ${rect.sheetH * scale}px`,
  }
})

const showTint = computed(() => !!resolved.value && !props.prismatic && !!props.tint)
const showPrismatic = computed(() => !!resolved.value && !!props.prismatic)
const isPlaceholder = computed(() => !resolved.value)
</script>

<template>
  <span class="item-icon" :class="{ placeholder: isPlaceholder }" :style="style" aria-hidden="true">
    <span
      v-if="showTint"
      class="item-icon-layer tint"
      :style="[maskVars, { backgroundColor: tint! }]"
    />
    <span v-else-if="showPrismatic" class="item-icon-layer prismatic" :style="maskVars" />
  </span>
</template>

<style scoped>
.item-icon {
  position: relative;
  isolation: isolate;
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
.item-icon-layer {
  position: absolute;
  inset: 0;
  -webkit-mask: var(--m-img) no-repeat;
  mask: var(--m-img) no-repeat;
  -webkit-mask-position: var(--m-pos);
  mask-position: var(--m-pos);
  -webkit-mask-size: var(--m-size);
  mask-size: var(--m-size);
}
.item-icon-layer.tint {
  mix-blend-mode: multiply;
}
.item-icon-layer.prismatic {
  mix-blend-mode: multiply;
  background: linear-gradient(115deg, #ff5c5c, #ffd23f, #4fe08a, #46c6ff, #b06cff, #ff5cc4);
}
</style>
