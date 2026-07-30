// src/lib/click-map.ts

import { Writable } from "node:stream";

export type ClickTarget = {
  match: string;
  action: () => void;
  padX?: number;
  padY?: number;
};

let frameLines: string[] = [];

export function captureFrames(stream: Writable): Writable {
  const originalWrite = stream.write.bind(stream);
  
  const proxy = new Writable({
    write(chunk: any, encoding: any, callback: any) {
      const str = chunk.toString();
      const lines = str.split("\n");
      
      // Nettoyer les séquences ANSI
      const cleanLines = lines.map((line: string) => 
        line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][0-9]*;[^\x07]*\x07/g, "")
      );
      
      const nonEmptyLines = cleanLines.filter((l: string) => l.trim());
      if (nonEmptyLines.length > 0) {
        frameLines = cleanLines;
      }
      
      originalWrite(chunk);
      callback();
    },
  });

  return proxy;
}

export function clickTargetAt(
  x: number,
  y: number,
  targets: ClickTarget[]
): ClickTarget | undefined {
  const row = frameLines[y - 1];
  if (!row) return undefined;

  for (const target of targets) {
    const padY = target.padY || 0;
    for (let dy = -padY; dy <= padY; dy++) {
      const checkRow = frameLines[y - 1 + dy];
      if (!checkRow) continue;
      
      const index = checkRow.indexOf(target.match);
      if (index !== -1) {
        const padX = target.padX || 0;
        if (x >= index - padX && x <= index + target.match.length + padX) {
          return target;
        }
      }
    }
  }
  return undefined;
}

export function findFrameRow(text: string): number {
  for (let i = 0; i < frameLines.length; i++) {
    if (frameLines[i]?.includes(text)) {
      return i + 1;
    }
  }
  return -1;
}

export function frameRowSpan(row: number): [number, number] | undefined {
  const line = frameLines[row - 1];
  if (!line) return undefined;
  const trimmed = line.trim();
  const start = line.indexOf(trimmed);
  return [start, start + trimmed.length];
}