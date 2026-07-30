// src/lib/clipboard.ts

import { execFileSync } from "node:child_process";

export function readClipboard(): string {
  const commands: string[][] = [];

  if (process.platform === "darwin") {
    commands.push(["pbpaste"]);
  } else if (process.platform === "win32") {
    commands.push(["powershell", "-Command", "Get-Clipboard"]);
  } else {
    commands.push(["wl-paste", "--no-newline"]);
    commands.push(["xclip", "-selection", "clipboard", "-o"]);
    commands.push(["xsel", "--clipboard", "--output"]);
  }

  for (const cmd of commands) {
    try {
      const result = execFileSync(cmd[0], cmd.slice(1), {
        timeout: 500,
        stdio: ["ignore", "pipe", "ignore"],
      });
      return result.toString().trim();
    } catch {
      continue;
    }
  }

  return "";
}