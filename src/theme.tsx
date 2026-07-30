// src/theme.tsx

import React, { createContext, useContext, ReactNode } from "react";

export type ThemeMode = "auto" | "light" | "dark";

export type Theme = {
  mode: ThemeMode;
  primary: string;
  gray: string;
  dark: string;
  background: string;
  dimSecondary: boolean;
  inverseButton: boolean;
};

type ThemeContextType = {
  theme: Theme;
  mode: ThemeMode;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getThemeForMode(mode: ThemeMode): Theme {
  if (mode === "dark") {
    return {
      mode,
      primary: "#ffffff",
      gray: "#888888",
      dark: "#18181b",
      background: "#0a0a0a",
      dimSecondary: true,
      inverseButton: false,
    };
  }

  if (mode === "light") {
    return {
      mode,
      primary: "#000000",
      gray: "#666666",
      dark: "#f4f4f5",
      background: "#ffffff",
      dimSecondary: false,
      inverseButton: false,
    };
  }

  // auto - couleurs par défaut du terminal
  return {
    mode,
    primary: "#ffffff",
    gray: "#888888",
    dark: "#18181b",
    background: "#0a0a0a",
    dimSecondary: true,
    inverseButton: false,
  };
}

export function ThemeProvider({ children, mode: initialMode = "auto" }: { 
  children: ReactNode;
  mode?: ThemeMode;
}) {
  const theme = getThemeForMode(initialMode);

  return (
    <ThemeContext.Provider value={{ theme, mode: initialMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context.theme;
}