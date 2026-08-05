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
  "client:https://ds.canonical.com/global.component.button:_meta": {
    __id: "client:https://ds.canonical.com/global.component.button:_meta",
    __typename: "EntityMeta",
    type: {
      __ref: "https://ds.canonical.com/Component",
    },
  },
  "client:https://ds.canonical.com/global.component.button:inheritsFroms(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:inheritsFroms(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.button:inheritsFroms(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.button:inheritsFroms(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.button:inheritsFroms(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24)",
      __typename: "ModifierFamilyConnection",
      edges: {
        __refs: [
          "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):edges:0",
          "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):edges:1",
        ],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):edges:0":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):edges:0",
      __typename: "ModifierFamilyEdge",
      node: {
        __ref: "https://ds.canonical.com/global.modifier_family.anticipation",
      },
    },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):edges:1":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):edges:1",
      __typename: "ModifierFamilyEdge",
      node: {
        __ref: "https://ds.canonical.com/global.modifier_family.importance",
      },
    },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.button:properties:0": {
    __id: "client:https://ds.canonical.com/global.component.button:properties:0",
    __typename: "Property",
    name: "variantSpecial",
    propertyType: "choice",
    optional: false,
    defaultValue: "default",
    constraints: "[default, special, exceptional]",
    summary: "?",
  },
  "client:https://ds.canonical.com/global.component.button:properties:1": {
    __id: "client:https://ds.canonical.com/global.component.button:properties:1",
    __typename: "Property",
    name: "anticipation",
    propertyType: "choice",
    optional: true,
    defaultValue: null,
    constraints: "Should affect background color and border",
    summary: "Buttons can consume the Anticipation modifier family",
  },
  "client:https://ds.canonical.com/global.component.button:properties:2": {
    __id: "client:https://ds.canonical.com/global.component.button:properties:2",
    __typename: "Property",
    name: "size",
    propertyType: "choice",
    optional: false,
    defaultValue: "default",
    constraints: null,
    summary:
      "Controls the size of the button. The smaller size can be used in places where space is at a premium.",
  },
  "client:https://ds.canonical.com/global.component.button:properties:3": {
    __id: "client:https://ds.canonical.com/global.component.button:properties:3",
    __typename: "Property",
    name: "icon",
    propertyType: "choice",
    optional: true,
    defaultValue: "no icon",
    constraints: null,
    summary:
      "Determines the icon that is being displayed in the button. Either text or an icon needs to be provided. If no text is provided but an icon is, it is an icon only button",
  },
  "client:https://ds.canonical.com/global.component.button:properties:4": {
    __id: "client:https://ds.canonical.com/global.component.button:properties:4",
    __typename: "Property",
    name: "content",
    propertyType: "text",
    optional: true,
    defaultValue: null,
    constraints: null,
    summary:
      "Determines the text that is being displayed in the button. Either text or an icon needs to be provided. If no text is provided but an icon is, it is an icon only button",
  },
  "client:https://ds.canonical.com/global.component.button:specializedBies(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:specializedBies(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [
          "client:https://ds.canonical.com/global.component.button:specializedBies(first:24):edges:0",
        ],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.button:specializedBies(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.button:specializedBies(first:24):edges:0":
    {
      __id: "client:https://ds.canonical.com/global.component.button:specializedBies(first:24):edges:0",
      __typename: "UIBlockEdge",
      node: {
        __ref: "https://ds.canonical.com/global.component.dropdown_button",
      },
    },
  "client:https://ds.canonical.com/global.component.button:specializedBies(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.button:specializedBies(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.button:subcomponents(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:subcomponents(first:24)",
      __typename: "SubcomponentConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.button:subcomponents(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.button:subcomponents(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.button:subcomponents(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.button:variantOfs(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:variantOfs(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.button:variantOfs(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.button:variantOfs(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.button:variantOfs(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:https://ds.canonical.com/global.component.button:variants(first:24)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:variants(first:24)",
      __typename: "UIBlockConnection",
      edges: {
        __refs: [],
      },
      pageInfo: {
        __ref:
          "client:https://ds.canonical.com/global.component.button:variants(first:24):pageInfo",
      },
    },
  "client:https://ds.canonical.com/global.component.button:variants(first:24):pageInfo":
    {
      __id: "client:https://ds.canonical.com/global.component.button:variants(first:24):pageInfo",
      __typename: "PageInfo",
      hasNextPage: false,
    },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.button")': {
      __ref: "https://ds.canonical.com/global.component.button",
    },
  },
  "https://ds.canonical.com/Component": {
    __id: "https://ds.canonical.com/Component",
    __typename: "OntologyClass",
    uri: "https://ds.canonical.com/Component",
    label: "Component",
    namespace: "ds",
  },
  "https://ds.canonical.com/global": {
    __id: "https://ds.canonical.com/global",
    __typename: "Tier",
    uri: "https://ds.canonical.com/global",
    name: "Global",
  },
  "https://ds.canonical.com/global.component.button": {
    __id: "https://ds.canonical.com/global.component.button",
    __typename: "Component",
    name: "Button",
    uri: "https://ds.canonical.com/global.component.button",
    summary:
      "Buttons trigger actions within an interface, typically involving data transformation or manipulation. They provide clear visual indicators of the primary actions users can perform on a page or section.\n\n",
    tier: {
      __ref: "https://ds.canonical.com/global",
    },
    properties: {
      __refs: [
        "client:https://ds.canonical.com/global.component.button:properties:0",
        "client:https://ds.canonical.com/global.component.button:properties:1",
        "client:https://ds.canonical.com/global.component.button:properties:2",
        "client:https://ds.canonical.com/global.component.button:properties:3",
        "client:https://ds.canonical.com/global.component.button:properties:4",
      ],
    },
    "subcomponents(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:subcomponents(first:24)",
    },
    "modifierFamilies(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:24)",
    },
    _meta: {
      __ref: "client:https://ds.canonical.com/global.component.button:_meta",
    },
    "variants(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:variants(first:24)",
    },
    "variantOfs(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:variantOfs(first:24)",
    },
    "inheritsFroms(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:inheritsFroms(first:24)",
    },
    "specializedBies(first:24)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:specializedBies(first:24)",
    },
    version: null,
  },
  "https://ds.canonical.com/global.component.dropdown_button": {
    __id: "https://ds.canonical.com/global.component.dropdown_button",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.dropdown_button",
    name: "DropdownButton",
  },
  "https://ds.canonical.com/global.modifier_family.anticipation": {
    __id: "https://ds.canonical.com/global.modifier_family.anticipation",
    __typename: "ModifierFamily",
    uri: "https://ds.canonical.com/global.modifier_family.anticipation",
    name: "Anticipation",
  },
  "https://ds.canonical.com/global.modifier_family.importance": {
    __id: "https://ds.canonical.com/global.modifier_family.importance",
    __typename: "ModifierFamily",
    uri: "https://ds.canonical.com/global.modifier_family.importance",
    name: "Importance",
  },
} as unknown as RecordMap;

export default componentEntityRecordsButton;
