import type { Item } from "@canonical/ds-types";

/**
 * Root item for the main navigation content area.
 *
 * The root node itself is not rendered — only its direct children are
 * displayed as the nav item list. This mirrors the WD405 contract used
 * by SideNavigation.Content and SideNavigation.Footer.
 */
export const contentRoot: Item = {
  key: "content-root",
  label: "Main Navigation",
  items: [
    {
      url: "/dashboard",
      label: "Dashboard",
    },
    {
      url: "/models",
      label: "Models",
      items: [
        { url: "/models/deployed", label: "Deployed" },
        { url: "/models/training", label: "Training" },
        { url: "/models/archived", label: "Archived" },
      ],
    },
    {
      url: "/applications",
      label: "Applications",
      items: [
        { url: "/applications/active", label: "Active" },
        { url: "/applications/inactive", label: "Inactive", disabled: true },
      ],
    },
    {
      url: "/storage",
      label: "Storage",
    },
    {
      url: "/networking",
      label: "Networking",
      disabled: true,
    },
  ],
};

/**
 * Root item for the footer navigation area.
 *
 * Follows the same WD405 root-item contract as contentRoot.
 * Typically holds account-level or global actions pinned to the bottom.
 */
export const footerRoot: Item = {
  key: "footer-root",
  label: "Footer Navigation",
  items: [
    {
      url: "/settings",
      label: "Settings",
    },
    {
      url: "/help",
      label: "Help & documentation",
    },
    {
      url: "/profile",
      label: "My profile",
    },
  ],
};

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
 * Empty fixture — root with no children.
 * Useful for testing empty-state rendering.
 */
export const emptyRoot: Item = {
  key: "empty-root",
  label: "Empty Navigation",
  items: [],
};
