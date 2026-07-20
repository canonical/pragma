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
        "client:root:__CatalogList_components_connection:edges:69",
        "client:root:__CatalogList_components_connection:edges:77",
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
      __ref: "ds:global.component.accordion",
    },
    cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC5hY2NvcmRpb24=",
  },
  "client:root:__CatalogList_components_connection:edges:13": {
    __id: "client:root:__CatalogList_components_connection:edges:13",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:global.component.button",
    },
    cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC5idXR0b24=",
  },
  "client:root:__CatalogList_components_connection:edges:15": {
    __id: "client:root:__CatalogList_components_connection:edges:15",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:global.component.card",
    },
    cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC5jYXJk",
  },
  "client:root:__CatalogList_components_connection:edges:4": {
    __id: "client:root:__CatalogList_components_connection:edges:4",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:apps_lxd.component.back_link",
    },
    cursor: "ZHM6YXBwc19seGQuY29tcG9uZW50LmJhY2tfbGluaw==",
  },
  "client:root:__CatalogList_components_connection:edges:54": {
    __id: "client:root:__CatalogList_components_connection:edges:54",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:apps_lxd.component.meter",
    },
    cursor: "ZHM6YXBwc19seGQuY29tcG9uZW50Lm1ldGVy",
  },
  "client:root:__CatalogList_components_connection:edges:69": {
    __id: "client:root:__CatalogList_components_connection:edges:69",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:sites.component.quote",
    },
    cursor: "ZHM6c2l0ZXMuY29tcG9uZW50LnF1b3Rl",
  },
  "client:root:__CatalogList_components_connection:edges:77": {
    __id: "client:root:__CatalogList_components_connection:edges:77",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:sites.component.rule",
    },
    cursor: "ZHM6c2l0ZXMuY29tcG9uZW50LnJ1bGU=",
  },
  "client:root:__CatalogList_components_connection:edges:8": {
    __id: "client:root:__CatalogList_components_connection:edges:8",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:sites.component.blog_card",
    },
    cursor: "ZHM6c2l0ZXMuY29tcG9uZW50LmJsb2dfY2FyZA==",
  },
  "client:root:__CatalogList_components_connection:pageInfo": {
    __id: "client:root:__CatalogList_components_connection:pageInfo",
    __typename: "PageInfo",
    hasNextPage: true,
    hasPreviousPage: false,
    endCursor:
      "ZHM6YXBwc193b3JrcGxhY2VlbmdpbmVlcmluZy5jb21wb25lbnQudGhlbWVfc3dpdGNoZXI=",
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
        "client:root:components(first:100):edges:69",
        "client:root:components(first:100):edges:77",
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
      __ref: "ds:global.component.accordion",
    },
    cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC5hY2NvcmRpb24=",
  },
  "client:root:components(first:100):edges:13": {
    __id: "client:root:components(first:100):edges:13",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:global.component.button",
    },
    cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC5idXR0b24=",
  },
  "client:root:components(first:100):edges:15": {
    __id: "client:root:components(first:100):edges:15",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:global.component.card",
    },
    cursor: "ZHM6Z2xvYmFsLmNvbXBvbmVudC5jYXJk",
  },
  "client:root:components(first:100):edges:4": {
    __id: "client:root:components(first:100):edges:4",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:apps_lxd.component.back_link",
    },
    cursor: "ZHM6YXBwc19seGQuY29tcG9uZW50LmJhY2tfbGluaw==",
  },
  "client:root:components(first:100):edges:54": {
    __id: "client:root:components(first:100):edges:54",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:apps_lxd.component.meter",
    },
    cursor: "ZHM6YXBwc19seGQuY29tcG9uZW50Lm1ldGVy",
  },
  "client:root:components(first:100):edges:69": {
    __id: "client:root:components(first:100):edges:69",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:sites.component.quote",
    },
    cursor: "ZHM6c2l0ZXMuY29tcG9uZW50LnF1b3Rl",
  },
  "client:root:components(first:100):edges:77": {
    __id: "client:root:components(first:100):edges:77",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:sites.component.rule",
    },
    cursor: "ZHM6c2l0ZXMuY29tcG9uZW50LnJ1bGU=",
  },
  "client:root:components(first:100):edges:8": {
    __id: "client:root:components(first:100):edges:8",
    __typename: "ComponentEdge",
    node: {
      __ref: "ds:sites.component.blog_card",
    },
    cursor: "ZHM6c2l0ZXMuY29tcG9uZW50LmJsb2dfY2FyZA==",
  },
  "client:root:components(first:100):pageInfo": {
    __id: "client:root:components(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor:
      "ZHM6YXBwc193b3JrcGxhY2VlbmdpbmVlcmluZy5jb21wb25lbnQudGhlbWVfc3dpdGNoZXI=",
    hasNextPage: true,
  },
  "ds:apps_lxd": {
    __id: "ds:apps_lxd",
    __typename: "Tier",
    name: "Apps/LXD",
    id: "ds:apps_lxd",
  },
  "ds:apps_lxd.component.back_link": {
    __id: "ds:apps_lxd.component.back_link",
    __typename: "Component",
    id: "ds:apps_lxd.component.back_link",
    tier: {
      __ref: "ds:apps_lxd",
    },
    uri: "ds:apps_lxd.component.back_link",
    name: "BackLink",
    summary:
      'The **BackLink** component is a navigational breadcrumb element that provides users with contextual back navigation within a multi-step workflow. It displays a clickable back link with a left-pointing chevron icon, followed by the current page or step title, creating a clear visual hierarchy of "← Previous Context / Current Context".\n\n\n\n**Primary purpose**\n\nThis component enables intuitive backward navigation while maintaining context awareness, helping users understand their current location within a multi-step process and providing an easy path to return to the previous state.\n\n\n\n**Main use cases**\n\n- **Multi-Step modal navigation**: Navigate between steps in complex modal workflows like volume creation, instance migration, or storage configuration, where users need to move back and forth between different configuration stages\n- **Hierarchical form flows**: Provide navigation within nested form sections, such as permission group management where users drill down into specific configuration areas and need clear paths back to parent forms\n- **Wizard-style workflows**: Enable step-by-step process navigation in creation wizards (custom ISO upload, volume setup) where users may need to revisit previous steps to modify selections\n\n\n\n**Key features**\n\n- **Visual hierarchy**: Uses chevron-left icon and breadcrumb-style text formatting to clearly indicate navigation direction and current context\n- **Contextual labeling**: Displays both the previous context (back link text) and current context (title) for clear orientation\n- **Click handler integration**: Accepts custom onClick functions to handle state changes, modal navigation, or route transitions\n\n',
  },
  "ds:apps_lxd.component.meter": {
    __id: "ds:apps_lxd.component.meter",
    __typename: "Component",
    id: "ds:apps_lxd.component.meter",
    tier: {
      __ref: "ds:apps_lxd",
    },
    uri: "ds:apps_lxd.component.meter",
    name: "Meter",
    summary:
      "The **Meter** component is a visual progress indicator designed to display percentage-based data with accompanying descriptive text. It renders a horizontal bar that fills proportionally to represent usage, capacity, or completion metrics.\n\n\n\n**Primary purpose**\n\nThis component visualizes numeric data as a percentage-filled bar, making it easy for users to quickly assess levels, usage, or progress at a glance.\n\n**Main use cases**\n\n- **Resource utilization**: Display storage usage, memory consumption, CPU load, or network bandwidth utilization\n- **Dual-Value Metrics**: Present two related percentage values simultaneously (e.g., allocated vs used, or primary vs secondary usage)\n- **Progress Tracking**: Indicate completion status of operations, downloads, or multi-step processes\n\n  \n**Key features**\n\n- **Single or dual display**: Can show one primary percentage or two complementary percentages\n- **Contextual text**: Includes descriptive text below the meter for clarity\n- **Hover information**: Optional tooltip support for additional details\n- **Responsive styling**: Automatically adapts to container width while maintaining minimum visibility\n\n",
  },
  "ds:global": {
    __id: "ds:global",
    __typename: "Tier",
    name: "Global",
    id: "ds:global",
  },
  "ds:global.component.accordion": {
    __id: "ds:global.component.accordion",
    __typename: "Component",
    id: "ds:global.component.accordion",
    tier: {
      __ref: "ds:global",
    },
    uri: "ds:global.component.accordion",
    name: "Accordion",
    summary:
      "The accordion is a vertically stacked content area which can be collapsed and expanded to reveal or hide its contents. An  can be opened or closed independently of its surrounding counterparts (i.e: multiple accordions can be open at the same time). \n\nAccordions can help browse different pieces of related content in a more efficient way. Be wary that they can also hide content from users and are not suitable when a user is meant to read all of the page content.\n\n",
  },
  "ds:global.component.button": {
    __id: "ds:global.component.button",
    __typename: "Component",
    id: "ds:global.component.button",
    tier: {
      __ref: "ds:global",
    },
    uri: "ds:global.component.button",
    name: "Button",
    summary:
      "Buttons trigger actions within an interface, typically involving data transformation or manipulation. They provide clear visual indicators of the primary actions users can perform on a page or section.\n\n",
  },
  "ds:global.component.card": {
    __id: "ds:global.component.card",
    __typename: "Component",
    id: "ds:global.component.card",
    tier: {
      __ref: "ds:global",
    },
    uri: "ds:global.component.card",
    name: "Card",
    summary:
      "The card is a container that is designed to represent data objects that share the same structure. Unlike the more flexible [Tile](https://docs.superhuman.com/d/_dNyzE_TLZDh#_tugrid-20dWwIHYhx/_rui-eThhoLZg3Y), a card is designed to have multiple units displayed beside one another. Because of this, the card has a predictable structure that allows the user to compare attributes across data objects.\n\n",
  },
  "ds:sites": {
    __id: "ds:sites",
    __typename: "Tier",
    name: "Sites",
    id: "ds:sites",
  },
  "ds:sites.component.blog_card": {
    __id: "ds:sites.component.blog_card",
    __typename: "Component",
    id: "ds:sites.component.blog_card",
    tier: {
      __ref: "ds:sites",
    },
    uri: "ds:sites.component.blog_card",
    name: "BlogCard",
    summary: "",
  },
  "ds:sites.component.quote": {
    __id: "ds:sites.component.quote",
    __typename: "Component",
    id: "ds:sites.component.quote",
    tier: {
      __ref: "ds:sites",
    },
    uri: "ds:sites.component.quote",
    name: "Quote",
    summary: "",
  },
  "ds:sites.component.rule": {
    __id: "ds:sites.component.rule",
    __typename: "Component",
    id: "ds:sites.component.rule",
    tier: {
      __ref: "ds:sites",
    },
    uri: "ds:sites.component.rule",
    name: "Rule",
    summary: "",
  },
} as unknown as RecordMap;

export default catalogRecords;
