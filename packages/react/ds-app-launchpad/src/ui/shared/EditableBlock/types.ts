/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";

export type EditElement = (props: {
  isEditing: boolean;
  toggleEditing: () => void;
}) => React.ReactNode;

export interface EditableBlockProps {
  id?: string;
  EditComponent: EditElement;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export interface EditingContextType {
  isEditing: boolean;
  toggleEditing: () => void;
}

export default EditableBlockProps;
