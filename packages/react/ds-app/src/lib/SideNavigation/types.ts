import type { IconName } from "@canonical/ds-assets";
// The custom-link contract is shared across every link-injecting component
// (cs:react.component.link_component); sourced from ds-global so SideNavigation,
// Breadcrumbs, and Tabs use one interface. Re-exported so this module's existing
// import sites (Content/Footer/NavTree/Item, the story harness) resolve it here.
import type { LinkComponentProps } from "@canonical/react-ds-global";
import type {
  ComponentProps,
  ComponentType,
  ReactElement,
  ReactNode,
} from "react";
import type { CollapseToggleProps } from "./common/CollapseToggle/types.js";
import type { ContentProps } from "./common/Content/types.js";
import type { FooterProps } from "./common/Footer/types.js";
import type { GroupProps } from "./common/Group/types.js";
import type { GroupHeaderProps } from "./common/GroupHeader/types.js";
import type { HeaderProps } from "./common/Header/types.js";
import type { ItemProps } from "./common/Item/types.js";
import type { ItemExpandableProps } from "./common/ItemExpandable/types.js";
import type { SeparatorProps } from "./common/Separator/types.js";

export type { LinkComponentProps };

/**
 * A single navigable, non-expandable row — the leaf of the content tree.
 * Renders as a link (via `LinkComponent`) when `url` is set, otherwise a
 * plain non-navigable label (SPEC.md §4.3).
 */
export interface LeafNavItem {
  /** Unique identifier when no `url` is present (e.g. a non-navigable label). */
  key?: string;
  /** Navigation target. Renders as a link via `LinkComponent`; omitted (or absent) renders a plain label. */
  url?: string;
  /** Display text. Text only, matching the base WD405 `Item` contract — not JSX. */
  label?: string;
  /** Whether the item is interactive. A disabled item's `url` is not rendered as a link. */
  disabled?: boolean;
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Trailing content (end slot): a badge, count, etc. */
  slot?: ReactNode;
  /** CSS class name applied to this item's row, in addition to the base classes. */
  className?: string;
};

/**
 * A collapsible row that discloses its own children instead of navigating.
 * Cannot have a `url` (SPEC.md §4.3: "Expandable navigation items cannot
 * link to a page") and its children are always `LeafNavItem` — depth is
 * exactly one level: a child of an expandable item cannot itself expand
 * (SPEC.md §4.3, "Navigation items can only contain themselves as
 * children... if a navigation item is already a child it can not contain
 * children itself"). No `slot` either — the end slot is always the
 * disclosure caret for an expandable row; there is nowhere for a badge to
 * render.
 */
export type ExpandableNavItem = Omit<LeafNavItem, "url" | "slot"> & {
  /** Children revealed on expand. Always leaves — see the depth-1 note above. */
  items: LeafNavItem[];
};

/**
 * A single content-tree entry: either a plain/navigable row or one that
 * discloses further (leaf-only) children.
 */
export type NavItem = LeafNavItem | ExpandableNavItem;

/**
 * A named collection of `NavItem` entries, with an optional header
 * (`SideNavigation.GroupHeader`). This is the shape of each of `root`'s (or
 * a `NavGroup`'s siblings') direct children — SPEC.md §4.3: "`root.items`
 * are groups... each group's `items` are the actual navigation entries."
 */
export interface NavGroup {
  /** Unique identifier for this group (e.g. for React reconciliation when unlabelled). */
  key?: string;
  /** Group header text, rendered via `SideNavigation.GroupHeader`. Omitted when absent. */
  label?: string;
  /** The group's navigation entries. */
  items?: NavItem[];
}

/**
 * A plain rule between content sections — a sibling of `NavGroup` among
 * `root.items`, rendering as `SideNavigation.Separator` instead of a group.
 */
export interface NavSeparator {
  key?: string;
  separator: true;
}

/**
 * The WD405 root passed to `root`/`footerRoot`: itself never rendered, only
 * its direct children (`NavGroup | NavSeparator`) are.
 */
export interface NavRoot {
  key?: string;
  items?: (NavGroup | NavSeparator)[];
}

/**
 * Internal. `useNavigationTree` (`@canonical/react-hooks`) is generic over
 * ONE homogeneous item shape for the whole tree — it doesn't know about the
 * root/group/entry/expandable-child tiering above. This is that one shape:
 * the union of every field any tier can carry, so annotated nodes
 * (`_Item<_AnyNavNode>`) keep every field typed regardless of which tier they
 * actually came from. `NavRoot`/`NavGroup`/`NavItem`/`NavSeparator` are each
 * individually assignable to it (a subset of its optional fields), so no
 * cast is needed at the `useNavigationTree` call site. Exported (like
 * `@canonical/ds-types`' underscore-prefixed `_Item`/`_Index`) only because
 * `NavTree` lives in a different module — not part of the public API.
 */
export interface _AnyNavNode {
  key?: string;
  url?: string;
  label?: string;
  disabled?: boolean;
  icon?: IconName;
  slot?: ReactNode;
  className?: string;
  separator?: true;
  items?: _AnyNavNode[];
}

type OwnProps = {
  /** Brand content (logo/wordmark) rendered in the header. */
  brand?: ReactNode;
  /** Optional application name/wordmark shown beside the brand in the header. */
  applicationName?: ReactNode;
  /** Main navigation, as a root NavItem. Its direct children are rendered. */
  root?: NavRoot;
  /** Footer navigation, as a root NavItem. Pinned to the bottom. */
  footerRoot?: NavRoot;
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
};

/**
 * SideNavigation renders a self-contained `<nav>` landmark (SPEC.md §1, §6);
 * `aria-label` defaults to `"Main navigation"` and can be overridden via the
 * inherited `ComponentProps<"nav">` surface, same as every other native
 * attribute (`id`, `data-*`, `style`, …).
 */
export type SideNavigationProps = OwnProps &
  Omit<ComponentProps<"nav">, keyof OwnProps>;

/**
 * SideNavigation component type with its attached public subcomponents
 * (`cs:react.component.subcomponent_export_api` — dot notation, one level).
 */
export type SideNavigationComponent = ((
  props: SideNavigationProps,
) => ReactElement) & {
  CollapseToggle: (props: CollapseToggleProps) => ReactElement;
  Content: (props: ContentProps) => ReactElement;
  Footer: (props: FooterProps) => ReactElement;
  Group: (props: GroupProps) => ReactElement;
  GroupHeader: (props: GroupHeaderProps) => ReactElement;
  Header: (props: HeaderProps) => ReactElement;
  Item: (props: ItemProps) => ReactElement;
  ItemExpandable: (props: ItemExpandableProps) => ReactElement;
  Separator: (props: SeparatorProps) => ReactElement;
};
