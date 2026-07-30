// src/components/progress-bar.tsx

import React from "react";
import { Text } from "ink";

type ProgressBarProps = {
  percent: number;
  width?: number;
};

export function ProgressBar({ percent, width = 30 }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent * 100));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  const percentStr = `${Math.round(clamped)}%`.padStart(4);

  return (
    <Text>
      <Text color="green">{bar}</Text>
      <Text> {percentStr}</Text>
    </Text>
  );
}