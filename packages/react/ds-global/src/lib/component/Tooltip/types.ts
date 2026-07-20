import type {
  CSSProperties,
  FocusEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from "react";
import type { UseDisclosureProps } from "../../hooks/index.js";

/**
 * The full option surface of the tooltip engine that `withTooltip` owns:
 * everything the wrapped component's tooltip accepts, including the target
 * `children` and the `Message`. Consumers use {@link WithTooltipOptions}
 * (this minus `children`/`Message`); this internal shape exists so the engine
 * and the HOC share one prop definition.
 */
export interface TooltipEngineProps extends Omit<UseDisclosureProps, "mode"> {
  /**
   * The target element to which the tooltip should be attached.
   * This can be any valid React element.
   */
  children: ReactNode;
  /**
   * The content of the tooltip. This can be a string or any valid React node.
   */
  Message: ReactNode;
  /**
   * An optional leading icon for the tooltip, rendered before the message
   * (Figma: 16px glyph, dimension-100 gap). Purely decorative.
   */
  icon?: ReactNode;
  /**
   * Force the tooltip open (or closed), overriding hover/focus. When a boolean
   * is passed the tooltip is fully controlled and ignores pointer/keyboard —
   * useful for stories, visual tests, or driving the tooltip from outside.
   * Leave undefined for the default hover behaviour.
   */
  open?: boolean;
  /** Styles applied to the tooltip area */
  style?: CSSProperties;
  /** Class name applied to the tooltip area */
  className?: string;
  /** ID applied to the target element */
  targetElementId?: string;
  /** Class name applied to the target element */
  targetElementClassName?: string;
  /** Style object applied to the target element */
  targetElementStyle?: CSSProperties;
  /** Class name applied to the tooltip/message element */
  messageElementClassName?: string;
  /** Styles applied to the tooltip/message element */
  messageElementStyle?: CSSProperties;
  /**
   * The element to which the tooltip should be attached.
   * This can be any valid React element.
   * When not provided, the tooltip will be attached to the `document.body`.
   * No default is provided at the engine signature level in order to prevent the component from failing builds in server environments, where `document` is not available.
   */
  parentElement?: HTMLElement;
}

/**
 * The tooltip options for {@link withTooltip}: everything the tooltip engine
 * accepts except the wrapped content and the message (which are supplied
 * separately). Includes `open` (force the tooltip open/closed — handy for
 * stories), `icon`, `preferredDirections`, `distance`, `autoFit`, `maxWidth`,
 * timing, etc.
 */
export type WithTooltipOptions = Omit<
  TooltipEngineProps,
  "children" | "Message"
>;

export interface TooltipProps {
  /* A unique identifier for the TooltipMessage */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children: ReactNode;
  /**
   * An optional leading icon, rendered before the text and top-aligned with the
   * first line (Figma: 16px glyph, dimension-100 gap). Pass any glyph node
   * (e.g. an `<Icon>` or inline SVG).
   */
  icon?: ReactNode;
  /* Inline styles */
  style?: CSSProperties;
  /** Whether the tooltip is open or not */
  isOpen?: boolean;
  /** Ref to the tooltip, useful for calculating its dimensions */
  ref?: RefObject<HTMLDivElement | null>;
  /** The z-index of the tooltip */
  zIndex?: number;

  onPointerEnter?: PointerEventHandler;
  onFocus?: FocusEventHandler;
}
