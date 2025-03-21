/* @canonical/generator-ds 0.8.0-experimental.0 */
import type React from "react";
import type { JSX } from "react";

export interface EditingContextType {
  isEditing: boolean;
  toggleEditing: () => void;
}

export type EditElementProps = EditingContextType;

export type EditElement<T extends EditElementProps> = (
  props: T,
) => React.ReactNode;

export interface EditableBlockProps<T extends EditElementProps> {
  /** Unique identifier for the editable block */
  id?: string;
  /** Component to render when in edit mode, must implement EditElement interface */
  EditComponent: EditElement<T>;
  /** CSS class name for additional styling */
  className?: string;
  /** Inline CSS styles to apply to the component */
  style?: React.CSSProperties;
  /** Title text for the editable block */
  title?: string;
  /** HTML element type to render as the title component (e.g., 'div', 'section') */
  tag?: keyof JSX.IntrinsicElements;

  /** Whether the block is read-only */
  readonly?: boolean;
}

export default EditableBlockProps;
