import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@domain': path.resolve(root, '../domain'),
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
