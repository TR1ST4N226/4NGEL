// src/components/logo.tsx

import React, { useEffect, useState } from "react";
import { Text } from "ink";

const LOGO_ASCII = String.raw`
____________/\\\_____/\\\\\_____/\\\_____/\\\\\\\\\\\\__/\\\\\\\\\\\\\\\__/\\\_____________        
 __________/\\\\\____\/\\\\\\___\/\\\___/\\\//////////__\/\\\///////////__\/\\\_____________       
  ________/\\\/\\\____\/\\\/\\\__\/\\\__/\\\_____________\/\\\_____________\/\\\_____________      
   ______/\\\/\/\\\____\/\\\//\\\_\/\\\_\/\\\____/\\\\\\\_\/\\\\\\\\\\\_____\/\\\_____________     
    ____/\\\/__\/\\\____\/\\\\//\\\\/\\\_\/\\\___\/////\\\_\/\\\///////______\/\\\_____________    
     __/\\\\\\\\\\\\\\\\_\/\\\_\//\\\/\\\_\/\\\_______\/\\\_\/\\\_____________\/\\\_____________   
      _\///////////\\\//__\/\\\__\//\\\\\\_\/\\\_______\/\\\_\/\\\_____________\/\\\_____________  
       ___________\/\\\____\/\\\___\//\\\\\_\//\\\\\\\\\\\\/__\/\\\\\\\\\\\\\\\_\/\\\\\\\\\\\\\\\_ 
        ___________\///_____\///_____\/////___\////////////____\///////////////__\///////////////__
`;

const LOGO_LINES = LOGO_ASCII.split("\n");
const LOGO_WIDTH = Math.max(...LOGO_LINES.map((line) => line.length));
const ANIMATION_STEPS = 30;
const ANIMATION_INTERVAL_MS = 30;

export function Logo() {
  const [revealedColumns, setRevealedColumns] = useState(0);

  useEffect(() => {
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setRevealedColumns(Math.ceil((LOGO_WIDTH * step) / ANIMATION_STEPS));

      if (step === ANIMATION_STEPS) {
        clearInterval(timer);
      }
    }, ANIMATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const visibleLogo = revealedColumns >= LOGO_WIDTH
    ? LOGO_ASCII
    : LOGO_LINES
      .map((line) => [...line].map((character, column) =>
        column < revealedColumns ? character : " "
      ).join(""))
      .join("\n");

  return (
    <Text color="white" bold>
      {visibleLogo}
    </Text>
  );
}