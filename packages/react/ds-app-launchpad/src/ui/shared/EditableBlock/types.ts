/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from 'react'

export interface EditableBlockProps {
  id?: string;
  children: React.ReactNode | ((props: { isEditing: boolean, toggleEditing: () => void }) => React.ReactNode);
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export interface EditingContextType {
  isEditing: boolean;
  toggleEditing: () => void;
}

export default EditableBlockProps
