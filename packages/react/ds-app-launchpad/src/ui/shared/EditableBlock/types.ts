/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from 'react'

export interface EditableBlockProps {
  /* A unique identifier for the EditableBlock */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  title: string;
}

export interface EditingContextType {
  isEditing: boolean;
  toggleEditing: () => void;
}

export default EditableBlockProps
