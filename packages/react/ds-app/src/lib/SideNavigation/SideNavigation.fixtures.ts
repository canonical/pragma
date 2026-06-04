import type { Item } from "@canonical/ds-types";

/**
 * Story/test fixtures for SideNavigation.
 *
 * Each fixture is a WD405 root `Item`: the root node itself is not rendered —
 * only its direct children form the nav item list (the same contract used by
 * SideNavigation.Content and SideNavigation.Footer). Grouping items use `key`
 * (no `url`); navigable leaves use `url`.
 *
 * The MAAS and LXD trees mirror the real left-hand navigation of those
 * Canonical apps (faithful to canonical/maas-ui and canonical/lxd-ui), to give
 * stories a realistic information architecture.
 */

// --- MAAS (Metal as a Service) -------------------------------------------
// Mirrors maas-ui's grouped sidebar. Internal route paths; a real deployment
// serves these under a base prefix (e.g. /MAAS/r/...).

/** MAAS main navigation — grouped hardware/KVM/organisation/config/networking. */
export const maasContentRoot: Item = {
  key: "maas-content-root",
  label: "MAAS navigation",
  items: [
    {
      key: "hardware",
      label: "Hardware",
      items: [
        { url: "/machines", label: "Machines" },
        { url: "/devices", label: "Devices" },
        { url: "/controllers", label: "Controllers" },
      ],
    },
    {
      key: "kvm",
      label: "KVM",
      items: [
        { url: "/kvm/lxd", label: "LXD" },
        { url: "/kvm/virsh", label: "Virsh" },
      ],
    },
    {
      key: "organisation",
      label: "Organisation",
      items: [
        { url: "/tags", label: "Tags" },
        { url: "/zones", label: "AZs" },
        { url: "/pools", label: "Pools" },
      ],
    },
    {
      key: "configuration",
      label: "Configuration",
      items: [{ url: "/images", label: "Images" }],
    },
    {
      key: "networking",
      label: "Networking",
      items: [
        { url: "/networks", label: "Networks" },
        { url: "/domains", label: "DNS" },
        { url: "/network-discovery", label: "Network discovery" },
      ],
    },
  ],
};

/** MAAS footer — admin settings and the logged-in user. */
export const maasFooterRoot: Item = {
  key: "maas-footer-root",
  label: "MAAS account",
  items: [
    { url: "/settings", label: "Settings" },
    { url: "/account/prefs", label: "Ada Lovelace" },
    { key: "logout", label: "Log out" },
  ],
};

// --- LXD UI --------------------------------------------------------------
// Mirrors lxd-ui's project-scoped sidebar (default project). Accordion groups
// for Networking / Storage / Images; Clustering shown only on clustered
// servers.

/** LXD main navigation — project-scoped, default project. */
export const lxdContentRoot: Item = {
  key: "lxd-content-root",
  label: "LXD navigation",
  items: [
    { url: "/ui/project/default/instances", label: "Instances" },
    { url: "/ui/project/default/profiles", label: "Profiles" },
    {
      key: "networking",
      label: "Networking",
      items: [
        { url: "/ui/project/default/networks", label: "Networks" },
        { url: "/ui/project/default/network-acls", label: "ACLs" },
        { url: "/ui/project/default/network-ipam", label: "IPAM" },
      ],
    },
    {
      key: "storage",
      label: "Storage",
      items: [
        { url: "/ui/project/default/storage/pools", label: "Pools" },
        { url: "/ui/project/default/storage/volumes", label: "Volumes" },
        { url: "/ui/project/default/storage/buckets", label: "Buckets" },
        {
          url: "/ui/project/default/storage/custom-isos",
          label: "Custom ISOs",
        },
      ],
    },
    {
      key: "images",
      label: "Images",
      items: [
        { url: "/ui/project/default/local-images", label: "Local images" },
      ],
    },
    { url: "/ui/project/default/configuration", label: "Configuration" },
    { url: "/ui/server", label: "Server" },
    { url: "/ui/operations", label: "Operations" },
    { url: "/ui/warnings?status=new", label: "Warnings" },
    { url: "/ui/settings", label: "Settings" },
  ],
};

/** LXD footer — user, docs, and external links. */
export const lxdFooterRoot: Item = {
  key: "lxd-footer-root",
  label: "LXD links",
  items: [
    { key: "lxd-user", label: "admin" },
    { url: "https://documentation.ubuntu.com/lxd/", label: "Documentation" },
    {
      url: "https://discourse.ubuntu.com/c/lxd/126",
      label: "Discussion",
    },
    { key: "report-bug", label: "Report a bug" },
    { key: "lxd-logout", label: "Log out" },
  ],
};

// --- Generic fixtures (framework-agnostic edge cases) ---------------------

/**
 * Minimal fixture — single flat list, no nesting.
 * Useful for testing base rendering without any tree logic.
 */
export const flatRoot: Item = {
  key: "flat-root",
  label: "Flat Navigation",
  items: [
    { url: "/one", label: "One" },
    { url: "/two", label: "Two" },
    { url: "/three", label: "Three" },
  ],
};

/**
 * Fixture exercising disabled items at both leaf and group level.
 */
export const withDisabledRoot: Item = {
  key: "disabled-root",
  label: "Navigation with disabled items",
  items: [
    { url: "/available", label: "Available" },
    { url: "/unavailable", label: "Unavailable", disabled: true },
    {
      key: "all-projects",
      label: "Project-scoped (disabled)",
      disabled: true,
      items: [{ url: "/scoped/thing", label: "Thing" }],
    },
  ],
};

/**
 * Empty fixture — root with no children.
 * Useful for testing empty-state rendering.
 */
export const emptyRoot: Item = {
  key: "empty-root",
  label: "Empty Navigation",
  items: [],
};
