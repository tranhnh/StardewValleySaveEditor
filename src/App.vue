<script setup lang="ts">
import { ref } from 'vue'
import { useSaveStore } from './stores/save'
import FileLoader from './components/FileLoader.vue'
import CoreTab from './components/CoreTab.vue'
import SkillsTab from './components/SkillsTab.vue'
import InventoryTab from './components/InventoryTab.vue'

const store = useSaveStore()
type Tab = 'core' | 'skills' | 'inventory'
const tab = ref<Tab>('core')
</script>

<template>
  <header>
    <h1>Stardew Valley Save Editor</h1>
    <p class="muted">Runs entirely in your browser — your save is never uploaded.</p>
  </header>

  <div class="note warn">
    <strong>Back up first.</strong> Copy your save folder before editing.
    Windows: <code>%AppData%\StardewValley\Saves</code> ·
    macOS/Linux: <code>~/.config/StardewValley/Saves</code>. A bad edit can make a save
    unloadable.
  </div>

  <FileLoader v-if="!store.loaded" />

  <template v-else>
    <div class="meta">
      <span>Editing <strong>{{ store.fileName }}</strong></span>
      <span>game version {{ store.gameVersion }}</span>
      <span class="spacer" />
      <button class="ghost sm" @click="store.unload()">Load a different file</button>
    </div>

    <nav class="tabs">
      <button :class="{ active: tab === 'core' }" @click="tab = 'core'">Core</button>
      <button :class="{ active: tab === 'skills' }" @click="tab = 'skills'">Skills</button>
      <button :class="{ active: tab === 'inventory' }" @click="tab = 'inventory'">Inventory</button>
    </nav>

    <CoreTab v-if="tab === 'core'" />
    <SkillsTab v-else-if="tab === 'skills'" />
    <InventoryTab v-else />

    <div class="actionbar">
      <button class="primary" @click="store.download()">Download edited save</button>
      <button class="ghost" @click="store.revert()">Revert all changes</button>
    </div>
    <p class="muted">
      Saved as <code>{{ store.fileName }}</code> (no extension). Replace the original in
      your save folder, then load the game.
    </p>
  </template>

  <footer>
    <p class="muted">Not affiliated with ConcernedApe. Use at your own risk.</p>
  </footer>
</template>
