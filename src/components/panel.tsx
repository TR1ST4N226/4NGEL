// src/components/panel.tsx

import React, { ReactNode } from "react";
import { Box, Text } from "ink";

type PanelProps = {
  title: string;
  children: ReactNode;
  width?: number;
};

export function Panel({ title, children, width = 40 }: PanelProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      paddingX={1}
    >
      <Text color="gray">{title}</Text>
      <Box flexDirection="column" paddingX={1}>
        {children}
      </Box>
    </Box>
  );
}