/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";

export type EditMode = "write" | "preview";

export type MarkdownEditorProps = {
  /* A unique identifier for the MarkdownEditor */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  /* Placeholder for the textarea */
  placeholder?: string;
  /* Default value for the textarea (Markdown content) */
  defaultValue?: string;
  /* Hide the toolbar */
  hideToolbar?: boolean;
  /* Hide the preview pane */
  hidePreview?: boolean;
  /* Controlled edit mode, leave undefined for internal control */
  editMode?: EditMode;
  /* Callback for edit mode change, needed if editMode is controlled */
  onEditModeChange?: (newEditMode: EditMode) => void;
};
