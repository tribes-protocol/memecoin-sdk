import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['lib/index.ts'],
    format: ['cjs', 'esm'],
    external: ['react', 'react-dom', 'viem', 'wagmi', '@tanstack/react-query'],
    minify: true,
    outDir: 'dist',
    dts: true
  },
  {
    entry: ['lib/client/index.ts'],
    format: ['cjs', 'esm'],
    external: ['react', 'react-dom', 'viem', 'wagmi', '@tanstack/react-query'],
    esbuildOptions: (options) => {
      options.banner = {
        js: '"use client";'
      }
    },
    minify: true,
    outDir: 'dist/client',
    dts: true
  }
])
