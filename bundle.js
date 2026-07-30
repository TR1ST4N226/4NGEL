// bundle.js

import { build } from 'esbuild'
import { mkdirSync } from 'fs'

mkdirSync('bin', { recursive: true })

await build({
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'bin/4ngel.js',
  banner: {
    js: '#!/usr/bin/env node\n'
  },
  external: [
    'ink',
    'react',
    'react-dom',
    'ink-select-input',
    'ink-spinner',
    'ffmpeg-static'
  ],
  loader: { '.tsx': 'tsx' },
  resolveExtensions: ['.tsx', '.ts', '.js'],
  treeShaking: true,
  minify: true,
})

console.log('✅ Bundle created: bin/4ngel.js')
console.log('🚀 Run with: node bin/4ngel.js')