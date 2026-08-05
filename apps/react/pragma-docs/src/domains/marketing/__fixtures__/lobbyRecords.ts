/**
 * A serialised Relay store snapshot for `LobbyQuery` at
 * { componentClass: "ds:Component", patternClass: "ds:Pattern",
 *   standardClass: "cs:CodeStandard", exemplars: 6 } — captured VERBATIM
 * from a dev server's `__INITIAL_DATA__.relay.records` at `/`.
 *
 * No trimming (unlike `standardsIndexRecords`): the lobby's whole capture
 * is 17 records — three class lookups, one six-edge instance connection,
 * and the six component nodes it references — which is already reviewable.
 * Every record id and field key is byte-identical to the capture,
 * including the quoted-argument storage keys
 * (`ontologyClass(uri:"ds:Component")`) and the positional edge ids.
 *
 * The counts frozen here (108 components, 41 patterns, 131 standards) are
 * a CAPTURE, not a contract: the graph moves (the 111->108 lesson). Unit
 * tests read them from this fixture; nothing asserts these numbers against
 * the live graph, and the e2e block asserts only structure and floors.
 *
 * Regenerate: boot `dev:bun`, then copy `relay.records` out of the
 * `__INITIAL_DATA__` script served at `/` — wholesale, no editing.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const lobbyRecords = {
  "client:https://ds.canonical.com/Component:instances(first:6)": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6)",
    __typename: "NodeConnection",
    edges: {
      __refs: [
        "client:https://ds.canonical.com/Component:instances(first:6):edges:0",
        "client:https://ds.canonical.com/Component:instances(first:6):edges:1",
        "client:https://ds.canonical.com/Component:instances(first:6):edges:2",
        "client:https://ds.canonical.com/Component:instances(first:6):edges:3",
        "client:https://ds.canonical.com/Component:instances(first:6):edges:4",
        "client:https://ds.canonical.com/Component:instances(first:6):edges:5",
      ],
    },
  },
  "client:https://ds.canonical.com/Component:instances(first:6):edges:0": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6):edges:0",
    __typename: "NodeEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.accordion",
    },
  },
  "client:https://ds.canonical.com/Component:instances(first:6):edges:1": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6):edges:1",
    __typename: "NodeEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.announcement",
    },
  },
  "client:https://ds.canonical.com/Component:instances(first:6):edges:2": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6):edges:2",
    __typename: "NodeEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_launchpad.component.avatar",
    },
  },
  "client:https://ds.canonical.com/Component:instances(first:6):edges:3": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6):edges:3",
    __typename: "NodeEdge",
    node: {
      __ref: "https://ds.canonical.com/global.component.avatar",
    },
  },
  "client:https://ds.canonical.com/Component:instances(first:6):edges:4": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6):edges:4",
    __typename: "NodeEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_lxd.component.back_link",
    },
  },
  "client:https://ds.canonical.com/Component:instances(first:6):edges:5": {
    __id: "client:https://ds.canonical.com/Component:instances(first:6):edges:5",
    __typename: "NodeEdge",
    node: {
      __ref: "https://ds.canonical.com/apps_launchpad.component.badge",
    },
  },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"ds:Component")': {
      __ref: "https://ds.canonical.com/Component",
    },
    'ontologyClass(uri:"ds:Pattern")': {
      __ref: "https://ds.canonical.com/Pattern",
    },
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
  },
  "http://pragma.canonical.com/codestandards#CodeStandard": {
    __id: "http://pragma.canonical.com/codestandards#CodeStandard",
    __typename: "OntologyClass",
    instanceCount: 144,
    uri: "http://pragma.canonical.com/codestandards#CodeStandard",
  },
  "https://ds.canonical.com/Component": {
    __id: "https://ds.canonical.com/Component",
    __typename: "OntologyClass",
    instanceCount: 109,
    "instances(first:6)": {
      __ref: "client:https://ds.canonical.com/Component:instances(first:6)",
    },
    uri: "https://ds.canonical.com/Component",
  },
  "https://ds.canonical.com/Pattern": {
    __id: "https://ds.canonical.com/Pattern",
    __typename: "OntologyClass",
    instanceCount: 42,
    uri: "https://ds.canonical.com/Pattern",
  },
  "https://ds.canonical.com/apps_launchpad.component.avatar": {
    __id: "https://ds.canonical.com/apps_launchpad.component.avatar",
    __typename: "Component",
    uri: "https://ds.canonical.com/apps_launchpad.component.avatar",
    name: "Avatar",
  },
  "https://ds.canonical.com/apps_launchpad.component.badge": {
    __id: "https://ds.canonical.com/apps_launchpad.component.badge",
    __typename: "Component",
    uri: "https://ds.canonical.com/apps_launchpad.component.badge",
    name: "Badge",
  },
  "https://ds.canonical.com/apps_lxd.component.back_link": {
    __id: "https://ds.canonical.com/apps_lxd.component.back_link",
    __typename: "Component",
    uri: "https://ds.canonical.com/apps_lxd.component.back_link",
    name: "BackLink",
  },
  "https://ds.canonical.com/global.component.accordion": {
    __id: "https://ds.canonical.com/global.component.accordion",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.accordion",
    name: "Accordion",
  },
  "https://ds.canonical.com/global.component.announcement": {
    __id: "https://ds.canonical.com/global.component.announcement",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.announcement",
    name: "Announcement",
  },
  "https://ds.canonical.com/global.component.avatar": {
    __id: "https://ds.canonical.com/global.component.avatar",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.avatar",
    name: "Avatar",
  },
} as unknown as RecordMap;

export default lobbyRecords;
