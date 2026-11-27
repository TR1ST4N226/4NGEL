// src/app.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react'
import os from 'node:os'
import path from 'node:path'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import { FramedInput } from './components/framed-input.js'
import { Fullscreen } from './components/fullscreen.js'
import { Logo } from './components/logo.js'
import { Panel } from './components/panel.js'
import { ProgressBar } from './components/progress-bar.js'
import { Shortcuts } from './components/shortcuts.js'
import { TextInput } from './components/text-input.js'
import { formatBytes, formatDuration, formatEta, formatSpeed, shortenPath, truncate, wrapText } from './lib/format.js'
import { addToHistory, loadHistory } from './lib/history.js'
import { detectPlatform, isProbablyUrl, type Platform } from './lib/platforms.js'
import { ThemeProvider, type ThemeMode, useTheme } from './theme.js'
import {
  buildChoices,
  download,
  ensureYtDlp,
  findFfmpeg,
  probe,
  type DownloadChoice,
  type DownloadProgress,
  type VideoInfo,
  YOUTUBE_CLIENTS,
} from './lib/ytdlp.js'

const OUT_DIR = path.join(os.homedir(), 'Downloads')
const BUTTON_LABEL = '4NGEL'
const DONE_LABEL = '↵ download another'
const TAGLINE = 'download any video. paste. 4NGEL. done.'

const choiceLabel = (choice: DownloadChoice) => `${choice.kind === 'audio' ? '♪ ' : '▶ '}${choice.label}`

const Gap = ({ lines = 1 }: { lines?: number }) => (
  <Box flexDirection="column" flexShrink={0}>
    {Array.from({ length: lines }, (_, i) => (
      <Text key={i}> </Text>
    ))}
  </Box>
)

function partLabel(progress: DownloadProgress): string {
  return progress.totalParts && progress.totalParts > 1 ? `part ${progress.part + 1}/${progress.totalParts}  ` : ''
}

function downloadMeta(progress: DownloadProgress): string {
  const speed = progress.speed ? formatSpeed(progress.speed) : ''
  const eta = progress.eta ? `${formatEta(progress.eta)} left` : ''
  return `${partLabel(progress)}${speed.padStart(10)}  ${eta.padEnd(12)}`
}

function indeterminateMeta(progress: DownloadProgress): string {
  const bytes = formatBytes(progress.downloadedBytes)
  const speed = progress.speed ? formatSpeed(progress.speed) : ''
  return `${partLabel(progress)}${bytes.padStart(8)}  ${speed.padEnd(10)}`
}

export type Outcome = { filepath?: string }

type Phase =
  | { name: 'input'; warning?: string }
  | { name: 'probing'; status: string }
  | { name: 'picking' }
  | {
      name: 'downloading'
      choice: DownloadChoice
      progress?: DownloadProgress
      processing: boolean
      refreshing?: boolean
      status?: string
    }
  | { name: 'done'; filepath: string }
  | { name: 'error'; message: string }

const HINTS: Record<Phase['name'], Array<[string, string]>> = {
  input: [
    ['↵', 'download'],
    ['^c', 'quit'],
  ],
  probing: [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  picking: [
    ['↑↓', 'choose'],
    ['↵', 'download'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  downloading: [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  done: [['^c', 'quit']],
  error: [
    ['↵', 'try again'],
    ['^c', 'quit'],
  ],
}

type AppProps = {
  initialUrl?: string
  clipboardUrl?: string
  initialThemeMode?: ThemeMode
  onOutcome: (outcome: Outcome) => void
}

export function App({ initialThemeMode = 'auto', ...props }: AppProps) {
  return (
    <ThemeProvider mode={initialThemeMode}>
      <AppContent {...props} />
    </ThemeProvider>
  )
}

function AppContent({
  initialUrl,
  clipboardUrl,
  onOutcome,
}: {
  initialUrl?: string
  clipboardUrl?: string
  onOutcome: (outcome: Outcome) => void
}) {
  const theme = useTheme()
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [url, setUrl] = useState(initialUrl ?? '')
  const [urlInput, setUrlInput] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [platform, setPlatform] = useState<Platform>()
  const [info, setInfo] = useState<VideoInfo>()
  const [choices, setChoices] = useState<DownloadChoice[]>([])
  const ytdlpRef = useRef('')
  const highlightRef = useRef(0)
  const infoJsonRef = useRef<string | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const browserCookiesRef = useRef(true)
  const [phase, setPhase] = useState<Phase>(initialUrl ? { name: 'probing', status: 'warming up…' } : { name: 'input' })

  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80
  const boxWidth = Math.max(14, Math.min(64, columns - 6))
  const contentWidth = Math.max(10, Math.min(columns - 4, 78))

  const startProbe = useCallback(async (targetUrl: string) => {
    const controller = new AbortController()
    abortRef.current = controller
    browserCookiesRef.current = true
    setPlatform(detectPlatform(targetUrl))
    setPhase({ name: 'probing', status: 'warming up…' })
    try {
      const ytdlp =
        ytdlpRef.current ||
        (await ensureYtDlp(status => setPhase({ name: 'probing', status }), controller.signal))
      ytdlpRef.current = ytdlp
      if (controller.signal.aborted) return
      setPhase({ name: 'probing', status: 'fetching video info…' })
      const { info: videoInfo, infoJsonPath } = await probe(
        ytdlp,
        targetUrl,
        controller.signal,
        true,
        status => {
          browserCookiesRef.current = false
          setPhase({ name: 'probing', status })
        },
      )
      if (controller.signal.aborted) return
      infoJsonRef.current = infoJsonPath
      setInfo(videoInfo)
      setChoices(buildChoices(videoInfo))
      highlightRef.current = 0
      setPhase({ name: 'picking' })
    } catch (error) {
      if (controller.signal.aborted) return
      setPhase({ name: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }, [])

  useEffect(() => {
    if (initialUrl) void startProbe(initialUrl)
  }, [initialUrl, startProbe])

  const resetToInput = useCallback(() => {
    setUrl('')
    setUrlInput('')
    setPlatform(undefined)
    setInfo(undefined)
    setChoices([])
    setPhase({ name: 'input' })
  }, [])

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
    resetToInput()
    setUrlInput(url)
  }, [resetToInput, url])

  useInput(
    (input, key) => {
      // ESC
      if (key.escape) {
        if (phase.name === 'picking' || phase.name === 'error' || phase.name === 'done') {
          resetToInput()
          return
        }
        if (phase.name === 'probing' || phase.name === 'downloading') {
          cancelRun()
          return
        }
      }
      
      // Entrée
      if (key.return) {
        if (phase.name === 'error' || phase.name === 'done') {
          resetToInput()
          return
        }
        if (phase.name === 'input') {
          handleUrlSubmit(urlInput)
          return
        }
      }
    },
    { isActive: true }
  )

  const handleUrlSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!isProbablyUrl(trimmed)) {
      setPhase({ name: 'input', warning: "that doesn't look like a link — paste a full url" })
      return
    }
    setUrl(trimmed)
    void startProbe(trimmed)
  }

  const clipboardOffered = Boolean(clipboardUrl) && urlInput === ''
  const clipboardAccepted = Boolean(clipboardUrl) && urlInput === clipboardUrl

  const handlePick = (choice: DownloadChoice) => {
    const controller = new AbortController()
    abortRef.current = controller
    setPhase({ name: 'downloading', choice, processing: false })
    void (async () => {
      const handlers = {
        onProgress: (progress: DownloadProgress) =>
          setPhase(prev =>
            prev.name === 'downloading'
              ? { ...prev, progress, processing: false, status: undefined }
              : prev,
          ),
        onProcessing: () =>
          setPhase(prev =>
            prev.name === 'downloading' ? { ...prev, processing: true, status: undefined } : prev,
          ),
        onStatus: (status: string) =>
          setPhase(prev => (prev.name === 'downloading' ? { ...prev, status } : prev)),
        onCookiesUnavailable: () => {
          browserCookiesRef.current = false
        },
      }
      try {
        const ffmpegLocation = await findFfmpeg()
        const base = { ytdlp: ytdlpRef.current, ffmpegLocation, url, choice, outDir: OUT_DIR }
        let filepath: string | undefined
        const clients = platform?.key === 'youtube' ? [...YOUTUBE_CLIENTS] : [undefined]
        let lastError: unknown

        for (const [index, youtubeClient] of clients.entries()) {
          if (index > 0) {
            setPhase(prev =>
              prev.name === 'downloading' ? { ...prev, progress: undefined, refreshing: true } : prev,
            )
          }

          try {
            filepath = await download(
              {
                ...base,
                infoJsonPath: index === 0 ? infoJsonRef.current : undefined,
                youtubeClient,
                useBrowserCookies: browserCookiesRef.current,
              },
              handlers,
              controller.signal,
            )
            break
          } catch (error) {
            lastError = error
            if (controller.signal.aborted || index === clients.length - 1) throw error
          }
        }

        if (!filepath) throw lastError ?? new Error('Download failed')
        onOutcome({ filepath })
        setHistory(addToHistory(url))
        setPhase({ name: 'done', filepath })
      } catch (error) {
        if (controller.signal.aborted) return
        setPhase({ name: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    })()
  }

  let hints: Array<[string, string]> = [...HINTS[phase.name]]
  if (phase.name === 'input' && history.length > 0) {
    hints = [hints[0]!, ['↑', 'history'], ...hints.slice(1)]
  }

  return (
    <Fullscreen>
      <Box flexDirection="column" alignItems="center">
        <Logo />
        <Gap lines={1} />
        <Text color={theme.primary}>{TAGLINE}</Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>youtube · x · instagram · threads · tiktok · +1800 more</Text>
        <Gap lines={2} />

        {phase.name === 'input' && (
          <Box flexDirection="column" alignItems="center">
            <FramedInput title="Paste a link" width={boxWidth} button={BUTTON_LABEL}>
              <TextInput
                value={urlInput}
                onChange={setUrlInput}
                onSubmit={handleUrlSubmit}
                placeholder="https://youtube.com/watch?v=…"
                width={boxWidth - 6}
                history={history}
                submitOnPaste={isProbablyUrl}
                onTab={() => {
                  if (clipboardOffered) setUrlInput(clipboardUrl!)
                }}
              />
            </FramedInput>
            {phase.warning ? (
              <Text color={theme.gray} dimColor={theme.dimSecondary}>✗ {phase.warning}</Text>
            ) : clipboardOffered ? (
              <Text color={theme.gray} dimColor={theme.dimSecondary}>link in your clipboard — ⇥ to paste it</Text>
            ) : clipboardAccepted ? (
              <Text color={theme.gray} dimColor={theme.dimSecondary}>from your clipboard — ↵ to download it</Text>
            ) : null}
          </Box>
        )}

        {phase.name === 'probing' && (
          <Box flexDirection="column" alignItems="center">
            <FramedInput title={platform ? platform.label : 'Paste a link'} width={boxWidth} button={BUTTON_LABEL} buttonDim>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{url.length > boxWidth - 8 ? `${url.slice(0, boxWidth - 9)}…` : url}</Text>
            </FramedInput>
          </Box>
        )}

        {phase.name === 'picking' && platform && (
          <Box width={contentWidth}>
            <Box flexDirection="column" flexGrow={1} flexBasis={0} paddingTop={1} paddingRight={3}>
              {wrapText(info?.title ?? '', Math.max(10, contentWidth - 41)).map((line, index) => (
                <Text key={index} bold color={theme.primary}>
                  {line}
                </Text>
              ))}
              <Gap />
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                ▸ {platform.label}
                {info?.duration ? ` · ${formatDuration(info.duration)}` : ''}
                {info?.uploader ? ` · ${info.uploader}` : ''}
              </Text>
            </Box>
            <Panel title="Download" width={38}>
              <SelectInput
                items={choices.map((choice, index) => ({
                  key: String(index),
                  label: choiceLabel(choice),
                  value: index,
                }))}
                onSelect={(item) => {
                  const choice = choices[item.value as number]
                  if (choice) handlePick(choice)
                }}
                onHighlight={(item) => {
                  highlightRef.current = item.value as number
                }}
                limit={10}
                initialIndex={0}
              />
            </Panel>
          </Box>
        )}

        {phase.name === 'downloading' && (
          <Box flexDirection="column" alignItems="center">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              {info?.title ? `${truncate(info.title, 42)} · ` : ''}
              {phase.choice.label}
            </Text>
            <Gap />
            {phase.processing ? (
              <>
                <ProgressBar percent={1} />
                <Gap />
                <Text>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}> processing…</Text>
                </Text>
              </>
            ) : phase.progress?.totalBytes ? (
              <>
                <ProgressBar percent={phase.progress.downloadedBytes / phase.progress.totalBytes} />
                <Gap />
                <Text color={theme.gray} dimColor={theme.dimSecondary}>{downloadMeta(phase.progress)}</Text>
              </>
            ) : phase.progress ? (
              <>
                <Text>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}> downloading…</Text>
                </Text>
                <Gap />
                <Text color={theme.gray} dimColor={theme.dimSecondary}>{indeterminateMeta(phase.progress)}</Text>
              </>
            ) : (
              <>
                <ProgressBar percent={0} />
                <Gap />
                <Text>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>
                    {phase.status ??
                      (phase.refreshing ? ' link expired — grabbing a fresh one…' : ' starting download…')}
                  </Text>
                </Text>
              </>
            )}
          </Box>
        )}

        {phase.name === 'done' && (
          <Box flexDirection="column" alignItems="center">
            <Text>
              <Text bold color={theme.primary}>✓ downloaded! </Text>
              <Text color={theme.primary}>find your file in:</Text>
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>{shortenPath(phase.filepath, os.homedir(), 60)}</Text>
            <Gap />
            <Box
              borderStyle="round"
              borderColor={theme.gray}
              paddingX={3}
            >
              <Text bold color={theme.primary}>{DONE_LABEL}</Text>
            </Box>
          </Box>
        )}

        {phase.name === 'error' && (
          <Box flexDirection="column" alignItems="center" width={Math.max(10, Math.min(columns - 6, 72))}>
            <Text bold color={theme.primary}>✗ {phase.message}</Text>
          </Box>
        )}

        {hints.length > 0 ? (
          <>
            <Gap lines={2} />
            <Shortcuts
              shortcuts={hints}
              leading={
                phase.name === 'probing' ? (
                  <Text>
                    <Text color={theme.primary}>
                      <Spinner type="dots" />
                    </Text>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}> {phase.status}</Text>
                  </Text>
                ) : undefined
              }
            />
          </>
        ) : null}
      </Box>
    </Fullscreen>
  )
}