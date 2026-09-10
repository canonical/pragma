import type { ContextSwitcherItem } from "../../lib/SideNavigation/common/ContextSwitcher/types.js";
import { createHelpItem } from "../../lib/SideNavigation/helpItem.js";
import type {
  FooterRoot,
  LeafNavItem,
  NavRoot,
} from "../../lib/SideNavigation/types.js";
import { MockBadge } from "./story-utils.js";

/**
 * Story fixtures for SideNavigation. Story-only (this folder is excluded from
 * the package build); tests define their own minimal fixtures inline.
 *
 * Each fixture is a `NavRoot`: the root node itself is not rendered. Its
 * direct children are **groups** (`NavGroup` — a label renders as
 * SideNavigation.GroupHeader; no label → no header). A group's own children
 * are the navigable leaves (`NavItem`, i.e. `url`-bearing `LeafNavItem`) —
 * these may carry a leading `icon` and a trailing `slot` (e.g. a badge).
 *
 * The MAAS and LXD trees mirror the real left-hand navigation of those
 * Canonical apps, to give stories a realistic information architecture.
 */

/** A count badge used in fixtures via a leaf's `slot`. */
const badge = (value: number | string): LeafNavItem["slot"] => (
  <MockBadge>{value}</MockBadge>
);

// --- MAAS (Metal as a Service) -------------------------------------------
// Mirrors maas-ui's grouped sidebar. Internal route paths; a real deployment
// serves these under a base prefix (e.g. /MAAS/r/...).

/** MAAS main navigation — grouped hardware/KVM/organisation/config/networking. */
export const maasContentRoot: NavRoot = {
  key: "maas-content-root",
  items: [
    {
      key: "hardware",
      label: "Hardware",
      items: [
        {
          url: "/machines",
          label: "Machines",
          icon: "machines",
          slot: badge(42),
        },
        { url: "/devices", label: "Devices", icon: "units" },
        { url: "/controllers", label: "Controllers", icon: "controllers" },
      ],
    },
    {
      key: "kvm",
      label: "KVM",
      items: [
        { url: "/kvm/lxd", label: "LXD", icon: "containers" },
        { url: "/kvm/virsh", label: "Virsh", icon: "pods" },
      ],
    },
    {
      key: "organisation",
      label: "Organisation",
      items: [
        { url: "/tags", label: "Tags", icon: "tag" },
        { url: "/zones", label: "AZs", icon: "cluster-host" },
        { url: "/pools", label: "Pools", icon: "pods" },
      ],
    },
    {
      key: "configuration",
      label: "Configuration",
      items: [{ url: "/images", label: "Images", icon: "image" }],
    },
    {
      key: "networking",
      label: "Networking",
      items: [
        { url: "/networks", label: "Networks", icon: "connected" },
        { url: "/domains", label: "DNS", icon: "code" },
        {
          url: "/network-discovery",
          label: "Network discovery",
          icon: "search",
          slot: badge("new"),
        },
      ],
    },
    // The mandatory collapsible "Help" item, with an external link to legal
    // information (SPEC.md §1.1) — an unlabelled trailing group, the common
    // placement for it.
    { key: "help-group", items: [createHelpItem("/legal")] },
  ],
};

/**
 * MAAS footer — admin settings and the logged-in user. Flat
 * `FooterRoot`: the "Log out" row demonstrates the Footer-only button
 * vocabulary flowing through data (`control`/`onClick`).
 */
export const maasFooterRoot: FooterRoot = {
  key: "maas-footer-root",
  items: [
    { url: "/settings", label: "Settings", icon: "settings" },
    { url: "/account/prefs", label: "Ada Lovelace", icon: "user" },
    { label: "Log out", icon: "log-out", control: "button" },
  ],
};

// --- LXD UI --------------------------------------------------------------
// Mirrors lxd-ui's project-scoped sidebar (default project).

/** LXD main navigation — project-scoped, default project. */
export const lxdContentRoot: NavRoot = {
  key: "lxd-content-root",
  items: [
    {
      key: "lxd-primary",
      items: [
        {
          url: "/ui/project/default/instances",
          label: "Instances",
          icon: "containers",
        },
        {
          url: "/ui/project/default/profiles",
          label: "Profiles",
          icon: "profiles",
        },
      ],
    },
    {
      key: "networking",
      label: "Networking",
      items: [
        {
          url: "/ui/project/default/networks",
          label: "Networks",
          icon: "connected",
        },
        {
          url: "/ui/project/default/network-acls",
          label: "ACLs",
          icon: "locked",
        },
        {
          url: "/ui/project/default/network-ipam",
          label: "IPAM",
          icon: "code",
        },
      ],
    },
    {
      key: "storage",
      label: "Storage",
      items: [
        {
          url: "/ui/project/default/storage/pools",
          label: "Pools",
          icon: "pods",
        },
        {
          url: "/ui/project/default/storage/volumes",
          label: "Volumes",
          icon: "bundle",
        },
        {
          url: "/ui/project/default/storage/buckets",
          label: "Buckets",
          icon: "archive",
        },
      ],
    },
    {
      key: "lxd-server",
      label: "Server",
      items: [
        { url: "/ui/server", label: "Server", icon: "cluster-host" },
        { url: "/ui/operations", label: "Operations", icon: "status" },
        {
          url: "/ui/warnings?status=new",
          label: "Warnings",
          icon: "warning",
          slot: badge(3),
        },
        { url: "/ui/settings", label: "Settings", icon: "settings" },
      ],
    },
    // The mandatory collapsible "Help" item, with an external link to legal
    // information (SPEC.md §1.1) — an unlabelled trailing group.
    {
      key: "help-group",
      items: [createHelpItem("/legal")],
    },
  ],
};

/** LXD footer — user label, docs link, and action buttons. */
export const lxdFooterRoot: FooterRoot = {
  key: "lxd-footer-root",
  items: [
    { label: "admin", icon: "user" },
    {
      url: "https://documentation.ubuntu.com/lxd/",
      label: "Documentation",
      icon: "book",
    },
    { label: "Report a bug", icon: "bug", control: "button" },
    { label: "Log out", icon: "log-out", control: "button" },
  ],
};

// --- Context switcher (the "with ContextSwitcher" story) ------------------

/**
 * A content root exercising every content-row shape neither MAAS nor LXD's
 * own fixtures carry, in one group list:
 *
 * - A plain-label row (non-navigable — no `url`).
 * - A practical `ItemExpandable` whose children are **url links** (external
 *   documentation resources).
 * - A second `ItemExpandable` whose children are **plain labels** (a
 *   non-navigable appearance/theme picker — no pages of their own),
 *   showcasing both disclosure flavors side by side.
 */
export const contextSwitcherContentRoot: NavRoot = {
  key: "context-switcher-content-root",
  items: [
    {
      key: "workspace",
      label: "Workspace",
      items: [
        { url: "/overview", label: "Overview", icon: "status" },
        { url: "/maintenance", label: "Maintenance window", icon: "warning" },
      ],
    },
    {
      key: "resources",
      label: "Documentation",
      items: [
        {
          url: "/documentation",
          label: "Documentation",
          icon: "book",
        },
        {
          url: "/server/docs",
          label: "Server guide",
          icon: "profiles",
        },
        {
          url: "/community",
          label: "Community",
          icon: "comments",
        },
      ],
    },
    {
      key: "legal",
      label: "Legal",
      items: [
        {
          key: "policies",
          label: "Policies",
          icon: "clipboard-list",
          items: [
            { url: "/legal/privacy", label: "Privacy Policy", icon: "locked" },
            { url: "/legal/terms", label: "Terms of Service", icon: "file" },
            {
              url: "/legal/cookie",
              label: "Cookie Policy",
              icon: "information",
            },
          ],
        },
      ],
    },
  ],
};

// --- Context switcher (the "with ContextSwitcher" story) ------------------
// Exercises the footer's full row vocabulary through `footerRoot` data:
// plain links, depth-1 `ExpandableFooterItem` disclosures, and the
// Footer-only button rows (`control: "button"`).

/**
 * A footer exercising every footer-row shape: a plain link, a depth-1
 * `ExpandableFooterItem` (plain-label "theme" options — no pages of their
 * own), and the Footer-only button row (`control: "button"`).
 */
export const contextSwitcherFooterRoot: FooterRoot = {
  key: "context-switcher-footer-root",
  items: [
    { url: "/account", label: "Ada Lovelace", icon: "user" },
    {
      label: "Theme",
      icon: "dark-theme",
      items: [
        { label: "Light", icon: "light-theme" },
        { label: "Dark", icon: "dark-theme" },
        { label: "System", icon: "system-theme" },
      ],
    },
    { label: "Log out", icon: "log-out", control: "button" },
  ],
};

// --- Context fixtures (SPEC.md §4.5) --------------------------------------

/**
 * LXD's project switcher — the spec's own example. url-bearing contexts:
 * selecting one fires `onContextChange` with the `url` aboard, and the
 * consumer routes with their own router wrapper (that callback is the
 * custom router adapter — the menu's APG constraint means every row is a
 * `<div role="menuitem">`, so there is no render target for a
 * `LinkComponent` inside the popup).
 */
export const lxdProjectContexts: ContextSwitcherItem[] = [
  {
    key: "default",
    name: "default",
    url: "/ui/project/default/instances",
    description: "The default project",
  },
  {
    key: "staging",
    name: "staging",
    url: "/ui/project/staging/instances",
    description: "Pre-production environment",
    badge: 2,
  },
  {
    key: "sandbox",
    name: "sandbox",
    url: "/ui/project/sandbox/instances",
  },
];

// --- Generic fixtures (edge cases) ---------------------------------------

/**
 * Minimal fixture — a single unlabelled level-1 group of leaves (no header).
 * Visually flat; useful for base rendering without group headers.
 */
export const flatRoot: NavRoot = {
  key: "flat-root",
  items: [
    {
      key: "flat-group",
      items: [
        { url: "/one", label: "One", icon: "home" },
        { url: "/two", label: "Two", icon: "book", slot: badge(7) },
        { url: "/three", label: "Three", icon: "tag" },
      ],
    },
  ],
};

/** Fixture exercising a disabled leaf. */
export const withDisabledRoot: NavRoot = {
  key: "disabled-root",
  items: [
    {
      key: "disabled-group",
      label: "States",
      items: [
        { url: "/available", label: "Available", icon: "checkmark" },
        {
          url: "/unavailable",
          label: "Unavailable",
          icon: "close",
          disabled: true,
        },
      ],
    },
  ],
};

/** Empty fixture — root with no children. Useful for empty-state rendering. */
export const emptyRoot: NavRoot = {
  key: "empty-root",
  items: [],
};
