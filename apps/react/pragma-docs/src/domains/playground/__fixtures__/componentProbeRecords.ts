/**
 * A serialised Relay store snapshot for `ComponentProbeQuery` at the pilot's
 * variables ({ uri: "ds:global.component.button", count: 12 }) — captured
 * verbatim from a dev server's `__INITIAL_DATA__.relay.records` (the output
 * of the prepare step's `getStore().getSource().toJSON()`). Regenerate by
 * booting `dev:bun` and copying `relay.records` from a `/playground`
 * response's `__INITIAL_DATA__` script.
 *
 * A TS module rather than `.json` — not for `resolveJsonModule` (the base
 * config's `module: "NodeNext"` already implies it): the `.ts` module
 * carries its `RecordMap` type inline and avoids the `with { type: "json" }`
 * import-attribute ceremony NodeNext requires for `.json` imports.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const componentProbeRecords = {
  "client:https://ds.canonical.com/global.component.button:_meta": {
    __id: "client:https://ds.canonical.com/global.component.button:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.component.button",
  },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12)",
      __typename: "ModifierFamilyConnection",
      edges: {
        __refs: [
          "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12):edges:0",
          "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12):edges:1",
        ],
      },
    },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12):edges:0":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12):edges:0",
      __typename: "ModifierFamilyEdge",
      node: {
        __ref: "https://ds.canonical.com/global.modifier_family.anticipation",
      },
    },
  "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12):edges:1":
    {
      __id: "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12):edges:1",
      __typename: "ModifierFamilyEdge",
      node: {
        __ref: "https://ds.canonical.com/global.modifier_family.importance",
      },
    },
  "client:https://ds.canonical.com/global.component.button:subcomponents(first:12)":
    {
      __id: "client:https://ds.canonical.com/global.component.button:subcomponents(first:12)",
      __typename: "SubcomponentConnection",
      edges: {
        __refs: [],
      },
    },
  "client:https://ds.canonical.com/global.modifier_family.anticipation:_meta": {
    __id: "client:https://ds.canonical.com/global.modifier_family.anticipation:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.modifier_family.anticipation",
  },
  "client:https://ds.canonical.com/global.modifier_family.importance:_meta": {
    __id: "client:https://ds.canonical.com/global.modifier_family.importance:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.modifier_family.importance",
  },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.button")': {
      __ref: "https://ds.canonical.com/global.component.button",
    },
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
    uri: "https://ds.canonical.com/global.component.button",
    name: "Button",
    summary:
      "Buttons trigger actions within an interface, typically involving data transformation or manipulation. They provide clear visual indicators of the primary actions users can perform on a page or section.\n\n",
    tier: {
      __ref: "https://ds.canonical.com/global",
    },
    "subcomponents(first:12)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:subcomponents(first:12)",
    },
    "modifierFamilies(first:12)": {
      __ref:
        "client:https://ds.canonical.com/global.component.button:modifierFamilies(first:12)",
    },
    _meta: {
      __ref: "client:https://ds.canonical.com/global.component.button:_meta",
    },
  },
  "https://ds.canonical.com/global.modifier_family.anticipation": {
    __id: "https://ds.canonical.com/global.modifier_family.anticipation",
    __typename: "ModifierFamily",
    uri: "https://ds.canonical.com/global.modifier_family.anticipation",
    name: "Anticipation",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.modifier_family.anticipation:_meta",
    },
  },
  "https://ds.canonical.com/global.modifier_family.importance": {
    __id: "https://ds.canonical.com/global.modifier_family.importance",
    __typename: "ModifierFamily",
    uri: "https://ds.canonical.com/global.modifier_family.importance",
    name: "Importance",
    _meta: {
      __ref:
        "client:https://ds.canonical.com/global.modifier_family.importance:_meta",
    },
  },
} as unknown as RecordMap;

export default componentProbeRecords;
