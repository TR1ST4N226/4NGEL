// src/lib/format.ts

/**
 * Formate les bytes en unités lisibles (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * Formate une durée en secondes en mm:ss ou h:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "--:--";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const formatEta = formatDuration;

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export function shortenPath(filepath: string, homeDir?: string, max: number = 50): string {
  let path = filepath;

  if (homeDir && path.startsWith(homeDir)) {
    path = "~" + path.slice(homeDir.length);
  }

  if (path.length <= max) return path;

  const extIndex = path.lastIndexOf(".");
  if (extIndex > 0 && path.length - extIndex < 20) {
    const ext = path.slice(extIndex);
    const name = path.slice(0, extIndex);
    const half = Math.floor((max - ext.length - 1) / 2);
    return name.slice(0, half) + "…" + name.slice(-half) + ext;
  }

  return truncate(path, max);
}

export function wrapText(text: string, width: number): string[] {
  if (width < 1) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.length === 0) continue;

    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length <= width) {
        currentLine = word;
      } else {
        let remaining = word;
        while (remaining.length > width) {
          lines.push(remaining.slice(0, width));
          remaining = remaining.slice(width);
        }
        currentLine = remaining;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}