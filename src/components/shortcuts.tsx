// src/components/shortcuts.tsx

import React, { ReactNode } from "react";
import { Text } from "ink";

type ShortcutsProps = {
  shortcuts: Array<[string, string]>;
  leading?: ReactNode;
};

export function Shortcuts({ shortcuts, leading }: ShortcutsProps) {
  const rendered = shortcuts.map(([key, label], i) => (
    <Text key={i}>
      {i > 0 && <Text> · </Text>}
      <Text color="gray" dimColor>{key}</Text>
      <Text> {label}</Text>
    </Text>
  ));

  return (
    <Text>
      {leading}
      {leading && "  "}
      {rendered}
    </Text>
  );
}