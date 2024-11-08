import { defineConfig } from 'tsup'

export default defineConfig({
  format: ['cjs', 'esm'],
  external: ['react', 'react-dom', 'viem', 'wagmi', '@tanstack/react-query'],
  esbuildOptions: (options) => {
    options.banner = {
      js: '"use client";'
    }
  },
  minify: true
})
