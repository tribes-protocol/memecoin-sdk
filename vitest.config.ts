import { resolve } from 'path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 100000,
    env: loadEnv('production', process.cwd(), '')
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './lib')
    }
  }
})
