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
  "client:ds:global.component.button:modifierFamilies(first:12)": {
    __id: "client:ds:global.component.button:modifierFamilies(first:12)",
    __typename: "ModifierFamilyConnection",
    edges: {
      __refs: [
        "client:ds:global.component.button:modifierFamilies(first:12):edges:0",
        "client:ds:global.component.button:modifierFamilies(first:12):edges:1",
      ],
    },
  },
  "client:ds:global.component.button:modifierFamilies(first:12):edges:0": {
    __id: "client:ds:global.component.button:modifierFamilies(first:12):edges:0",
    __typename: "ModifierFamilyEdge",
    node: {
      __ref: "ds:global.modifier_family.anticipation",
    },
  },
  "client:ds:global.component.button:modifierFamilies(first:12):edges:1": {
    __id: "client:ds:global.component.button:modifierFamilies(first:12):edges:1",
    __typename: "ModifierFamilyEdge",
    node: {
      __ref: "ds:global.modifier_family.importance",
    },
  },
  "client:ds:global.component.button:subcomponents(first:12)": {
    __id: "client:ds:global.component.button:subcomponents(first:12)",
    __typename: "SubcomponentConnection",
    edges: {
      __refs: [],
    },
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
  },
  "ds:global.component.button": {
    __id: "ds:global.component.button",
    __typename: "Component",
    id: "ds:global.component.button",
    "modifierFamilies(first:12)": {
      __ref: "client:ds:global.component.button:modifierFamilies(first:12)",
    },
    name: "Button",
    "subcomponents(first:12)": {
      __ref: "client:ds:global.component.button:subcomponents(first:12)",
    },
    summary:
      "Buttons trigger actions within an interface, typically involving data transformation or manipulation. They provide clear visual indicators of the primary actions users can perform on a page or section.\n\n",
    tier: {
      __ref: "ds:global",
    },
    uri: "ds:global.component.button",
  },
  "ds:global.modifier_family.anticipation": {
    __id: "ds:global.modifier_family.anticipation",
    __typename: "ModifierFamily",
    id: "ds:global.modifier_family.anticipation",
    name: "Anticipation",
  },
  "ds:global.modifier_family.importance": {
    __id: "ds:global.modifier_family.importance",
    __typename: "ModifierFamily",
    id: "ds:global.modifier_family.importance",
    name: "Importance",
  },
  // The literal above is wider than `RecordMap`'s nominal record type (and
  // `RecordMap` isn't root-exported from relay-runtime — hence the deep
  // import above) — hence the double cast.
} as unknown as RecordMap;

export default componentProbeRecords;
