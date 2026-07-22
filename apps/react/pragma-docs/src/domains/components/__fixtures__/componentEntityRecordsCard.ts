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
  "client:ds:global.component.card:_meta": {
    __id: "client:ds:global.component.card:_meta",
    __typename: "EntityMeta",
    type: {
      __ref: "client:ds:global.component.card:_meta:type",
    },
  },
  "client:ds:global.component.card:_meta:type": {
    __id: "client:ds:global.component.card:_meta:type",
    __typename: "OntologyClass",
    label: "Component",
    namespace: "ds",
    uri: "https://ds.canonical.com/Component",
  },
  "client:ds:global.component.card:inheritsFroms(first:24)": {
    __id: "client:ds:global.component.card:inheritsFroms(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref: "client:ds:global.component.card:inheritsFroms(first:24):pageInfo",
    },
  },
  "client:ds:global.component.card:inheritsFroms(first:24):pageInfo": {
    __id: "client:ds:global.component.card:inheritsFroms(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.card:modifierFamilies(first:24)": {
    __id: "client:ds:global.component.card:modifierFamilies(first:24)",
    __typename: "ModifierFamilyConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref:
        "client:ds:global.component.card:modifierFamilies(first:24):pageInfo",
    },
  },
  "client:ds:global.component.card:modifierFamilies(first:24):pageInfo": {
    __id: "client:ds:global.component.card:modifierFamilies(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.card:properties:0": {
    __id: "client:ds:global.component.card:properties:0",
    __typename: "Property",
    constraints: null,
    defaultValue: null,
    name: null,
    optional: false,
    propertyType: null,
    summary: null,
  },
  "client:ds:global.component.card:specializedBies(first:24)": {
    __id: "client:ds:global.component.card:specializedBies(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [
        "client:ds:global.component.card:specializedBies(first:24):edges:0",
      ],
    },
    pageInfo: {
      __ref:
        "client:ds:global.component.card:specializedBies(first:24):pageInfo",
    },
  },
  "client:ds:global.component.card:specializedBies(first:24):edges:0": {
    __id: "client:ds:global.component.card:specializedBies(first:24):edges:0",
    __typename: "UIBlockEdge",
    node: {
      __ref: "ds:apps_workplaceengineering.pattern.travel_provider_card",
    },
  },
  "client:ds:global.component.card:specializedBies(first:24):pageInfo": {
    __id: "client:ds:global.component.card:specializedBies(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
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
    pageInfo: {
      __ref: "client:ds:global.component.card:subcomponents(first:24):pageInfo",
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
  "client:ds:global.component.card:subcomponents(first:24):pageInfo": {
    __id: "client:ds:global.component.card:subcomponents(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.card:variantOfs(first:24)": {
    __id: "client:ds:global.component.card:variantOfs(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref: "client:ds:global.component.card:variantOfs(first:24):pageInfo",
    },
  },
  "client:ds:global.component.card:variantOfs(first:24):pageInfo": {
    __id: "client:ds:global.component.card:variantOfs(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.card:variants(first:24)": {
    __id: "client:ds:global.component.card:variants(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref: "client:ds:global.component.card:variants(first:24):pageInfo",
    },
  },
  "client:ds:global.component.card:variants(first:24):pageInfo": {
    __id: "client:ds:global.component.card:variants(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.card")': {
      __ref: "ds:global.component.card",
    },
  },
  "ds:apps_workplaceengineering.pattern.travel_provider_card": {
    __id: "ds:apps_workplaceengineering.pattern.travel_provider_card",
    __typename: "Pattern",
    id: "ds:apps_workplaceengineering.pattern.travel_provider_card",
    name: "TravelProviderCard",
    uri: "ds:apps_workplaceengineering.pattern.travel_provider_card",
  },
  "ds:global": {
    __id: "ds:global",
    __typename: "Tier",
    id: "ds:global",
    name: "Global",
    uri: "ds:global",
  },
  "ds:global.component.card": {
    __id: "ds:global.component.card",
    __typename: "Component",
    _meta: {
      __ref: "client:ds:global.component.card:_meta",
    },
    id: "ds:global.component.card",
    "inheritsFroms(first:24)": {
      __ref: "client:ds:global.component.card:inheritsFroms(first:24)",
    },
    "modifierFamilies(first:24)": {
      __ref: "client:ds:global.component.card:modifierFamilies(first:24)",
    },
    name: "Card",
    properties: {
      __refs: ["client:ds:global.component.card:properties:0"],
    },
    "specializedBies(first:24)": {
      __ref: "client:ds:global.component.card:specializedBies(first:24)",
    },
    "subcomponents(first:24)": {
      __ref: "client:ds:global.component.card:subcomponents(first:24)",
    },
    summary:
      "The card is a container that is designed to represent data objects that share the same structure. Unlike the more flexible [Tile](https://docs.superhuman.com/d/_dNyzE_TLZDh#_tugrid-20dWwIHYhx/_rui-eThhoLZg3Y), a card is designed to have multiple units displayed beside one another. Because of this, the card has a predictable structure that allows the user to compare attributes across data objects.\n\n",
    tier: {
      __ref: "ds:global",
    },
    uri: "ds:global.component.card",
    "variantOfs(first:24)": {
      __ref: "client:ds:global.component.card:variantOfs(first:24)",
    },
    "variants(first:24)": {
      __ref: "client:ds:global.component.card:variants(first:24)",
    },
    version: null,
  },
  "ds:global.subcomponent.card-content": {
    __id: "ds:global.subcomponent.card-content",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-content",
    name: "Card.Content",
    uri: "ds:global.subcomponent.card-content",
  },
  "ds:global.subcomponent.card-footer": {
    __id: "ds:global.subcomponent.card-footer",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-footer",
    name: "Card.Footer",
    uri: "ds:global.subcomponent.card-footer",
  },
  "ds:global.subcomponent.card-header": {
    __id: "ds:global.subcomponent.card-header",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-header",
    name: "Card.Header",
    uri: "ds:global.subcomponent.card-header",
  },
  "ds:global.subcomponent.card-image": {
    __id: "ds:global.subcomponent.card-image",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-image",
    name: "Card.Image",
    uri: "ds:global.subcomponent.card-image",
  },
  "ds:global.subcomponent.card-thumbnail": {
    __id: "ds:global.subcomponent.card-thumbnail",
    __typename: "Subcomponent",
    id: "ds:global.subcomponent.card-thumbnail",
    name: "Card.Thumbnail",
    uri: "ds:global.subcomponent.card-thumbnail",
  },
} as unknown as RecordMap;

export default componentEntityRecordsCard;
