/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { FocusEventHandler, PointerEventHandler } from "react";
import type { RefObject } from "react";

export interface TooltipTriggerProps<
  TElement extends HTMLElement = HTMLElement,
> {
  /* A unique identifier for the TooltipTrigger */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;

  ref: RefObject<HTMLDivElement | null>;
  messageId: string;
  isOpen: boolean;

  onFocus?: FocusEventHandler<TElement>;
  onBlur?: FocusEventHandler<TElement>;
  onPointerEnter?: PointerEventHandler<TElement>;
  onPointerLeave?: PointerEventHandler<TElement>;
}
