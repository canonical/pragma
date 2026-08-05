/**
 * A serialised Relay store snapshot for `ComponentsCatalogQuery` at
 * { count: 100, cursor: null } — captured from a dev server's
 * `__INITIAL_DATA__.relay.records` at /components, then HAND-TRIMMED
 * from the live 100-edge page down to eight nodes across three tiers
 * (Global: Accordion, Button, Card · Apps/LXD: BackLink, Meter · Sites:
 * BlogCard, Quote, Rule) so the unit fixture stays reviewable.
 *
 * Trimming discipline — STORAGE KEYS KEPT EXACT:
 * - every record id, field key, and cursor is byte-identical to the
 *   capture (`components(first:100)`, the `__CatalogList_components_
 *   connection` handle, positional edge ids — note the kept edges retain
 *   their ORIGINAL indices, e.g. `edges:19`, because ids are never
 *   renumbered);
 * - both connection records (raw field + @connection handle) had their
 *   `edges.__refs` filtered to the same eight edges; dropped edge/node/
 *   tier records were removed wholesale; nothing else was edited;
 * - `pageInfo` is verbatim (hasNextPage: true — the live graph carries
 *   more than one page, which is what makes "Load more" render).
 *
 * Regenerate: boot `dev:bun`, copy `relay.records` out of the
 * `__INITIAL_DATA__` script served at /components, filter both edge
 * lists to the eight URIs above, keep the records they reference.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const catalogRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    "components(first:100)": {
      __ref: "client:root:components(first:100)",
    },
    __CatalogList_components_connection: {
      __ref: "client:root:__CatalogList_components_connection",
    },
  },
  "client:root:__CatalogList_components_connection": {
    __id: "client:root:__CatalogList_components_connection",
    __typename: "ComponentConnection",
    __connection_next_edge_index: 100,
    edges: {
      __refs: [
        "client:root:__CatalogList_components_connection:edges:0",
        "client:root:__CatalogList_components_connection:edges:4",
        "client:root:__CatalogList_components_connection:edges:8",
        "client:root:__CatalogList_components_connection:edges:13",
        "client:root:__CatalogList_components_connection:edges:15",
        "client:root:__CatalogList_components_connection:edges:54",
        "client:root:__CatalogList_components_connection:edges:70",
        "client:root:__CatalogList_components_connection:edges:78",
      ],
    },
    pageInfo: {
      __ref: "client:root:__CatalogList_components_connection:pageInfo",
    },
  },
  "client:root:__CatalogList_components_connection:edges:0": {
    __id: "client:root:__CatalogList_components_connection:edges:0",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.accordion",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2dsb2JhbC5jb21wb25lbnQuYWNjb3JkaW9u",
  },
  "client:root:__CatalogList_components_connection:edges:13": {
    __id: "client:root:__CatalogList_components_connection:edges:13",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.button",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2dsb2JhbC5jb21wb25lbnQuYnV0dG9u",
  },
  "client:root:__CatalogList_components_connection:edges:15": {
    __id: "client:root:__CatalogList_components_connection:edges:15",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.card",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2dsb2JhbC5jb21wb25lbnQuY2FyZA==",
  },
  "client:root:__CatalogList_components_connection:edges:4": {
    __id: "client:root:__CatalogList_components_connection:edges:4",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_lxd.component.back_link",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2FwcHNfbHhkLmNvbXBvbmVudC5iYWNrX2xpbms=",
  },
  "client:root:__CatalogList_components_connection:edges:54": {
    __id: "client:root:__CatalogList_components_connection:edges:54",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_lxd.component.meter",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2FwcHNfbHhkLmNvbXBvbmVudC5tZXRlcg==",
  },
  "client:root:__CatalogList_components_connection:edges:70": {
    __id: "client:root:__CatalogList_components_connection:edges:70",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/sites.component.quote",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL3NpdGVzLmNvbXBvbmVudC5xdW90ZQ==",
  },
  "client:root:__CatalogList_components_connection:edges:78": {
    __id: "client:root:__CatalogList_components_connection:edges:78",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/sites.component.rule",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL3NpdGVzLmNvbXBvbmVudC5ydWxl",
  },
  "client:root:__CatalogList_components_connection:edges:8": {
    __id: "client:root:__CatalogList_components_connection:edges:8",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/sites.component.blog_card",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL3NpdGVzLmNvbXBvbmVudC5ibG9nX2NhcmQ=",
  },
  "client:root:__CatalogList_components_connection:pageInfo": {
    __id: "client:root:__CatalogList_components_connection:pageInfo",
    __typename: "PageInfo",
    hasNextPage: true,
    hasPreviousPage: false,
    endCursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2FwcHNfYW5ib3guY29tcG9uZW50LnRoZW1lX3N3aXRjaGVy",
    startCursor: null,
  },
  "client:root:components(first:100)": {
    __id: "client:root:components(first:100)",
    __typename: "ComponentConnection",
    edges: {
      __refs: [
        "client:root:components(first:100):edges:0",
        "client:root:components(first:100):edges:4",
        "client:root:components(first:100):edges:8",
        "client:root:components(first:100):edges:13",
        "client:root:components(first:100):edges:15",
        "client:root:components(first:100):edges:54",
        "client:root:components(first:100):edges:70",
        "client:root:components(first:100):edges:78",
      ],
    },
    pageInfo: {
      __ref: "client:root:components(first:100):pageInfo",
    },
  },
  "client:root:components(first:100):edges:0": {
    __id: "client:root:components(first:100):edges:0",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.accordion",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2dsb2JhbC5jb21wb25lbnQuYWNjb3JkaW9u",
  },
  "client:root:components(first:100):edges:13": {
    __id: "client:root:components(first:100):edges:13",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.button",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2dsb2JhbC5jb21wb25lbnQuYnV0dG9u",
  },
  "client:root:components(first:100):edges:15": {
    __id: "client:root:components(first:100):edges:15",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.card",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2dsb2JhbC5jb21wb25lbnQuY2FyZA==",
  },
  "client:root:components(first:100):edges:4": {
    __id: "client:root:components(first:100):edges:4",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_lxd.component.back_link",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2FwcHNfbHhkLmNvbXBvbmVudC5iYWNrX2xpbms=",
  },
  "client:root:components(first:100):edges:54": {
    __id: "client:root:components(first:100):edges:54",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_lxd.component.meter",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2FwcHNfbHhkLmNvbXBvbmVudC5tZXRlcg==",
  },
  "client:root:components(first:100):edges:70": {
    __id: "client:root:components(first:100):edges:70",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/sites.component.quote",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL3NpdGVzLmNvbXBvbmVudC5xdW90ZQ==",
  },
  "client:root:components(first:100):edges:78": {
    __id: "client:root:components(first:100):edges:78",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/sites.component.rule",
    },
    cursor: "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL3NpdGVzLmNvbXBvbmVudC5ydWxl",
  },
  "client:root:components(first:100):edges:8": {
    __id: "client:root:components(first:100):edges:8",
    __typename: "ComponentEdge",
    node: {
      __ref: "https://ds.canonical.com/sites.component.blog_card",
    },
    cursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL3NpdGVzLmNvbXBvbmVudC5ibG9nX2NhcmQ=",
  },
  "client:root:components(first:100):pageInfo": {
    __id: "client:root:components(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor:
      "aHR0cHM6Ly9kcy5jYW5vbmljYWwuY29tL2FwcHNfYW5ib3guY29tcG9uZW50LnRoZW1lX3N3aXRjaGVy",
    hasNextPage: true,
  },
  "https://ds.canonical.com/apps_lxd": {
    __id: "https://ds.canonical.com/apps_lxd",
    __typename: "Tier",
    name: "Apps/LXD",
    uri: "https://ds.canonical.com/apps_lxd",
  },
  "https://ds.canonical.com/apps_lxd.component.back_link": {
    __id: "https://ds.canonical.com/apps_lxd.component.back_link",
    __typename: "Component",
    uri: "https://ds.canonical.com/apps_lxd.component.back_link",
    tier: {
      __ref: "https://ds.canonical.com/apps_lxd",
    },
    name: "BackLink",
    summary:
      'The **BackLink** component is a navigational breadcrumb element that provides users with contextual back navigation within a multi-step workflow. It displays a clickable back link with a left-pointing chevron icon, followed by the current page or step title, creating a clear visual hierarchy of "← Previous Context / Current Context".\n\n\n\n**Primary purpose**\n\nThis component enables intuitive backward navigation while maintaining context awareness, helping users understand their current location within a multi-step process and providing an easy path to return to the previous state.\n\n\n\n**Main use cases**\n\n- **Multi-Step modal navigation**: Navigate between steps in complex modal workflows like volume creation, instance migration, or storage configuration, where users need to move back and forth between different configuration stages\n- **Hierarchical form flows**: Provide navigation within nested form sections, such as permission group management where users drill down into specific configuration areas and need clear paths back to parent forms\n- **Wizard-style workflows**: Enable step-by-step process navigation in creation wizards (custom ISO upload, volume setup) where users may need to revisit previous steps to modify selections\n\n\n\n**Key features**\n\n- **Visual hierarchy**: Uses chevron-left icon and breadcrumb-style text formatting to clearly indicate navigation direction and current context\n- **Contextual labeling**: Displays both the previous context (back link text) and current context (title) for clear orientation\n- **Click handler integration**: Accepts custom onClick functions to handle state changes, modal navigation, or route transitions\n\n',
  },
  "https://ds.canonical.com/apps_lxd.component.meter": {
    __id: "https://ds.canonical.com/apps_lxd.component.meter",
    __typename: "Component",
    uri: "https://ds.canonical.com/apps_lxd.component.meter",
    tier: {
      __ref: "https://ds.canonical.com/apps_lxd",
    },
    name: "Meter",
    summary:
      "The **Meter** component is a visual progress indicator designed to display percentage-based data with accompanying descriptive text. It renders a horizontal bar that fills proportionally to represent usage, capacity, or completion metrics.\n\n\n\n**Primary purpose**\n\nThis component visualizes numeric data as a percentage-filled bar, making it easy for users to quickly assess levels, usage, or progress at a glance.\n\n**Main use cases**\n\n- **Resource utilization**: Display storage usage, memory consumption, CPU load, or network bandwidth utilization\n- **Dual-Value Metrics**: Present two related percentage values simultaneously (e.g., allocated vs used, or primary vs secondary usage)\n- **Progress Tracking**: Indicate completion status of operations, downloads, or multi-step processes\n\n  \n**Key features**\n\n- **Single or dual display**: Can show one primary percentage or two complementary percentages\n- **Contextual text**: Includes descriptive text below the meter for clarity\n- **Hover information**: Optional tooltip support for additional details\n- **Responsive styling**: Automatically adapts to container width while maintaining minimum visibility\n\n",
  },
  "https://ds.canonical.com/global": {
    __id: "https://ds.canonical.com/global",
    __typename: "Tier",
    name: "Global",
    uri: "https://ds.canonical.com/global",
  },
  "https://ds.canonical.com/global.component.accordion": {
    __id: "https://ds.canonical.com/global.component.accordion",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.accordion",
    tier: {
      __ref: "https://ds.canonical.com/global",
    },
    name: "Accordion",
    summary:
      "The accordion is a vertically stacked content area which can be collapsed and expanded to reveal or hide its contents. An  can be opened or closed independently of its surrounding counterparts (i.e: multiple accordions can be open at the same time). \n\nAccordions can help browse different pieces of related content in a more efficient way. Be wary that they can also hide content from users and are not suitable when a user is meant to read all of the page content.\n\n",
  },
  "https://ds.canonical.com/global.component.button": {
    __id: "https://ds.canonical.com/global.component.button",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.button",
    tier: {
      __ref: "https://ds.canonical.com/global",
    },
    name: "Button",
    summary:
      "Buttons trigger actions within an interface, typically involving data transformation or manipulation. They provide clear visual indicators of the primary actions users can perform on a page or section.\n\n",
  },
  "https://ds.canonical.com/global.component.card": {
    __id: "https://ds.canonical.com/global.component.card",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.card",
    tier: {
      __ref: "https://ds.canonical.com/global",
    },
    name: "Card",
    summary:
      "The card is a container that is designed to represent data objects that share the same structure. Unlike the more flexible [Tile](https://docs.superhuman.com/d/_dNyzE_TLZDh#_tugrid-20dWwIHYhx/_rui-eThhoLZg3Y), a card is designed to have multiple units displayed beside one another. Because of this, the card has a predictable structure that allows the user to compare attributes across data objects.\n\n",
  },
  "https://ds.canonical.com/sites": {
    __id: "https://ds.canonical.com/sites",
    __typename: "Tier",
    name: "Sites",
    uri: "https://ds.canonical.com/sites",
  },
  "https://ds.canonical.com/sites.component.blog_card": {
    __id: "https://ds.canonical.com/sites.component.blog_card",
    __typename: "Component",
    uri: "https://ds.canonical.com/sites.component.blog_card",
    tier: {
      __ref: "https://ds.canonical.com/sites",
    },
    name: "BlogCard",
    summary: "",
  },
  "https://ds.canonical.com/sites.component.quote": {
    __id: "https://ds.canonical.com/sites.component.quote",
    __typename: "Component",
    uri: "https://ds.canonical.com/sites.component.quote",
    tier: {
      __ref: "https://ds.canonical.com/sites",
    },
    name: "Quote",
    summary: "",
  },
  "https://ds.canonical.com/sites.component.rule": {
    __id: "https://ds.canonical.com/sites.component.rule",
    __typename: "Component",
    uri: "https://ds.canonical.com/sites.component.rule",
    tier: {
      __ref: "https://ds.canonical.com/sites",
    },
    name: "Rule",
    summary: "",
  },
} as unknown as RecordMap;

export default catalogRecords;
