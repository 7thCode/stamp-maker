import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: { build: { rollupOptions: { external: ['sharp'] } } },
  preload: {},
  renderer: {
    plugins: [react()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  }
})
