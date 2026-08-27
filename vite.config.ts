/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' keeps asset paths relative so the built site works from any
// static host or subdirectory (GitHub Pages project pages, itch.io, etc.).
export default defineConfig({
  plugins: [vue()],
  base: './',
  test: {
    environment: 'happy-dom',
  },
})
