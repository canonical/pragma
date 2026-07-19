/**
 * A serialised Relay store snapshot for `ComponentEntityQuery` at
 * { uri: "ds:global.component.card", count: 24 } — captured VERBATIM from a dev
 * server's `__INITIAL_DATA__.relay.records` (the prepare step's
 * `getStore().getSource().toJSON()`), keys sorted, nothing trimmed.
 * Regenerate by booting `dev:bun` and copying `relay.records` out of the
 * `__INITIAL_DATA__` script served at
 * /components/ds%3Aglobal.component.card.
 *
 * The literal is wider than `RecordMap`'s nominal record type (and
 * `RecordMap` isn't root-exported from relay-runtime — hence the deep
 * import) — hence the double cast at the end.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const componentEntityRecordsCard = {
  "client:ds:global.component.card:modifierFamilies(first:24)": {
    __id: "client:ds:global.component.card:modifierFamilies(first:24)",
    __typename: "ModifierFamilyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:ds:global.component.card:properties:0": {
    __id: "client:ds:global.component.card:properties:0",
    __typename: "Property",
    name: null,
    propertyType: null,
    optional: false,
    defaultValue: null,
    constraints: null,
    summary: null,
  },
  "client:ds:global.component.card:subcomponents(first:24)": {
    __id: "client:ds:global.component.card:subcomponents(first:24)",
    __typename: "SubcomponentConnection",
    edges: {
      __refs: [
        "client:ds:global.component.card:subcomponents(first:24):edges:0",
        "client:ds:global.component.card:subcomponents(first:24):edges:1",
        "client:ds:global.component.card:subcomponents(first:24):edges:2",
        "client:ds:global.component.card:subcomponents(first:24):edges:3",
        "client:ds:global.component.card:subcomponents(first:24):edges:4",
      ],
    },
  },
  "client:ds:global.component.card:subcomponents(first:24):edges:0": {
    __id: "client:ds:global.component.card:subcomponents(first:24):edges:0",
    __typename: "SubcomponentEdge",
    node: {
      __ref: "ds:global.subcomponent.card-content",
    },
  },
  "client:ds:global.component.card:subcomponents(first:24):edges:1": {
    __id: "client:ds:global.component.card:subcomponents(first:24):edges:1",
    __typename: "SubcomponentEdge",
    node: {
      __ref: "ds:global.subcomponent.card-footer",
    },
  },
  "client:ds:global.component.card:subcomponents(first:24):edges:2": {
    __id: "client:ds:global.component.card:subcomponents(first:24):edges:2",
    __typename: "SubcomponentEdge",
    node: {
      __ref: "ds:global.subcomponent.card-header",
    },
  },
  "client:ds:global.component.card:subcomponents(first:24):edges:3": {
    __id: "client:ds:global.component.card:subcomponents(first:24):edges:3",
    __typename: "SubcomponentEdge",
    node: {
      __ref: "ds:global.subcomponent.card-image",
    },
  },
  "client:ds:global.component.card:subcomponents(first:24):edges:4": {
    __id: "client:ds:global.component.card:subcomponents(first:24):edges:4",
    __typename: "SubcomponentEdge",
    node: {
      __ref: "ds:global.subcomponent.card-thumbnail",
    },
  },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.card")': {
      __ref: "ds:global.component.card",
    },
  },
  "ds:global": {
    __id: "ds:global",
    __typename: "Tier",
    id: "ds:global",
    name: "Global",
  },
  "ds:global.component.card": {
    __id: "ds:global.component.card",
    __typename: "Component",
    id: "ds:global.component.card",
    name: "Card",
    uri: "ds:global.component.card",
    summary:
      "The card is a container that is designed to represent data objects that share the same structure. Unlike the more flexible [Tile](https://docs.superhuman.com/d/_dNyzE_TLZDh#_tugrid-20dWwIHYhx/_rui-eThhoLZg3Y), a card is designed to have multiple units displayed beside one another. Because of this, the card has a predictable structure that allows the user to compare attributes across data objects.\n\n",
    tier: {
      __ref: "ds:global",
    },
    properties: {
      __refs: ["client:ds:global.component.card:properties:0"],
    },
    "subcomponents(first:24)": {
      __ref: "client:ds:global.component.card:subcomponents(first:24)",
    },
    "modifierFamilies(first:24)": {
      __ref: "client:ds:global.component.card:modifierFamilies(first:24)",
    },
    version: null,
  },
  "ds:global.subcomponent.card-content": {
    __id: "ds:global.subcomponent.card-content",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-content",
    uri: "ds:global.subcomponent.card-content",
    name: "Card.Content",
  },
  "ds:global.subcomponent.card-footer": {
    __id: "ds:global.subcomponent.card-footer",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-footer",
    uri: "ds:global.subcomponent.card-footer",
    name: "Card.Footer",
  },
  "ds:global.subcomponent.card-header": {
    __id: "ds:global.subcomponent.card-header",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-header",
    uri: "ds:global.subcomponent.card-header",
    name: "Card.Header",
  },
  "ds:global.subcomponent.card-image": {
    __id: "ds:global.subcomponent.card-image",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-image",
    uri: "ds:global.subcomponent.card-image",
    name: "Card.Image",
  },
  "ds:global.subcomponent.card-thumbnail": {
    __id: "ds:global.subcomponent.card-thumbnail",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-thumbnail",
    uri: "ds:global.subcomponent.card-thumbnail",
    name: "Card.Thumbnail",
  },
} as unknown as RecordMap;

export default componentEntityRecordsCard;
