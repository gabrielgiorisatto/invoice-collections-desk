import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(root, 'domain'),
    },
  },
  test: {
    include: ['domain/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
