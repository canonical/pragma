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
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"ds:Component")': {
      __ref: 'client:root:ontologyClass(uri:"ds:Component")',
    },
    'ontologyClass(uri:"ds:Pattern")': {
      __ref: 'client:root:ontologyClass(uri:"ds:Pattern")',
    },
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: 'client:root:ontologyClass(uri:"cs:CodeStandard")',
    },
  },
  'client:root:ontologyClass(uri:"ds:Component")': {
    __id: 'client:root:ontologyClass(uri:"ds:Component")',
    __typename: "OntologyClass",
    instanceCount: 108,
    "instances(first:6)": {
      __ref: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6)',
    },
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6)': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6)',
    __typename: "NodeConnection",
    edges: {
      __refs: [
        'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:0',
        'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:1',
        'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:2',
        'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:3',
        'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:4',
        'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:5',
      ],
    },
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:0': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:0',
    __typename: "NodeEdge",
    node: {
      __ref: "ds:global.component.accordion",
    },
  },
  "ds:global.component.accordion": {
    __id: "ds:global.component.accordion",
    __typename: "Component",
    uri: "ds:global.component.accordion",
    name: "Accordion",
    id: "ds:global.component.accordion",
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:1': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:1',
    __typename: "NodeEdge",
    node: {
      __ref: "ds:global.component.announcement",
    },
  },
  "ds:global.component.announcement": {
    __id: "ds:global.component.announcement",
    __typename: "Component",
    uri: "ds:global.component.announcement",
    name: "Announcement",
    id: "ds:global.component.announcement",
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:2': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:2',
    __typename: "NodeEdge",
    node: {
      __ref: "ds:apps_launchpad.component.avatar",
    },
  },
  "ds:apps_launchpad.component.avatar": {
    __id: "ds:apps_launchpad.component.avatar",
    __typename: "Component",
    uri: "ds:apps_launchpad.component.avatar",
    name: "Avatar",
    id: "ds:apps_launchpad.component.avatar",
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:3': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:3',
    __typename: "NodeEdge",
    node: {
      __ref: "ds:global.component.avatar",
    },
  },
  "ds:global.component.avatar": {
    __id: "ds:global.component.avatar",
    __typename: "Component",
    uri: "ds:global.component.avatar",
    name: "Avatar",
    id: "ds:global.component.avatar",
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:4': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:4',
    __typename: "NodeEdge",
    node: {
      __ref: "ds:apps_lxd.component.back_link",
    },
  },
  "ds:apps_lxd.component.back_link": {
    __id: "ds:apps_lxd.component.back_link",
    __typename: "Component",
    uri: "ds:apps_lxd.component.back_link",
    name: "BackLink",
    id: "ds:apps_lxd.component.back_link",
  },
  'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:5': {
    __id: 'client:root:ontologyClass(uri:"ds:Component"):instances(first:6):edges:5',
    __typename: "NodeEdge",
    node: {
      __ref: "ds:apps_launchpad.component.badge",
    },
  },
  "ds:apps_launchpad.component.badge": {
    __id: "ds:apps_launchpad.component.badge",
    __typename: "Component",
    uri: "ds:apps_launchpad.component.badge",
    name: "Badge",
    id: "ds:apps_launchpad.component.badge",
  },
  'client:root:ontologyClass(uri:"ds:Pattern")': {
    __id: 'client:root:ontologyClass(uri:"ds:Pattern")',
    __typename: "OntologyClass",
    instanceCount: 41,
  },
  'client:root:ontologyClass(uri:"cs:CodeStandard")': {
    __id: 'client:root:ontologyClass(uri:"cs:CodeStandard")',
    __typename: "OntologyClass",
    instanceCount: 131,
  },
} as unknown as RecordMap;

export default lobbyRecords;
