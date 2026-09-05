import type { ComponentProps, ComponentType } from "react";
import type { LinkComponentProps, SecondaryNavRoot } from "../../types.js";

type OwnProps = {
  /** The secondary navigation's title — rendered in its header and, by default, its `aria-label`. */
  title?: string;
  /** Root whose direct children render as groups (and separators). Entries may not have an icon or be expandable (SPEC.md §1.3, §4.2). */
  root?: SecondaryNavRoot;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
};

/**
 * SideNavigation.Secondary renders its own `<nav>` landmark, a sibling of
 * the primary `SideNavigation` — not a child of it (SPEC.md §1.3). Cannot
 * collapse.
 */
export type SecondaryProps = OwnProps &
  Omit<ComponentProps<"nav">, keyof OwnProps>;
