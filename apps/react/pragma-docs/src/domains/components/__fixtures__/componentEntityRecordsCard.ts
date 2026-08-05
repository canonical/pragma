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
  "client:https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card:_meta":
    {
      __id: "client:https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card:_meta",
      __typename: "EntityMeta",
      curie: "ds:apps_workplaceengineering.pattern.travel_provider_card",
    },
  "client:https://ds.canonical.com/global.component.card:_meta": {
    __id: "client:https://ds.canonical.com/global.component.card:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.component.card",
    type: {
      __ref: "https://ds.canonical.com/Component",
    },
  },
  "client:https://ds.canonical.com/global.component.card:inheritsFroms(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.card:inheritsFroms(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.card:inheritsFroms(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.card:inheritsFroms(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.card:inheritsFroms(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.card:modifierFamilies(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.card:modifierFamilies(first:24)",
      __typename: "ModifierFamilyConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.card:modifierFamilies(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.card:modifierFamilies(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.card:modifierFamilies(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.card:properties:0": {
    __id: "client:https://ds.canonical.com/global.component.card:properties:0",
    __typename: "Property",
    name: null,
    propertyType: null,
    optional: false,
    defaultValue: null,
    constraints: null,
    summary: null,
  },
  "client:https://ds.canonical.com/global.component.card:specializedBies(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.card:specializedBies(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [
          "client:https://ds.canonical.com/global.component.card:specializedBies(first:24):edges:0",
        ],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.card:specializedBies(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.card:specializedBies(first:24):edges:0":
    {
      __id: "client:https://ds.canonical.com/global.component.card:specializedBies(first:24):edges:0",
      __typename: "UIBlockEdge",
      node: {
        __ref:
          "https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card",
      },
    },
  "client:https://ds.canonical.com/global.component.card:specializedBies(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.card:specializedBies(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24)",
      __typename: "SubcomponentConnection",
      edges: {
        __refs: [
          "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:0",
          "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:1",
          "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:2",
          "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:3",
          "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:4",
        ],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:0":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:0",
      __typename: "SubcomponentEdge",
      node: {
        __ref: "https://ds.canonical.com/global.subcomponent.card-content",
      },
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:1":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:1",
      __typename: "SubcomponentEdge",
      node: {
        __ref: "https://ds.canonical.com/global.subcomponent.card-footer",
      },
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:2":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:2",
      __typename: "SubcomponentEdge",
      node: {
        __ref: "https://ds.canonical.com/global.subcomponent.card-header",
      },
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:3":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:3",
      __typename: "SubcomponentEdge",
      node: {
        __ref: "https://ds.canonical.com/global.subcomponent.card-image",
      },
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:4":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):edges:4",
      __typename: "SubcomponentEdge",
      node: {
        __ref: "https://ds.canonical.com/global.subcomponent.card-thumbnail",
      },
    },
  "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.card:subcomponents(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.card:variantOfs(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.card:variantOfs(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.card:variantOfs(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.card:variantOfs(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.card:variantOfs(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.card:variants(first:24)": {
    __id: "client:https://ds.canonical.com/global.component.card:variants(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref:
        "client:https://ds.canonical.com/global.component.card:variants(first:24):pageInfo",
    },
  },
  "client:https://ds.canonical.com/global.component.card:variants(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.card:variants(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.subcomponent.card-content:_meta": {
    __id: "client:https://ds.canonical.com/global.subcomponent.card-content:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.subcomponent.card-content",
  },
  "client:https://ds.canonical.com/global.subcomponent.card-footer:_meta": {
    __id: "client:https://ds.canonical.com/global.subcomponent.card-footer:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.subcomponent.card-footer",
  },
  "client:https://ds.canonical.com/global.subcomponent.card-header:_meta": {
    __id: "client:https://ds.canonical.com/global.subcomponent.card-header:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.subcomponent.card-header",
  },
  "client:https://ds.canonical.com/global.subcomponent.card-image:_meta": {
    __id: "client:https://ds.canonical.com/global.subcomponent.card-image:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.subcomponent.card-image",
  },
  "client:https://ds.canonical.com/global.subcomponent.card-thumbnail:_meta": {
    __id: "client:https://ds.canonical.com/global.subcomponent.card-thumbnail:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.subcomponent.card-thumbnail",
  },
  "client:https://ds.canonical.com/global:_meta": {
    __id: "client:https://ds.canonical.com/global:_meta",
    __typename: "EntityMeta",
    curie: "ds:global",
  },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.card")': {
      __ref: "https://ds.canonical.com/global.component.card",
    },
  },
  "https://ds.canonical.com/Component": {
    __id: "https://ds.canonical.com/Component",
    __typename: "OntologyClass",
    uri: "https://ds.canonical.com/Component",
    label: "Component",
    namespace: "ds",
  },
  "https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card":
    {
      __id: "https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card",
      __typename: "Pattern",
      uri: "https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card",
      name: "TravelProviderCard",
      _meta: {
        __ref:
          "client:https://ds.canonical.com/apps_workplaceengineering.pattern.travel_provider_card:_meta",
      },
    },
  "https://ds.canonical.com/global": {
    __id: "https://ds.canonical.com/global",
    __typename: "Tier",
    uri: "https://ds.canonical.com/global",
    name: "Global",
    _meta: {
      __ref: "client:https://ds.canonical.com/global:_meta",
    },
  },
  "https://ds.canonical.com/global.component.card": {
    __id: "https://ds.canonical.com/global.component.card",
    __typename: "Component",
    name: "Card",
    uri: "https://ds.canonical.com/global.component.card",
    summary:
      "The card is a container that is designed to represent data objects that share the same structure. Unlike the more flexible [Tile](https://docs.superhuman.com/d/_dNyzE_TLZDh#_tugrid-20dWwIHYhx/_rui-eThhoLZg3Y), a card is designed to have multiple units displayed beside one another. Because of this, the card has a predictable structure that allows the user to compare attributes across data objects.\n\n",
    tier: {
      __ref: "https://ds.canonical.com/global",
    },
    properties: {
      __refs: [
        "client:https://ds.canonical.com/global.component.card:properties:0",
      ],
    },
    "subcomponents(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.card:subcomponents(first:24)",
    },
    "modifierFamilies(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.card:modifierFamilies(first:24)",
    },
    _meta: {
      __ref: "client:https://ds.canonical.com/global.component.card:_meta",
    },
    "variants(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.card:variants(first:24)",
    },
    "variantOfs(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.card:variantOfs(first:24)",
    },
    "inheritsFroms(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.card:inheritsFroms(first:24)",
    },
    "specializedBies(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.card:specializedBies(first:24)",
    },
    version: null,
  },
  "https://ds.canonical.com/global.subcomponent.card-content": {
    __id: "https://ds.canonical.com/global.subcomponent.card-content",
    __typename: "Subcomponent",
    uri: "https://ds.canonical.com/global.subcomponent.card-content",
    name: "Card.Content",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.subcomponent.card-content:_meta",
    },
  },
  "https://ds.canonical.com/global.subcomponent.card-footer": {
    __id: "https://ds.canonical.com/global.subcomponent.card-footer",
    __typename: "Subcomponent",
    uri: "https://ds.canonical.com/global.subcomponent.card-footer",
    name: "Card.Footer",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.subcomponent.card-footer:_meta",
    },
  },
  "https://ds.canonical.com/global.subcomponent.card-header": {
    __id: "https://ds.canonical.com/global.subcomponent.card-header",
    __typename: "Subcomponent",
    uri: "https://ds.canonical.com/global.subcomponent.card-header",
    name: "Card.Header",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.subcomponent.card-header:_meta",
    },
  },
  "https://ds.canonical.com/global.subcomponent.card-image": {
    __id: "https://ds.canonical.com/global.subcomponent.card-image",
    __typename: "Subcomponent",
    uri: "https://ds.canonical.com/global.subcomponent.card-image",
    name: "Card.Image",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.subcomponent.card-image:_meta",
    },
  },
  "https://ds.canonical.com/global.subcomponent.card-thumbnail": {
    __id: "https://ds.canonical.com/global.subcomponent.card-thumbnail",
    __typename: "Subcomponent",
    uri: "https://ds.canonical.com/global.subcomponent.card-thumbnail",
    name: "Card.Thumbnail",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.subcomponent.card-thumbnail:_meta",
    },
  },
} as unknown as RecordMap;

export default componentEntityRecordsCard;
