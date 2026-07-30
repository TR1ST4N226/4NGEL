// src/cli-standalone.tsx

import React from 'react'
import { createRequire } from 'node:module'
import { render } from 'ink'
import { App, type Outcome } from './app.js'
import { parseArgs } from './lib/args.js'
import { readClipboard } from './lib/clipboard.js'
import { isProbablyUrl } from './lib/platforms.js'

const VERSION: string = createRequire(import.meta.url)('../package.json').version

const HELP = `
  4NGEL — download any video. paste. 4NGEL. done.

  Usage
    $ 4ngel [url]

  Examples
    $ 4ngel https://youtu.be/dQw4w9WgXcQ
    $ 4ngel https://x.com/user/status/123456
    $ 4ngel                 (prompts for a url)

  Options
    -h, --help      show this help
    -v, --version   show version

  Downloads are saved to ~/Downloads.
  Powered by yt-dlp — YouTube, X, Instagram, Threads, TikTok & 1800+ sites.
`

const args = parseArgs(process.argv.slice(2))

if (args.error) {
  console.error(`4NGEL: ${args.error}\nTry “4ngel --help” for usage.`)
  process.exit(1)
}

if (args.help) {
  console.log(HELP)
  process.exit(0)
}

if (args.version) {
  console.log(VERSION)
  process.exit(0)
}

const initialUrl = args.initialUrl
const initialThemeMode = args.themeMode ?? 'auto'

const isTTY = Boolean(process.stdout.isTTY)

let clipboardUrl: string | undefined
if (!initialUrl && isTTY) {
  const clipped = readClipboard().trim()
  if (clipped && !/\s/.test(clipped) && isProbablyUrl(clipped)) {
    clipboardUrl = clipped
  }
}

const enterAltScreen = () => process.stdout.write('\x1b[?1049h\x1b[H')
const leaveAltScreen = () => process.stdout.write('\x1b[?1006l\x1b[?1000l\x1b[?1049l')

if (isTTY) {
  enterAltScreen()
  process.on('exit', leaveAltScreen)
  for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
    process.on(event, (error: unknown) => {
      leaveAltScreen()
      console.error(error)
      process.exit(1)
    })
  }
}

let outcome: Outcome = {}
const { waitUntilExit } = render(
  <App
    initialUrl={initialUrl}
    clipboardUrl={clipboardUrl}
    initialThemeMode={initialThemeMode}
    onOutcome={result => (outcome = result)}
  />
)

await waitUntilExit()

if (isTTY) leaveAltScreen()
if (outcome.filepath) {
  console.log(`✓ downloaded → ${outcome.filepath}`)
}

// === AJOUT : Pause pour que la fenêtre reste ouverte ===
console.log('\nPress any key to exit...')
process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.once('data', () => {
  process.stdin.setRawMode(false)
  process.stdin.pause()
  process.exit(0)
})