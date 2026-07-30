// src/lib/use-mouse-click.ts

import { useEffect } from "react";

export function useMouseClick(
  callback: (x: number, y: number) => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !process.stdin.isTTY) return;

    const onData = (data: Buffer) => {
      const str = data.toString();
      // Parse SGR mouse events
      const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mmc])/);
      if (match) {
        const button = parseInt(match[1], 10);
        const x = parseInt(match[2], 10);
        const y = parseInt(match[3], 10);
        const type = match[4];
        
        // Button 0 = left click, 'M' = press
        if (button === 0 && type === "M") {
          callback(x, y);
        }
      }
    };

    // Activer le mode souris
    process.stdout.write("\x1b[?1000h\x1b[?1006h");
    process.stdin.on("data", onData);

    return () => {
      process.stdout.write("\x1b[?1006l\x1b[?1000l");
      process.stdin.off("data", onData);
    };
  }, [callback, enabled]);
}