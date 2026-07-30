// src/lib/history.ts

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const APP_NAME = "4ngel";
const HISTORY_FILE = join(homedir(), ".config", APP_NAME, "history.json");
const MAX_HISTORY = 50;

export function loadHistory(): string[] {
  try {
    if (!existsSync(HISTORY_FILE)) return [];
    const data = readFileSync(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function addToHistory(url: string): string[] {
  try {
    const history = loadHistory();
    const filtered = history.filter((item) => item !== url);
    const newHistory = [url, ...filtered].slice(0, MAX_HISTORY);
    
    const dir = join(homedir(), ".config", APP_NAME);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(HISTORY_FILE, JSON.stringify(newHistory, null, 2));
    return newHistory;
  } catch {
    return [];
  }
}