// src/components/text-input.tsx

import React, { useState, useEffect, useRef } from "react";
import { Text } from "ink";

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  width?: number;
  history?: string[];
  submitOnPaste?: (value: string) => boolean;
  onTab?: () => void;
};

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  width = 40,
  history = [],
  submitOnPaste,
  onTab,
}: TextInputProps) {
  useEffect(() => {
    const handler = (data: Buffer) => {
      const str = data.toString();
      const clean = str.replace(/\x1b\[<[0-9;]+[Mmc]/g, "");
      
      if (clean === "\r") {
        onSubmit(value);
        return;
      }
      if (clean === "\x7f" || clean === "\b") {
        onChange(value.slice(0, -1));
        return;
      }
      if (clean === "\t") {
        onTab?.();
        return;
      }
      if (clean && !clean.match(/[\x00-\x1f]/)) {
        onChange(value + clean);
      }
    };

    process.stdin.on("data", handler);
    return () => {
      process.stdin.off("data", handler);
    };
  }, [value, onChange, onSubmit, onTab]);

  const displayValue = value || placeholder;
  const truncated = displayValue.length > width 
    ? "…" + displayValue.slice(-width + 1) 
    : displayValue;

  return (
    <Text>
      {truncated}
      <Text color="cyan">▌</Text>
    </Text>
  );
}