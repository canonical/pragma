import { fn } from "storybook/test";
import { createHelpItem } from "../../lib/SideNavigation/helpItem.js";
import type { LeafNavItem, NavRoot } from "../../lib/SideNavigation/types.js";
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
      separator: true,
      items: [
        { url: "/kvm/lxd", label: "LXD", icon: "containers" },
        { url: "/kvm/virsh", label: "Virsh", icon: "pods" },
      ],
    },
    {
      key: "organisation",
      label: "Organisation",
      separator: true,
      items: [
        { url: "/tags", label: "Tags", icon: "tag" },
        { url: "/zones", label: "AZs", icon: "cluster-host" },
        { url: "/pools", label: "Pools", icon: "pods" },
      ],
    },
    {
      key: "configuration",
      label: "Configuration",
      separator: true,
      items: [{ url: "/images", label: "Images", icon: "image" }],
    },
    {
      key: "networking",
      label: "Networking",
      separator: true,
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
    { key: "help-group", items: [createHelpItem("https://ubuntu.com/legal")] },
  ],
};

/** MAAS footer — admin settings and the logged-in user. */
export const maasFooterRoot: NavRoot = {
  key: "maas-footer-root",
  items: [
    {
      key: "maas-account-group",
      separator: true,
      items: [
        { url: "/settings", label: "Settings", icon: "settings" },
        { url: "/account/prefs", label: "Ada Lovelace", icon: "user" },
        { key: "logout", label: "Log out", icon: "log-out" },
      ],
    },
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
      separator: true,
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
      separator: true,
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
      separator: true,
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
      separator: true,
      items: [createHelpItem("https://ubuntu.com/legal")],
    },
  ],
};

/** LXD footer — user, docs, and external links. */
export const lxdFooterRoot: NavRoot = {
  key: "lxd-footer-root",
  items: [
    {
      key: "lxd-links-group",
      separator: true,
      items: [
        { key: "lxd-user", label: "admin", icon: "user" },
        {
          url: "https://documentation.ubuntu.com/lxd/",
          label: "Documentation",
          icon: "book",
        },
        { key: "report-bug", label: "Report a bug", icon: "bug" },
        { key: "lxd-logout", label: "Log out" },
      ],
    },
  ],
};

// --- Showcase --------------------------------------------------------------
// Neither MAAS nor LXD's own footer exercises anything beyond a plain link
// or a bare (non-navigable) label — no `control: "switch"`/`"button"`, no
// expandable-with-real-options entry. A footer's own items are ordinary
// `NavItem`s once routed through `footerRoot` (the same tree `NavTree`
// renders for `root`/`Content`), so they support exactly what a content
// group does — this fixture is the demonstration, not a capability that
// needed adding for `footerRoot` itself (only the closed `footerItems`
// vocabulary needed a `control` field of its own — SPEC.md §4.1).

/**
 * A footer with every control variant a content group can have: a plain
 * link, a toggle (`control: "switch"`), an expandable with real
 * multiple-choice options (`control: "button"` per option — each an
 * action, not a page), and an action button. Demonstrates that
 * `footerRoot` gives footer items the same options `root` gives content
 * items — nothing here is footer-specific.
 */
export const showcaseFooterRoot: NavRoot = {
  key: "showcase-footer-root",
  items: [
    {
      key: "showcase-footer-group",
      separator: true,
      items: [
        { url: "/account", label: "Ada Lovelace", icon: "user" },
        {
          key: "notifications-toggle",
          label: "Notifications",
          icon: "notifications",
          control: "switch",
          defaultChecked: true,
        },
        {
          key: "theme",
          label: "Theme",
          icon: "dark-theme",
          items: [
            {
              key: "theme-light",
              label: "Light",
              icon: "light-theme",
              control: "button",
              onClick: fn(),
            },
            {
              key: "theme-dark",
              label: "Dark",
              icon: "dark-theme",
              control: "button",
              onClick: fn(),
            },
            {
              key: "theme-system",
              label: "System",
              icon: "system-theme",
              control: "button",
              onClick: fn(),
            },
          ],
        },
        {
          key: "showcase-logout",
          label: "Log out",
          icon: "log-out",
          control: "button",
          onClick: fn(),
        },
      ],
    },
  ],
};

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
