/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export interface FolderProps {
  /* A unique identifier for the Folder */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;

  /* Folder name */
  name: string;

  /* Whether the folder is expanded by default */
  defaultOpen?: boolean;
}
