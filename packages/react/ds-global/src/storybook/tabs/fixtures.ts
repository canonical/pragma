import type { TabItem } from "#lib/component/Tabs/types.js";

/**
 * Story fixtures for Tabs. Story-only (this folder is excluded from the package
 * build); tests define their own minimal fixtures inline.
 *
 * Each fixture is a root `TabItem`: the root node itself is not rendered — its
 * direct children (`items`) become the tabs. A child with a `url` is a
 * navigable tab; one without is inert. Tabs are flat, so children carry no
 * nested `items`.
 *
 * The urls are **hash-relative** (`#/overview`) so the default `<a>` renderer
 * navigates within the fragment and stays inside Storybook rather than doing a
 * real page load — no router needed for the plain stories.
 */

/** A product-page tab strip: Overview / Specifications / Reviews. */
export const productTabsRoot: TabItem = {
  key: "product-tabs-root",
  label: "Product sections",
  items: [
    { url: "#/overview", label: "Overview" },
    { url: "#/specifications", label: "Specifications" },
    { url: "#/reviews", label: "Reviews" },
  ],
};

/** A product-page tab strip with a not-yet-available (inert) section. */
export const productTabsWithInertRoot: TabItem = {
  key: "product-tabs-inert-root",
  label: "Product sections",
  items: [
    { url: "#/overview", label: "Overview" },
    { url: "#/specifications", label: "Specifications" },
    { key: "reviews-soon", label: "Reviews (coming soon)" },
  ],
};

/** A wide machine-detail tab strip that overflows a narrow container. */
export const machineTabsRoot: TabItem = {
  key: "machine-tabs-root",
  label: "Machine sections",
  items: [
    { url: "#/overview", label: "Overview" },
    { url: "#/specifications", label: "Specifications" },
    { url: "#/networking", label: "Networking" },
    { url: "#/storage", label: "Storage" },
    { url: "#/commissioning", label: "Commissioning" },
  ],
};

/**
 * The router story's fixture uses **plain** paths (`/overview`): the `HashLink`
 * adapter adds the `#` itself, and `currentUrl` comes from the router's
 * `pathname` (also plain), so the two match.
 */
export const routerTabsRoot: TabItem = {
  key: "router-tabs-root",
  label: "Product sections",
  items: [
    { url: "/overview", label: "Overview" },
    { url: "/specifications", label: "Specifications" },
    { url: "/reviews", label: "Reviews" },
  ],
};
