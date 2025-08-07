import type React from "react";

export interface SidePanelProps {
  /* A unique identifier for the SidePanel */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
}
