import type { IconName } from "@canonical/ds-assets";
// The custom-link contract is shared across every link-injecting component
// (cs:react.component.link_component); sourced from ds-global so SideNavigation,
// Breadcrumbs, and Tabs use one interface. Re-exported so this module's existing
// import sites (Content/Footer/NavTree/Item, the story harness) resolve it here.
import type { LinkComponentProps } from "@canonical/react-ds-global";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { ContextSwitcherProps } from "./common/ContextSwitcher/types.js";

export type { LinkComponentProps };

/**
 * A single navigable, non-expandable row — the leaf of the content tree.
 * Renders as a link (via `LinkComponent`) when `url` is set, otherwise a
 * plain non-navigable label (the 24.04 spec §4.3). The content tree accepts links
 * and plain labels only — interactive buttons are Footer-only (a
 * `LeafFooterItem` with `control: "button"`), so a leaf carries no `onClick`
 * or toggle state of its own.
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
}

/**
 * A collapsible row that discloses its own children instead of navigating.
 * Cannot have a `url` (the 24.04 spec §4.3: "Expandable navigation items cannot
 * link to a page") and its children are always `LeafNavItem` — depth is
 * exactly one level: a child of an expandable item cannot itself expand
 * (the 24.04 spec §4.3, "Navigation items can only contain themselves as
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
 * a `NavGroup`'s siblings') direct children — the 24.04 spec §4.3: "`root.items`
 * are groups... each group's `items` are the actual navigation entries."
 */
export interface NavGroup {
  /**
   * Unique identifier for this group — required: the shared navigation tree
   * (`useNavigationTree`, WD405 `Item`) indexes every node, group tier
   * included, by `key` or `url`; a group never has a `url`, so `key` alone
   * carries its identity.
   */
  key: string;
  /** Group header text, rendered via `SideNavigation.GroupHeader`. Omitted when absent. */
  label?: string;
  /** The group's navigation entries. */
  items?: NavItem[];
}

/**
 * The WD405 root passed to `root`: itself never rendered, only its direct
 * children (`NavGroup`s) are. (The footer's data shape is `FooterRoot` —
 * a flat `FooterItem` list, no groups.)
 */
export interface NavRoot {
  /** Required — see `NavGroup.key`'s doc: every tree node needs an identity. */
  key: string;
  items?: NavGroup[];
}

/**
 * A single footer-tree leaf row. The Footer is the one place a navigation
 * row may render as a button: `control` picks between the link (the default
 * when `url` is set) and the `"button"` action row. Items are free-form —
 * `icon`/`label`/`slot` are yours to compose; the component supplies no
 * closed vocabulary or defaults. A toggle-style footer row has no dedicated
 * switch: compose it from `ItemButton` plus a `slot` (e.g. a state badge)
 * rather than a `checked`/`onCheckedChange` circuit.
 */
export interface LeafFooterItem {
  /** Display text. Required — the component supplies no default labels. */
  label: string;
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Navigable footer items render as a link when this is set. */
  url?: string;
  /** Selects the rendered row: `"link"` (default when `url` is set) or `"button"` (an action row). */
  control?: "link" | "button";
  /** `control: "button"` (the default without a `url`) — called when activated. */
  onClick?: () => void;
  /** Trailing content (e.g. an unread-count badge). */
  slot?: ReactNode;
}

/**
 * A collapsible footer row that discloses its own (always-leaf) children —
 * the footer's flavour of `ExpandableNavItem`: no `url`/`control`/`onClick`
 * (an expandable row is neither a page nor an action) and no `slot` (the
 * end slot is the disclosure caret). Depth is one level: children are
 * always `LeafFooterItem` leaves.
 */
export type ExpandableFooterItem = Omit<
  LeafFooterItem,
  "url" | "control" | "onClick" | "slot"
> & {
  /** Children revealed on expand — always `LeafFooterItem` leaves. */
  items: LeafFooterItem[];
};

/**
 * A single footer-tree entry: a leaf row (link or action) or one that
 * discloses further (leaf-only) children.
 */
export type FooterItem = LeafFooterItem | ExpandableFooterItem;

/** The footer's data root — the footer's only data surface. Its direct
 * `items` render as the footer's rows. */
export interface FooterRoot {
  key: string;
  items?: FooterItem[];
}

/**
 * Internal. `useNavigationTree` (`@canonical/react-hooks`) is generic over
 * ONE homogeneous item shape for the whole tree — it doesn't know about the
 * root/group/entry/expandable-child tiering above. This is that one shape:
 * the union of every field any tier can carry, so annotated nodes
 * (`_Item<_AnyNavNode>`) keep every field typed regardless of which tier they
 * actually came from. `NavRoot`/`NavGroup`/`NavItem` are each
 * individually assignable to it (a subset of its optional fields), so no
 * cast is needed at the `useNavigationTree` call site. Exported (like
 * `@canonical/ds-types`' underscore-prefixed `_Item`/`_Index`) only because
 * `NavTree` lives in a different module — not part of the public API.
 *
 * Carries the same key-or-url identity requirement as the shared WD405
 * `Item` (`useNavigationTree<T extends Item>`'s own bound) — every node this
 * tree annotates, group/root tiers included, is looked up by
 * `getItemId`, which needs one of the two. The fields below stay a plain
 * object type intersected with that identity union, mirroring `Item`'s own
 * `ItemFields & ItemIdentity` composition.
 */
type _AnyNavNodeFields = {
  label?: string;
  disabled?: boolean;
  icon?: IconName;
  slot?: ReactNode;
  className?: string;
  items?: _AnyNavNode[];
};

export type _AnyNavNode = _AnyNavNodeFields &
  ({ key: string; url?: undefined } | { key?: string; url: string });

type OwnProps = {
  /** Brand content (logo/wordmark) rendered in the header. */
  brand?: ReactNode;
  /** Optional application name/wordmark shown beside the brand in the header. */
  applicationName?: ReactNode;
  /**
   * Skip-link target: the `href` the visually hidden "Skip to main content"
   * link (first in the component's DOM order) points at, letting keyboard
   * users bypass the navigation block. Defaults to `"#main-content"` — the
   * conventional id for the application's `<main>` region. Set it to match
   * the app's actual main-content id; the link always renders.
   */
  skipTo?: string;
  /** Main navigation, as a root NavItem. Its direct children are rendered. */
  root?: NavRoot;
  /**
   * The footer's items — the footer's ONLY data surface: free-form
   * leaves (`LeafFooterItem`, buttons via `control`/`onClick`) and depth-1
   * expandables (`ExpandableFooterItem`), rendered as the footer's rows in
   * the order given. Omit (or pass an empty list) to hide the footer.
   */
  footerRoot?: FooterRoot;

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
  /**
   * Reserved. Binds the Ctrl+B rail-collapse shortcut when `true`. Defaults
   * to `false` — **pending approval**: the key is not ratified yet, so the
   * shortcut ships off until a consumer (or design) opts in explicitly.
   * No story enables it.
   */
  keyboardShortcut?: boolean;
  /**
   * The context-switcher region's props (typed slot) — rendered
   * as its own region between the Header and Content, in a plain `<div>`
   * (a `role="menu"` select-like widget is not navigation, so it sits
   * outside the `<nav>` landmark). Omitted renders no region. See
   * `ContextSwitcherProps`.
   */
  contextSwitcher?: ContextSwitcherProps;
};

/**
 * SideNavigation's root is a plain `<div>` layout container — Header, the
 * optional ContextSwitcher region, the `<nav>` landmark (rendered by
 * `Content`), and Footer. The navigation landmark belongs to `Content`
 * alone (branding, the context switcher, and the footer's actions are not
 * navigation); `aria-label` is forwarded there and defaults to
 * `"Main navigation"`. Native attribute pass-through follows the root
 * element (`ComponentProps<"div">`).
 *
 * Consumption pattern: data-driven only — pass props and all four regions
 * build. Every subcomponent is private
 * (`cs:react.component.subcomponent_export_api`): nothing is dot-static
 * exported, and subcomponents render exclusively from data.
 */
export type SideNavigationProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
