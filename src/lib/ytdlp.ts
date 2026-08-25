// src/lib/ytdlp.ts

import { spawn, execFile } from "node:child_process";
import { createWriteStream, renameSync, chmodSync, existsSync, mkdirSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";

// Importer formatBytes depuis notre module
import { formatBytes } from "./format.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

// Configuration des chemins
const APP_NAME = "4ngel";
const BIN_DIR = join(homedir(), ".config", APP_NAME, "bin");
const BIN_PATH = join(BIN_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

// Types pour les métadonnées
export type VideoFormat = {
  format_id: string;
  ext: string;
  vcodec: string;
  acodec: string;
  height?: number;
  width?: number;
  abr?: number;
  tbr?: number;
  filesize?: number;
  filesize_approx?: number;
  url?: string;
};

export type VideoInfo = {
  title: string;
  uploader?: string;
  duration?: number;
  webpage_url?: string;
  extractor_key?: string;
  formats: VideoFormat[];
};

export type DownloadChoice = {
  label: string;
  height?: number;
  args: string[];
  estimatedSize?: number;
  isAudioOnly?: boolean;
  kind?: "video" | "audio";
};

export type DownloadProgress = {
  downloadedBytes: number;
  totalBytes?: number;
  totalBytesEstimate?: boolean;
  speed?: number;
  eta?: number;
  percent?: number;
  part: number;
  totalParts?: number;
};

export type DownloadHandlers = {
  onProgress: (progress: DownloadProgress) => void;
  onProcessing: (message: string) => void;
};

// --- URL de téléchargement selon la plateforme ---
function getYtDlpDownloadUrl(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
  }

  if (platform === "darwin") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
  }

  if (platform === "linux") {
    if (arch === "arm64") {
      return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64";
    }
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
  }

  throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

// --- Vérification des commandes ---
async function commandWorks(cmd: string, args: string[] = ["--version"]): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// --- Téléchargement de yt-dlp ---
async function downloadYtDlp(
  onStatus?: (msg: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = getYtDlpDownloadUrl();
  const tempPath = `${BIN_PATH}.download`;

  mkdirSync(BIN_DIR, { recursive: true });

  onStatus?.(`Downloading yt-dlp from ${url}...`);

  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download yt-dlp: ${response.status} ${response.statusText}`);
  }

  const writer = createWriteStream(tempPath);
  const stream = Readable.fromWeb(response.body as any);

  await pipeline(stream, writer);

  chmodSync(tempPath, 0o755);
  renameSync(tempPath, BIN_PATH);

  onStatus?.("yt-dlp installed successfully");

  return BIN_PATH;
}

// --- ensureYtDlp : trouve ou installe ---
export async function ensureYtDlp(
  onStatus?: (msg: string) => void,
  signal?: AbortSignal
): Promise<string> {
  onStatus?.("Checking for yt-dlp...");
  if (await commandWorks("yt-dlp")) {
    onStatus?.("Found yt-dlp on PATH");
    return "yt-dlp";
  }

  if (existsSync(BIN_PATH) && await commandWorks(BIN_PATH)) {
    onStatus?.("Found bundled yt-dlp");
    return BIN_PATH;
  }

  return downloadYtDlp(onStatus, signal);
}

// --- findFfmpeg ---
export async function findFfmpeg(): Promise<string | undefined> {
  if (await commandWorks("ffmpeg", ["-version"])) {
    return undefined;
  }

  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && await commandWorks(ffmpegStatic as string, ["-version"])) {
      return ffmpegStatic as string;
    }
  } catch {
    // ffmpeg-static n'est pas installé
  }

  return undefined;
}

// --- cleanYtDlpError ---
function cleanYtDlpError(stderr: string): string {
  const lines = stderr.split("\n");
  const errorLines = lines.filter((line) => line.startsWith("ERROR:"));

  if (errorLines.length === 0) {
    return stderr.split("\n").slice(0, 3).join("\n");
  }

  const lastError = errorLines[errorLines.length - 1];
  return lastError.replace(/^ERROR:\s*\[[^\]]+\]\s*/, "");
}

// --- probe : extraction des métadonnées ---
export async function probe(
  ytdlp: string,
  url: string,
  signal?: AbortSignal
): Promise<{ info: VideoInfo; infoJsonPath: string }> {
  const tempFile = join(tmpdir(), `${APP_NAME}-info-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);

  return new Promise((resolve, reject) => {
    const args = ["-J", "--no-playlist", "--no-warnings", url];

    const child = spawn(ytdlp, args, {
      signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", async (code) => {
      if (code !== 0) {
        const errorMsg = cleanYtDlpError(stderr);
        reject(new Error(`yt-dlp failed: ${errorMsg}`));
        return;
      }

      try {
        const info = JSON.parse(stdout) as VideoInfo;
        await writeFile(tempFile, stdout, "utf-8");
        resolve({ info, infoJsonPath: tempFile });
      } catch (err) {
        reject(new Error(`Failed to parse yt-dlp output: ${err}`));
      }
    });

    child.on("error", (err) => {
      if (signal?.aborted) {
        reject(new Error("Probe cancelled"));
      } else {
        reject(err);
      }
    });
  });
}

// --- scoreVideo ---
const MAX_VIDEO_CHOICES = 8;

function scoreVideo(format: VideoFormat): number {
  let score = 0;

  if (format.tbr) score += format.tbr;
  if (format.filesize) score += format.filesize / 1024 / 1024;

  if (format.ext === "mp4") score += 1000;
  if (format.vcodec?.startsWith("avc")) score += 500;

  return score;
}

// --- buildChoices ---
export function buildChoices(info: VideoInfo): DownloadChoice[] {
  const choices: DownloadChoice[] = [];
  const formats = info.formats || [];

  if (formats.length === 0) {
    choices.push({
      label: "Best available",
      args: ["-f", "bv*+ba/b"],
      kind: "video",
    });
    return choices;
  }

  const audioFormats = formats.filter(
    (f) => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none")
  );

  const videoFormats = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none"
  );

  let bestAudio: VideoFormat | undefined;
  let bestAudioBitrate = 0;

  for (const f of audioFormats) {
    const bitrate = f.abr || f.tbr || 0;
    if (bitrate > bestAudioBitrate) {
      bestAudioBitrate = bitrate;
      bestAudio = f;
    }
  }

  const heights = new Set<number>();
  for (const f of videoFormats) {
    if (f.height) {
      heights.add(f.height);
    }
  }

  const sortedHeights = Array.from(heights).sort((a, b) => b - a);
  const topHeights = sortedHeights.slice(0, MAX_VIDEO_CHOICES);

  for (const height of topHeights) {
    const candidates = videoFormats.filter((f) => f.height === height);

    let best: VideoFormat | undefined;
    let bestScore = -1;

    for (const f of candidates) {
      const score = scoreVideo(f);
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }

    if (best) {
      const isMuxed = best.acodec && best.acodec !== "none";

      const formatArg = isMuxed
        ? `b[height=${height}]/bv*[height<=${height}]+ba/b`
        : `bv*[height=${height}]+ba/b[height=${height}]/b[height=${height}]/bv*[height<=${height}]+ba/b`;

      let estimatedSize = best.filesize || best.filesize_approx || 0;
      if (!isMuxed && bestAudio?.filesize) {
        estimatedSize += bestAudio.filesize;
      }

      const label = `${height}p · ${best.ext || "mp4"} · ~${formatBytes(estimatedSize)}`;

      choices.push({
        label,
        height,
        args: ["-f", formatArg, "--merge-output-format", "mp4"],
        estimatedSize: estimatedSize || undefined,
        kind: "video",
      });
    }
  }

  // Toujours ajouter une option audio-only MP3
  choices.push({
    label: `🎵 Audio only · MP3`,
    args: ["-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", "0"],
    isAudioOnly: true,
    kind: "audio",
  });

  return choices;
}

// --- download ---
export async function download(
  options: {
    ytdlp: string;
    ffmpegLocation?: string;
    url: string;
    infoJsonPath?: string;
    choice: DownloadChoice;
    outDir: string;
  },
  handlers: DownloadHandlers,
  signal?: AbortSignal
): Promise<string> {
  const { ytdlp, ffmpegLocation, url, infoJsonPath, choice, outDir } = options;
  const { onProgress, onProcessing } = handlers;

  await mkdir(outDir, { recursive: true });

  const args: string[] = [];

  // The probe JSON contains signed media URLs which can expire before the
  // user selects a format. Re-extract from the page so yt-dlp gets fresh URLs.
  args.push(url);

  args.push(...choice.args);

  args.push(
    "--no-playlist",
    "--no-warnings",
    "--newline",
    "--no-quiet",
    "--no-simulate",
    "--retries", "3",
    "--fragment-retries", "3",
    "--extractor-retries", "3",
    "--progress",
    "--progress-template",
    `download:${["downloaded_bytes", "total_bytes", "total_bytes_estimate", "speed", "eta"].join("|")}`,
    "--print",
    "after_move:filepath",
    "-o",
    join(outDir, "%(title).60s.%(ext)s")
  );

  if (ffmpegLocation) {
    args.push("--ffmpeg-location", ffmpegLocation);
  }

  let finalPath: string | undefined;
  let downloadedParts = 0;
  let totalParts: number | undefined;

  return new Promise((resolve, reject) => {
    const child = spawn(ytdlp, args, {
      signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let buffer = "";
    let lastProgress: Partial<DownloadProgress> = {};

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("download:")) {
          const parts = line.slice(9).split("|");
          if (parts.length >= 5) {
            const [downloaded, total, totalEst, speed, eta] = parts;

            const progress: DownloadProgress = {
              downloadedBytes: parseFloat(downloaded) || 0,
              totalBytes: total !== "NA" && total !== "None" ? parseFloat(total) : undefined,
              totalBytesEstimate: totalEst === "True" || totalEst === "true",
              speed: speed !== "NA" && speed !== "None" ? parseFloat(speed) : undefined,
              eta: eta !== "NA" && eta !== "None" ? parseFloat(eta) : undefined,
              part: downloadedParts,
              totalParts,
            };

            if (progress.totalBytes) {
              progress.percent = (progress.downloadedBytes / progress.totalBytes) * 100;
            }

            if (lastProgress.downloadedBytes && progress.downloadedBytes < lastProgress.downloadedBytes) {
              downloadedParts++;
              progress.part = downloadedParts;
            }

            lastProgress = progress;
            onProgress(progress);
          }
          continue;
        }

        const partsMatch = line.match(/Downloading (\d+) format\(s\):/);
        if (partsMatch) {
          totalParts = parseInt(partsMatch[1], 10);
          lastProgress.totalParts = totalParts;
          continue;
        }

        if (line.includes("[Merger]") || line.includes("[ExtractAudio]")) {
          onProcessing(line);
          continue;
        }

        if (line.startsWith("[download] Destination: ")) {
          continue;
        }

        if (line.startsWith("/") || (process.platform === "win32" && /^[A-Z]:\\/i.test(line))) {
          finalPath = line.trim();
        }
      }
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", async (code) => {
      if (infoJsonPath) {
        try {
          await rm(infoJsonPath, { force: true });
        } catch {
          // Ignorer
        }
      }

      if (signal?.aborted) {
        if (finalPath) {
          try {
            await rm(finalPath, { force: true });
            await rm(`${finalPath}.part`, { force: true });
            await rm(`${finalPath}.ytdl`, { force: true });
          } catch {
            // Ignorer
          }
        }
        reject(new Error("Download cancelled."));
        return;
      }

      if (code !== 0) {
        const errorMsg = cleanYtDlpError(stderr);
        reject(new Error(`Download failed: ${errorMsg}`));
        return;
      }

      if (!finalPath) {
        reject(new Error("Could not determine final file path"));
        return;
      }

      resolve(finalPath);
    });

    child.on("error", (err) => {
      if (!signal?.aborted) {
        reject(err);
      }
    });
  });
}