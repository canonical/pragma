import type { Item } from "@canonical/ds-types";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

/**
 * Props passed to a custom link component (router integration).
 * Mirrors the contract used by Breadcrumbs so the same router `Link` works for
 * both. Defaults to the intrinsic `"a"` element when not provided.
 */
export interface LinkComponentProps {
  href?: string;
  className?: string;
  children?: ReactNode;
  "aria-current"?: HTMLAttributes<HTMLElement>["aria-current"];
}

export interface SideNavigationProps extends HTMLAttributes<HTMLDivElement> {
  /** Brand content (logo/wordmark) rendered in the header. */
  brand?: ReactNode;
  /** Main navigation, as a WD405 root Item. Its direct children are rendered. */
  root?: Item;
  /** Footer navigation, as a WD405 root Item. Pinned to the bottom. */
  footerRoot?: Item;
  /**
   * Component used to render navigable items (those with a `url`). Receives
   * `LinkComponentProps`. Defaults to `"a"`. Pass a router `Link` (e.g.
   * `@canonical/router-react`) to integrate with client-side navigation.
   */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /**
   * Live current location, used to resolve which item is active. The matching
   * item is marked `aria-current` and its ancestor groups expanded. Keep it in
   * sync with the consumer's router (e.g. `useRoute().pathname`) so the active
   * state updates on navigation.
   */
  currentUrl?: string;
  /** Initial expanded (rail) state when uncontrolled. Defaults to `true`. */
  defaultExpanded?: boolean;
}
