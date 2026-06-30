/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { JSX } from "react";

export interface LabelMessages {
  /* The optional message, shown after the label in the "optional" indicator
   * mode (rendered as " (<optional>)"). */
  optional: () => string;
}

/**
 * How a field's required/optional state is signalled in the label:
 *  - "required" (default): a marker (default "*") is shown BEFORE the label of
 *    required fields, so the user scans for the marked ones.
 *  - "optional": " (optional)" is shown AFTER the label of optional fields, so
 *    the user scans for the unmarked (required) ones.
 * The two are mutually exclusive conventions — pick one per form.
 */
export type RequiredIndicator = "required" | "optional";

export interface LabelProps {
  /* A unique identifier for the Label */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  /* The name of input labelled */
  name: string;
  /* Should reference the ID of the input */
  htmlFor?: string;
  /* Is the field optional */
  isOptional?: boolean;
  /* Which convention marks required/optional fields. Default: "required". */
  requiredIndicator?: RequiredIndicator;
  /* Custom messages */
  messages?: LabelMessages;
  /* The element to render as */
  tag?: keyof JSX.IntrinsicElements;
}
