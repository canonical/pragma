import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Child elements */
  children: ReactNode;
  /**
   * An optional leading icon, rendered before the text and top-aligned with the
   * first line (Figma: 16px glyph, dimension-100 gap). Pass any glyph node
   * (e.g. an `<Icon>` or inline SVG).
   */
  icon?: ReactNode;
  /** Whether the tooltip is open or not */
  isOpen?: boolean;
  /** The z-index of the tooltip */
  zIndex?: number;
};

/**
 * Props for the Tooltip message element, extending the native props of its
 * `<div>` root — so `id`, `className`, `style`, `ref`, and native handlers such
 * as `onPointerEnter`/`onFocus` are all forwarded to the DOM node.
 */
export type TooltipProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
