import type { Icon, LinkComponent } from "@canonical/react-ds-global";
import type { ComponentProps } from "react";

/**
 * Props of one page control of the bar.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * whose root is a link or a button by what the collection can reach, not
 * forwarding a caller's native props.
 */
export type PageControlProps = {
  /** The page it leads to, named for the reader ("Next page"). */
  readonly label: string;
  /** The design system's icon that draws the direction. */
  readonly icon: ComponentProps<typeof Icon>["icon"];
  /** The control's own class, which places it in the bar. */
  readonly className: string;
  /**
   * The destination's spelling, or null where the provider has no
   * location and so no destination a link could lead to.
   */
  readonly destination: URLSearchParams | null;
  /** Whether the page can be reached at all from here. */
  readonly reachable: boolean;
  /** Move the window there, as the enhancement does in place of navigating. */
  readonly onNavigate: () => void;
  /** The consumer's router link, or the intrinsic anchor. */
  readonly LinkComponent: LinkComponent;
};
