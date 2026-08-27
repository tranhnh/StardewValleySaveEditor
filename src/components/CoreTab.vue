<script setup lang="ts">
import { useSaveStore } from '../stores/save'
import { formatPlayTime } from '../lib/saveModel'

const store = useSaveStore()

const INT32_MAX = 2_147_483_647
const seasons = ['spring', 'summer', 'fall', 'winter'] as const
</script>

<template>
  <template v-if="store.core">
    <section class="card">
      <h2>Farmer</h2>
      <div class="grid">
        <div class="field">
          <label>Farmer name</label>
          <input type="text" v-model="store.core.name" />
        </div>
        <div class="field">
          <label>Farm name</label>
          <input type="text" v-model="store.core.farmName" />
        </div>
      </div>
      <div class="field">
        <label>Favorite thing</label>
        <input type="text" v-model="store.core.favoriteThing" />
      </div>
    </section>

    <section class="card">
      <h2>Money</h2>
      <div class="grid">
        <div class="field">
          <label>Current gold</label>
          <input type="number" min="0" :max="INT32_MAX" v-model.number="store.core.money" />
        </div>
        <div class="field">
          <label>Total earned</label>
          <input
            type="number"
            min="0"
            :max="INT32_MAX"
            v-model.number="store.core.totalMoneyEarned"
          />
          <p class="muted">Affects Grandpa's evaluation.</p>
        </div>
      </div>
      <p class="muted">
        In shared-wallet co-op the game may override player gold with the team total.
      </p>
    </section>

    <section class="card">
      <h2>Vitality</h2>
      <div class="grid">
        <div class="field">
          <label>Max health</label>
          <input type="number" min="1" v-model.number="store.core.maxHealth" />
        </div>
        <div class="field">
          <label>Max stamina</label>
          <input type="number" min="1" v-model.number="store.core.maxStamina" />
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Calendar</h2>
      <div class="grid">
        <div class="field">
          <label>Season</label>
          <select v-model="store.core.season">
            <option v-for="s in seasons" :key="s" :value="s">
              {{ s[0].toUpperCase() + s.slice(1) }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>Day of month (1–28)</label>
          <input type="number" min="1" max="28" v-model.number="store.core.dayOfMonth" />
        </div>
        <div class="field">
          <label>Year</label>
          <input type="number" min="1" v-model.number="store.core.year" />
        </div>
        <div class="field">
          <label>Hours played</label>
          <input type="number" min="0" step="0.1" v-model.number="store.core.hoursPlayed" />
          <p class="muted">{{ formatPlayTime(store.core.hoursPlayed) }}</p>
        </div>
      </div>
    </section>
  </template>
</template>
