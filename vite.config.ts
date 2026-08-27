/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' -> relative asset paths, so the build works from any static host.
export default defineConfig({
  plugins: [vue()],
  base: './',
  test: {
    environment: 'happy-dom',
  },
})
