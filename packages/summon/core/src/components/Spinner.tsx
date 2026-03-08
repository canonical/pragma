/**
 * Spinner Component
 *
 * A simple loading spinner for the CLI.
 */

import { Box, Text } from "ink";
import { useEffect, useState } from "react";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface SpinnerProps {
  /** Color of the spinner */
  color?: string;
  /** Label to show next to the spinner */
  label?: string;
}

export const Spinner = ({ color = "cyan", label }: SpinnerProps) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box>
      <Text color={color}>{frames[frameIndex]}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
};
