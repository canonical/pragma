import type { IconName } from "@canonical/ds-assets";
// Shared custom-link contract for every link-injecting component
// (cs:react.component.link_component); re-exported for this module's import sites.
import type { LinkComponentProps } from "@canonical/react-ds-global";
import type {
  ComponentProps,
  ComponentType,
  ReactElement,
  ReactNode,
} from "react";
import type { ContextSwitcherProps } from "./common/ContextSwitcher/types.js";

export type { LinkComponentProps };

/**
 * A single navigable, non-expandable row — the leaf of the content tree.
 * Renders as a link (via `LinkComponent`) when `url` is set, otherwise a
 * plain non-navigable label. The content tree carries links and labels
 * only — interactive rows are Footer-only, so a leaf has no `onClick`
 * (the 24.04 spec §4.3).
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
 * Cannot have a `url` (the 24.04 spec §4.3) and depth is exactly one
 * level — children are always `LeafNavItem` and cannot themselves expand.
 * No `slot` either: the end slot is always the disclosure caret.
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
 * A named collection of `NavItem` entries with an optional header
 * (`SideNavigation.GroupHeader`) — the shape of `root`'s direct children
 * (the 24.04 spec §4.3).
 */
export interface NavGroup {
  /**
   * Required identity: the shared navigation tree (`useNavigationTree`)
   * indexes every node by `key` or `url`, and a group never has a `url`.
   */
  key: string;
  /** Group header text, rendered via `SideNavigation.GroupHeader`. Omitted when absent. */
  label?: string;
  /** The group's navigation entries. */
  items?: NavItem[];
}

/**
 * The root passed to `root`: itself never rendered, only its `NavGroup`
 * children are. (The footer's data shape is `FooterRoot` — a flat
 * `FooterItem` list, no groups.)
 */
export interface NavRoot {
  /** Required — see `NavGroup.key`: every tree node needs an identity. */
  key: string;
  items?: NavGroup[];
}

/**
 * A single footer-tree leaf row. The Footer is the one place a navigation
 * row may render as a button: `control` picks between the link (default
 * when `url` is set) and the `"button"` action row. Items are free-form —
 * the component supplies no closed vocabulary or defaults. A toggle-style
 * row composes `ItemButton` plus a `slot` (e.g. a state badge) rather than
 * a `checked`/`onCheckedChange` circuit.
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
 * end slot is the caret). Depth is one level.
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
 * one homogeneous item shape for the whole tree — this is that shape: the
 * union of every field any tier can carry, so `NavRoot`/`NavGroup`/`NavItem`
 * all assign to it without casts at the call site. Carries the same
 * key-or-url identity requirement as the WD405 `Item` (`getItemId` looks
 * every node up by one of the two). Exported only because `NavTree` lives
 * in a different module — not part of the public API.
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
   * link points at, letting keyboard users bypass the navigation block.
   * Defaults to `"#main-content"`; set it to the app's actual main-content
   * id. The link always renders.
   */
  skipTo?: string;
  /** Main navigation, as a root NavItem. Its direct children are rendered. */
  root?: NavRoot;
  /**
   * The footer's only data surface: free-form leaves (`LeafFooterItem`) and
   * depth-1 expandables (`ExpandableFooterItem`), rendered as the footer's
   * rows in the order given. Omit (or pass empty) to hide the footer.
   */
  footerRoot?: FooterRoot;

  /**
   * Component used to render navigable items (those with a `url`). Receives
   * `LinkComponentProps`. Defaults to `"a"`; pass a router `Link` to
   * integrate with client-side navigation.
   */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /**
   * Live current location, used to resolve which item is active (marked
   * `aria-current`, ancestors expanded). Keep it in sync with the
   * consumer's router so the active state updates on navigation.
   */
  currentUrl?: string;
  /** Initial expanded (rail) state when uncontrolled. Defaults to `true`. */
  defaultExpanded?: boolean;
  /**
   * Binds the Ctrl+B rail-collapse shortcut. Defaults to `true`;
   * pass `false` to opt out.
   */
  keyboardShortcut?: boolean;
  /**
   * The context-switcher region's props (typed slot), rendered as its own
   * region between the Header and Content in a plain `<div>` — a
   * `role="menu"` select-like widget is not navigation, so it sits outside
   * the `<nav>` landmark. Omitted renders no region. See
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

/**
 * SideNavigation component type. No subcomponents are attached — all are
 * private and render only from data.
 */
export type SideNavigationComponent = (
  props: SideNavigationProps,
) => ReactElement;
