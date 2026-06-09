import type { NavItem } from "../../lib/SideNavigation/types.js";
import { MockBadge } from "./story-utils.js";

/**
 * Story fixtures for SideNavigation. Story-only (this folder is excluded from
 * the package build); tests define their own minimal fixtures inline.
 *
 * Each fixture is a root `NavItem`: the root node itself is not rendered. Its
 * direct children are **level-1 groups** (a label renders as a group header;
 * no label → no header). Group children (level 2) are the navigable leaves
 * (`url`) — these may carry a leading `icon` and, for leaves, a trailing `slot`
 * (e.g. a badge).
 *
 * The MAAS and LXD trees mirror the real left-hand navigation of those
 * Canonical apps, to give stories a realistic information architecture.
 */

/** A count badge used in fixtures via a leaf's `slot`. */
const badge = (value: number | string): NavItem["slot"] => (
  <MockBadge>{value}</MockBadge>
);

// --- MAAS (Metal as a Service) -------------------------------------------
// Mirrors maas-ui's grouped sidebar. Internal route paths; a real deployment
// serves these under a base prefix (e.g. /MAAS/r/...).

/** MAAS main navigation — grouped hardware/KVM/organisation/config/networking. */
export const maasContentRoot: NavItem = {
  key: "maas-content-root",
  label: "MAAS navigation",
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
  ],
};

/** MAAS footer — admin settings and the logged-in user. */
export const maasFooterRoot: NavItem = {
  key: "maas-footer-root",
  label: "MAAS account",
  items: [
    {
      key: "maas-account-group",
      items: [
        { url: "/settings", label: "Settings", icon: "settings" },
        { url: "/account/prefs", label: "Ada Lovelace", icon: "user" },
        { key: "logout", label: "Log out" },
      ],
    },
  ],
};

// --- LXD UI --------------------------------------------------------------
// Mirrors lxd-ui's project-scoped sidebar (default project).

/** LXD main navigation — project-scoped, default project. */
export const lxdContentRoot: NavItem = {
  key: "lxd-content-root",
  label: "LXD navigation",
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
  ],
};

/** LXD footer — user, docs, and external links. */
export const lxdFooterRoot: NavItem = {
  key: "lxd-footer-root",
  label: "LXD links",
  items: [
    {
      key: "lxd-links-group",
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

// --- Generic fixtures (edge cases) ---------------------------------------

/**
 * Minimal fixture — a single unlabelled level-1 group of leaves (no header).
 * Visually flat; useful for base rendering without group headers.
 */
export const flatRoot: NavItem = {
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
export const withDisabledRoot: NavItem = {
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
export const emptyRoot: NavItem = {
  key: "empty-root",
  items: [],
};
