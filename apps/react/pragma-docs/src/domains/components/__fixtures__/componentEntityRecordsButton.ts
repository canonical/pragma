/**
 * A serialised Relay store snapshot for `ComponentEntityQuery` at
 * { uri: "ds:global.component.button", count: 24 } — captured VERBATIM from a dev
 * server's `__INITIAL_DATA__.relay.records` (the prepare step's
 * `getStore().getSource().toJSON()`), keys sorted, nothing trimmed.
 * Regenerate by booting `dev:bun` and copying `relay.records` out of the
 * `__INITIAL_DATA__` script served at
 * /components/ds%3Aglobal.component.button.
 *
 * The literal is wider than `RecordMap`'s nominal record type (and
 * `RecordMap` isn't root-exported from relay-runtime — hence the deep
 * import) — hence the double cast at the end.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const componentEntityRecordsButton = {
  "client:ds:global.component.button:_meta": {
    __id: "client:ds:global.component.button:_meta",
    __typename: "EntityMeta",
    type: {
      __ref: "client:ds:global.component.button:_meta:type",
    },
  },
  "client:ds:global.component.button:_meta:type": {
    __id: "client:ds:global.component.button:_meta:type",
    __typename: "OntologyClass",
    label: "Component",
    namespace: "ds",
    uri: "https://ds.canonical.com/Component",
  },
  "client:ds:global.component.button:inheritsFroms(first:24)": {
    __id: "client:ds:global.component.button:inheritsFroms(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref:
        "client:ds:global.component.button:inheritsFroms(first:24):pageInfo",
    },
  },
  "client:ds:global.component.button:inheritsFroms(first:24):pageInfo": {
    __id: "client:ds:global.component.button:inheritsFroms(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.button:modifierFamilies(first:24)": {
    __id: "client:ds:global.component.button:modifierFamilies(first:24)",
    __typename: "ModifierFamilyConnection",
    edges: {
      __refs: [
        "client:ds:global.component.button:modifierFamilies(first:24):edges:0",
        "client:ds:global.component.button:modifierFamilies(first:24):edges:1",
      ],
    },
    pageInfo: {
      __ref:
        "client:ds:global.component.button:modifierFamilies(first:24):pageInfo",
    },
  },
  "client:ds:global.component.button:modifierFamilies(first:24):edges:0": {
    __id: "client:ds:global.component.button:modifierFamilies(first:24):edges:0",
    __typename: "ModifierFamilyEdge",
    node: {
      __ref: "ds:global.modifier_family.anticipation",
    },
  },
  "client:ds:global.component.button:modifierFamilies(first:24):edges:1": {
    __id: "client:ds:global.component.button:modifierFamilies(first:24):edges:1",
    __typename: "ModifierFamilyEdge",
    node: {
      __ref: "ds:global.modifier_family.importance",
    },
  },
  "client:ds:global.component.button:modifierFamilies(first:24):pageInfo": {
    __id: "client:ds:global.component.button:modifierFamilies(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.button:properties:0": {
    __id: "client:ds:global.component.button:properties:0",
    __typename: "Property",
    constraints: "[default, special, exceptional]",
    defaultValue: "default",
    name: "variantSpecial",
    optional: false,
    propertyType: "choice",
    summary: "?",
  },
  "client:ds:global.component.button:properties:1": {
    __id: "client:ds:global.component.button:properties:1",
    __typename: "Property",
    constraints: "Should affect background color and border",
    defaultValue: null,
    name: "anticipation",
    optional: true,
    propertyType: "choice",
    summary: "Buttons can consume the Anticipation modifier family",
  },
  "client:ds:global.component.button:properties:2": {
    __id: "client:ds:global.component.button:properties:2",
    __typename: "Property",
    constraints: null,
    defaultValue: "default",
    name: "size",
    optional: false,
    propertyType: "choice",
    summary:
      "Controls the size of the button. The smaller size can be used in places where space is at a premium.",
  },
  "client:ds:global.component.button:properties:3": {
    __id: "client:ds:global.component.button:properties:3",
    __typename: "Property",
    constraints: null,
    defaultValue: "no icon",
    name: "icon",
    optional: true,
    propertyType: "choice",
    summary:
      "Determines the icon that is being displayed in the button. Either text or an icon needs to be provided. If no text is provided but an icon is, it is an icon only button",
  },
  "client:ds:global.component.button:properties:4": {
    __id: "client:ds:global.component.button:properties:4",
    __typename: "Property",
    constraints: null,
    defaultValue: null,
    name: "content",
    optional: true,
    propertyType: "text",
    summary:
      "Determines the text that is being displayed in the button. Either text or an icon needs to be provided. If no text is provided but an icon is, it is an icon only button",
  },
  "client:ds:global.component.button:specializedBies(first:24)": {
    __id: "client:ds:global.component.button:specializedBies(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [
        "client:ds:global.component.button:specializedBies(first:24):edges:0",
      ],
    },
    pageInfo: {
      __ref:
        "client:ds:global.component.button:specializedBies(first:24):pageInfo",
    },
  },
  "client:ds:global.component.button:specializedBies(first:24):edges:0": {
    __id: "client:ds:global.component.button:specializedBies(first:24):edges:0",
    __typename: "UIBlockEdge",
    node: {
      __ref: "ds:global.component.dropdown_button",
    },
  },
  "client:ds:global.component.button:specializedBies(first:24):pageInfo": {
    __id: "client:ds:global.component.button:specializedBies(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.button:subcomponents(first:24)": {
    __id: "client:ds:global.component.button:subcomponents(first:24)",
    __typename: "SubcomponentConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref:
        "client:ds:global.component.button:subcomponents(first:24):pageInfo",
    },
  },
  "client:ds:global.component.button:subcomponents(first:24):pageInfo": {
    __id: "client:ds:global.component.button:subcomponents(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.button:variantOfs(first:24)": {
    __id: "client:ds:global.component.button:variantOfs(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref: "client:ds:global.component.button:variantOfs(first:24):pageInfo",
    },
  },
  "client:ds:global.component.button:variantOfs(first:24):pageInfo": {
    __id: "client:ds:global.component.button:variantOfs(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:ds:global.component.button:variants(first:24)": {
    __id: "client:ds:global.component.button:variants(first:24)",
    __typename: "UIBlockConnection",
    edges: {
      __refs: [],
    },
    pageInfo: {
      __ref: "client:ds:global.component.button:variants(first:24):pageInfo",
    },
  },
  "client:ds:global.component.button:variants(first:24):pageInfo": {
    __id: "client:ds:global.component.button:variants(first:24):pageInfo",
    __typename: "PageInfo",
    hasNextPage: false,
  },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.button")': {
      __ref: "ds:global.component.button",
    },
  },
  "ds:global": {
    __id: "ds:global",
    __typename: "Tier",
    id: "ds:global",
    name: "Global",
    uri: "ds:global",
  },
  "ds:global.component.button": {
    __id: "ds:global.component.button",
    __typename: "Component",
    _meta: {
      __ref: "client:ds:global.component.button:_meta",
    },
    id: "ds:global.component.button",
    "inheritsFroms(first:24)": {
      __ref: "client:ds:global.component.button:inheritsFroms(first:24)",
    },
    "modifierFamilies(first:24)": {
      __ref: "client:ds:global.component.button:modifierFamilies(first:24)",
    },
    name: "Button",
    properties: {
      __refs: [
        "client:ds:global.component.button:properties:0",
        "client:ds:global.component.button:properties:1",
        "client:ds:global.component.button:properties:2",
        "client:ds:global.component.button:properties:3",
        "client:ds:global.component.button:properties:4",
      ],
    },
    "specializedBies(first:24)": {
      __ref: "client:ds:global.component.button:specializedBies(first:24)",
    },
    "subcomponents(first:24)": {
      __ref: "client:ds:global.component.button:subcomponents(first:24)",
    },
    summary:
      "Buttons trigger actions within an interface, typically involving data transformation or manipulation. They provide clear visual indicators of the primary actions users can perform on a page or section.\n\n",
    tier: {
      __ref: "ds:global",
    },
    uri: "ds:global.component.button",
    "variantOfs(first:24)": {
      __ref: "client:ds:global.component.button:variantOfs(first:24)",
    },
    "variants(first:24)": {
      __ref: "client:ds:global.component.button:variants(first:24)",
    },
    version: null,
  },
  "ds:global.component.dropdown_button": {
    __id: "ds:global.component.dropdown_button",
    __typename: "Component",
    id: "ds:global.component.dropdown_button",
    name: "DropdownButton",
    uri: "ds:global.component.dropdown_button",
  },
  "ds:global.modifier_family.anticipation": {
    __id: "ds:global.modifier_family.anticipation",
    __typename: "ModifierFamily",
    id: "ds:global.modifier_family.anticipation",
    name: "Anticipation",
    uri: "ds:global.modifier_family.anticipation",
  },
  "ds:global.modifier_family.importance": {
    __id: "ds:global.modifier_family.importance",
    __typename: "ModifierFamily",
    id: "ds:global.modifier_family.importance",
    name: "Importance",
    uri: "ds:global.modifier_family.importance",
  },
} as unknown as RecordMap;

export default componentEntityRecordsButton;
