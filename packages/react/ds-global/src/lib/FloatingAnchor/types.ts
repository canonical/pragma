import type { CSSProperties, ReactNode } from "react";
import type { UsePopupProps } from "../hooks/index.js";

export interface FloatingAnchorProps extends UsePopupProps {
  /**
   * The anchor/target element that the floating content is positioned relative to.
   */
  children: ReactNode;
  /**
   * The floating content rendered in a portal.
   * For full control over the rendered element, use `renderContent` instead.
   */
  content?: ReactNode;
  /**
   * Render prop for full control over the floating element.
   * When provided, `content` is ignored.
   */
  renderContent?: (props: FloatingAnchorRenderContentProps) => ReactNode;
  /** Styles applied to the root wrapper element */
  style?: CSSProperties;
  /** Class name applied to the root wrapper element */
  className?: string;
  /** ID applied to the target/anchor element */
  targetElementId?: string;
  /** Class name applied to the target/anchor element */
  targetElementClassName?: string;
  /** Style object applied to the target/anchor element */
  targetElementStyle?: CSSProperties;
  /** Class name applied to the floating content wrapper */
  contentClassName?: string;
  /** Styles applied to the floating content wrapper */
  contentStyle?: CSSProperties;
  /**
   * The element the floating content is portalled into.
   * Defaults to `document.body` on the client.
   */
  parentElement?: HTMLElement;
  /**
   * ARIA relationship between the anchor and the floating content.
   * - `"describedby"` — for tooltips (`aria-describedby`)
   * - `"controls"` — for popovers/menus (`aria-controls` + `aria-expanded`)
   * - `"none"` — no ARIA attributes are set automatically
   * Defaults to `"describedby"`.
   */
  ariaRelationship?: "describedby" | "controls" | "none";
}

export interface FloatingAnchorRenderContentProps {
  /** Ref to attach to the floating content root element */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Unique ID for the floating element */
  id: string;
  /** Whether the floating content is open */
  isOpen: boolean;
  /** Positioning styles to apply to the floating element */
  style: CSSProperties;
  /** The computed best position direction and metadata */
  bestPosition?: import("../hooks/index.js").BestPosition;
  /** Pointer-enter handler — forward to the floating element to keep it open while hovered */
  onPointerEnter: React.PointerEventHandler;
  /** Focus handler — forward to the floating element to keep it open while focused */
  onFocus: React.FocusEventHandler;
}
