// src/components/fullscreen.tsx

import React, { ReactNode, useEffect, useState } from "react";
import { Box } from "ink";

type FullscreenProps = {
  children: ReactNode;
};

export function Fullscreen({ children }: FullscreenProps) {
  const [dimensions, setDimensions] = useState({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
      });
    };

    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  const { columns, rows } = dimensions;

  return (
    <Box
      width={columns}
      height={rows - 1}
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      <Box flexDirection="column" alignItems="center">
        {children}
      </Box>
    </Box>
  );
}