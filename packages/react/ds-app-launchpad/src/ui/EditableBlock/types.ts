/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";

export interface EditingContextType {
  isEditing: boolean;
  toggleEditing: () => void;
}

export type EditElementProps = EditingContextType;

export type EditElement<T extends EditElementProps> = (
  props: T,
) => React.ReactNode;

export interface EditableBlockProps<T extends EditElementProps> {
  id?: string;
  EditComponent: EditElement<T>;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export default EditableBlockProps;
