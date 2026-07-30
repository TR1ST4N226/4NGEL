// src/components/framed-input.tsx

import React, { ReactNode } from "react";
import { Box, Text } from "ink";

type FramedInputProps = {
  title: string;
  children: ReactNode;
  button?: string | { label: string; onPress: () => void; dim?: boolean };
  buttonDim?: boolean;
  width?: number;
};

export function FramedInput({ title, children, button, buttonDim, width = 60 }: FramedInputProps) {
  const buttonObj = typeof button === "string" 
    ? { label: button, onPress: () => {}, dim: buttonDim }
    : button;

  const titleLen = title.length;
  const buttonLen = buttonObj ? buttonObj.label.length + 2 : 0;
  const dashCount = Math.max(0, width - titleLen - buttonLen - 6);

  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text color="gray">╭─ </Text>
        <Text color="gray">{title}</Text>
        <Text> </Text>
        <Text color="gray">{"─".repeat(dashCount)}</Text>
        {buttonObj && (
          <Box>
            <Text>──</Text>
            <Text
              color={buttonObj.dim ? "gray" : "white"}
              backgroundColor={buttonObj.dim ? undefined : "blue"}
              dimColor={buttonObj.dim}
            >
              {buttonObj.label}
            </Text>
          </Box>
        )}
        <Text color="gray">─╮</Text>
      </Box>

      <Box paddingX={1} paddingY={1}>
        {children}
      </Box>

      <Box>
        <Text color="gray">╰</Text>
        <Text color="gray">{"─".repeat(width - 2)}</Text>
        <Text color="gray">╯</Text>
      </Box>
    </Box>
  );
}