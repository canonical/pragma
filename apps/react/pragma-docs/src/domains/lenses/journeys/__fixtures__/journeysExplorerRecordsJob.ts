/**
 * A serialised Relay store snapshot for `JourneysExplorerQuery` at
 * { jobs: 100, pairings: 100, uri: "sem://design-system-docs#job.l3",
 * hasJob: true } — captured VERBATIM from a dev server's
 * `__INITIAL_DATA__.relay.records` at the percent-encoded job URL.
 *
 * Nothing trimmed. It is byte-for-byte the index capture
 * (`journeysExplorerRecords`) PLUS the one root field the selected
 * address adds — `job(uri: "…#job.l3")` — because the lens fetches the
 * whole demand model either way and selection is presentation over data
 * already in the store. The two fixtures are kept separate rather than
 * shared precisely so that difference stays visible: a store missing that
 * root field suspends, which is how this file came to exist.
 *
 * Regenerate: boot `dev:bun`, copy `relay.records` out of the
 * `__INITIAL_DATA__` script served at
 * /journeys/sem%3A%2F%2Fdesign-system-docs%23job.l3.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const journeysExplorerRecordsJob = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    "jobs(first:100)": {
      __ref: "client:root:jobs(first:100)",
    },
    "pairings(first:100)": {
      __ref: "client:root:pairings(first:100)",
    },
    "pairings(last:100)": {
      __ref: "client:root:pairings(last:100)",
    },
    personas: {
      __ref: "client:root:personas",
    },
    'job(uri:"sem://design-system-docs#job.l3")': {
      __ref: "sem://design-system-docs#job.l3",
    },
  },
  "client:root:jobs(first:100)": {
    __id: "client:root:jobs(first:100)",
    __typename: "JobConnection",
    edges: {
      __refs: [
        "client:root:jobs(first:100):edges:0",
        "client:root:jobs(first:100):edges:1",
        "client:root:jobs(first:100):edges:2",
        "client:root:jobs(first:100):edges:3",
        "client:root:jobs(first:100):edges:4",
        "client:root:jobs(first:100):edges:5",
        "client:root:jobs(first:100):edges:6",
        "client:root:jobs(first:100):edges:7",
        "client:root:jobs(first:100):edges:8",
        "client:root:jobs(first:100):edges:9",
        "client:root:jobs(first:100):edges:10",
        "client:root:jobs(first:100):edges:11",
        "client:root:jobs(first:100):edges:12",
        "client:root:jobs(first:100):edges:13",
        "client:root:jobs(first:100):edges:14",
        "client:root:jobs(first:100):edges:15",
        "client:root:jobs(first:100):edges:16",
        "client:root:jobs(first:100):edges:17",
        "client:root:jobs(first:100):edges:18",
        "client:root:jobs(first:100):edges:19",
        "client:root:jobs(first:100):edges:20",
        "client:root:jobs(first:100):edges:21",
        "client:root:jobs(first:100):edges:22",
        "client:root:jobs(first:100):edges:23",
        "client:root:jobs(first:100):edges:24",
        "client:root:jobs(first:100):edges:25",
        "client:root:jobs(first:100):edges:26",
        "client:root:jobs(first:100):edges:27",
        "client:root:jobs(first:100):edges:28",
        "client:root:jobs(first:100):edges:29",
        "client:root:jobs(first:100):edges:30",
        "client:root:jobs(first:100):edges:31",
        "client:root:jobs(first:100):edges:32",
        "client:root:jobs(first:100):edges:33",
        "client:root:jobs(first:100):edges:34",
        "client:root:jobs(first:100):edges:35",
        "client:root:jobs(first:100):edges:36",
        "client:root:jobs(first:100):edges:37",
        "client:root:jobs(first:100):edges:38",
        "client:root:jobs(first:100):edges:39",
        "client:root:jobs(first:100):edges:40",
        "client:root:jobs(first:100):edges:41",
        "client:root:jobs(first:100):edges:42",
        "client:root:jobs(first:100):edges:43",
        "client:root:jobs(first:100):edges:44",
        "client:root:jobs(first:100):edges:45",
        "client:root:jobs(first:100):edges:46",
        "client:root:jobs(first:100):edges:47",
        "client:root:jobs(first:100):edges:48",
        "client:root:jobs(first:100):edges:49",
        "client:root:jobs(first:100):edges:50",
        "client:root:jobs(first:100):edges:51",
      ],
    },
  },
  "client:root:jobs(first:100):edges:0": {
    __id: "client:root:jobs(first:100):edges:0",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.a1",
    },
  },
  "sem://design-system-docs#job.a1": {
    __id: "sem://design-system-docs#job.a1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.a1",
    story:
      "When I assess a portfolio, I want to audit an app's adoption — gap, off-system usage — so I can measure adoption with evidence, without stale manual audits.",
    acceptances: ["Audit:adoption(app) (deferred); agents get getAdoption"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.architect-pair",
    },
    id: "sem://design-system-docs#job.a1",
  },
  "sem://design-system-docs#coordinate.architect-pair": {
    __id: "sem://design-system-docs#coordinate.architect-pair",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.architect-pair",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.architect-pair:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.architect-pair:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.architect-pair:fluencies",
    },
    id: "sem://design-system-docs#coordinate.architect-pair",
  },
  "client:sem://design-system-docs#coordinate.architect-pair:actors": {
    __id: "client:sem://design-system-docs#coordinate.architect-pair:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.architect-pair:actors:edges:0",
        "client:sem://design-system-docs#coordinate.architect-pair:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.architect-pair:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.architect-pair:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "surface:Agent": {
    __id: "surface:Agent",
    __typename: "Actor",
    uri: "surface:Agent",
    id: "surface:Agent",
  },
  "client:sem://design-system-docs#coordinate.architect-pair:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.architect-pair:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "surface:Human": {
    __id: "surface:Human",
    __typename: "Actor",
    uri: "surface:Human",
    id: "surface:Human",
  },
  "client:sem://design-system-docs#coordinate.architect-pair:roles": {
    __id: "client:sem://design-system-docs#coordinate.architect-pair:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.architect-pair:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.architect-pair:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.architect-pair:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "sem://design-system-docs#role.architect": {
    __id: "sem://design-system-docs#role.architect",
    __typename: "Role",
    uri: "sem://design-system-docs#role.architect",
    id: "sem://design-system-docs#role.architect",
  },
  "client:sem://design-system-docs#coordinate.architect-pair:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.architect-pair:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:1": {
    __id: "client:root:jobs(first:100):edges:1",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.a2",
    },
  },
  "sem://design-system-docs#job.a2": {
    __id: "sem://design-system-docs#job.a2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.a2",
    story:
      "When adoption is on the table, I want to decide architectural fit with evidence, so I can commit confidently, without guessing.",
    acceptances: ["the positioning/maturity guide; Audit evidence (deferred)"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.stewardship",
    },
    id: "sem://design-system-docs#job.a2",
  },
  "sem://design-system-docs#coordinate.stewardship": {
    __id: "sem://design-system-docs#coordinate.stewardship",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.stewardship",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.stewardship:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.stewardship:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.stewardship:fluencies",
    },
    id: "sem://design-system-docs#coordinate.stewardship",
  },
  "client:sem://design-system-docs#coordinate.stewardship:actors": {
    __id: "client:sem://design-system-docs#coordinate.stewardship:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.stewardship:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.stewardship:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.stewardship:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.stewardship:roles": {
    __id: "client:sem://design-system-docs#coordinate.stewardship:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.stewardship:roles:edges:0",
        "client:sem://design-system-docs#coordinate.stewardship:roles:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.stewardship:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.stewardship:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.stewardship:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.stewardship:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "sem://design-system-docs#role.steward": {
    __id: "sem://design-system-docs#role.steward",
    __typename: "Role",
    uri: "sem://design-system-docs#role.steward",
    id: "sem://design-system-docs#role.steward",
  },
  "client:sem://design-system-docs#coordinate.stewardship:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.stewardship:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:2": {
    __id: "client:root:jobs(first:100):edges:2",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.a3",
    },
  },
  "sem://design-system-docs#job.a3": {
    __id: "sem://design-system-docs#job.a3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.a3",
    story:
      "When we adopt Pragma, I want a migration plan I can track, so I can execute the rollout, without unknowable effort up front.",
    acceptances: [
      "gap-to-plan (deferred); the migration guide; agents get the getAdoption delta",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.migration-pair",
    },
    id: "sem://design-system-docs#job.a3",
  },
  "sem://design-system-docs#coordinate.migration-pair": {
    __id: "sem://design-system-docs#coordinate.migration-pair",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.migration-pair",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.migration-pair:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.migration-pair:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.migration-pair:fluencies",
    },
    id: "sem://design-system-docs#coordinate.migration-pair",
  },
  "client:sem://design-system-docs#coordinate.migration-pair:actors": {
    __id: "client:sem://design-system-docs#coordinate.migration-pair:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.migration-pair:actors:edges:0",
        "client:sem://design-system-docs#coordinate.migration-pair:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.migration-pair:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.migration-pair:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.migration-pair:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.migration-pair:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.migration-pair:roles": {
    __id: "client:sem://design-system-docs#coordinate.migration-pair:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.migration-pair:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.migration-pair:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.migration-pair:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.migration-pair:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.migration-pair:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:3": {
    __id: "client:root:jobs(first:100):edges:3",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b1",
    },
  },
  "sem://design-system-docs#job.b1": {
    __id: "sem://design-system-docs#job.b1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b1",
    story:
      "When I start integrating, I want setup paths for existing or new apps, so I can get running fast, without trial and error.",
    acceptances: ["Guides:setup covers both existing and new"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer-pair",
    },
    id: "sem://design-system-docs#job.b1",
  },
  "sem://design-system-docs#coordinate.engineer-pair": {
    __id: "sem://design-system-docs#coordinate.engineer-pair",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.engineer-pair",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.engineer-pair:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.engineer-pair:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.engineer-pair:fluencies",
    },
    id: "sem://design-system-docs#coordinate.engineer-pair",
  },
  "client:sem://design-system-docs#coordinate.engineer-pair:actors": {
    __id: "client:sem://design-system-docs#coordinate.engineer-pair:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.engineer-pair:actors:edges:0",
        "client:sem://design-system-docs#coordinate.engineer-pair:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-pair:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.engineer-pair:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-pair:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.engineer-pair:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-pair:roles": {
    __id: "client:sem://design-system-docs#coordinate.engineer-pair:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-pair:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.engineer-pair:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:4": {
    __id: "client:root:jobs(first:100):edges:4",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b10",
    },
  },
  "sem://design-system-docs#job.b10": {
    __id: "sem://design-system-docs#job.b10",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b10",
    story:
      "When I write UI copy, I want to apply the content standards as I go, so I can produce consistent copy, without a separate review pass.",
    acceptances: [
      "Standards:content + the component's content section; agents get getStandards",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.word-makers",
    },
    id: "sem://design-system-docs#job.b10",
  },
  "sem://design-system-docs#coordinate.word-makers": {
    __id: "sem://design-system-docs#coordinate.word-makers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.word-makers",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.word-makers:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.word-makers:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.word-makers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.word-makers",
  },
  "client:sem://design-system-docs#coordinate.word-makers:actors": {
    __id: "client:sem://design-system-docs#coordinate.word-makers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.word-makers:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.word-makers:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.word-makers:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.word-makers:roles": {
    __id: "client:sem://design-system-docs#coordinate.word-makers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.word-makers:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.word-makers:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.word-makers:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "sem://design-system-docs#role.writer": {
    __id: "sem://design-system-docs#role.writer",
    __typename: "Role",
    uri: "sem://design-system-docs#role.writer",
    id: "sem://design-system-docs#role.writer",
  },
  "client:sem://design-system-docs#coordinate.word-makers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.word-makers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:5": {
    __id: "client:root:jobs(first:100):edges:5",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b11",
    },
  },
  "sem://design-system-docs#job.b11": {
    __id: "sem://design-system-docs#job.b11",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b11",
    story:
      "When a token value surprises me, I want to trace its cascade to the source, so I can understand where the value comes from, without guessing overrides.",
    acceptances: [
      "the cascade explorer + chip provenance on hover; agents get getCascade(token)",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.builder-pair",
    },
    id: "sem://design-system-docs#job.b11",
  },
  "sem://design-system-docs#coordinate.builder-pair": {
    __id: "sem://design-system-docs#coordinate.builder-pair",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.builder-pair",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.builder-pair:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.builder-pair:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.builder-pair:fluencies",
    },
    id: "sem://design-system-docs#coordinate.builder-pair",
  },
  "client:sem://design-system-docs#coordinate.builder-pair:actors": {
    __id: "client:sem://design-system-docs#coordinate.builder-pair:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.builder-pair:actors:edges:0",
        "client:sem://design-system-docs#coordinate.builder-pair:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.builder-pair:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.builder-pair:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.builder-pair:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.builder-pair:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.builder-pair:roles": {
    __id: "client:sem://design-system-docs#coordinate.builder-pair:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.builder-pair:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.builder-pair:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:6": {
    __id: "client:root:jobs(first:100):edges:6",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b12",
    },
  },
  "sem://design-system-docs#job.b12": {
    __id: "sem://design-system-docs#job.b12",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b12",
    story:
      "When I change a token, I want to see its consumers, so I can gauge the blast radius, without breaking things blindly.",
    acceptances: [
      "the referenced-by view + Neighborhood drill-in; agents get getConsumers(token)",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.system-readers",
    },
    id: "sem://design-system-docs#job.b12",
  },
  "sem://design-system-docs#coordinate.system-readers": {
    __id: "sem://design-system-docs#coordinate.system-readers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.system-readers",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.system-readers:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.system-readers:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.system-readers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.system-readers",
  },
  "client:sem://design-system-docs#coordinate.system-readers:actors": {
    __id: "client:sem://design-system-docs#coordinate.system-readers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.system-readers:actors:edges:0",
        "client:sem://design-system-docs#coordinate.system-readers:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.system-readers:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.system-readers:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.system-readers:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.system-readers:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.system-readers:roles": {
    __id: "client:sem://design-system-docs#coordinate.system-readers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.system-readers:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.system-readers:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.system-readers:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "client:sem://design-system-docs#coordinate.system-readers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.system-readers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:7": {
    __id: "client:root:jobs(first:100):edges:7",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b2",
    },
  },
  "sem://design-system-docs#job.b2": {
    __id: "sem://design-system-docs#job.b2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b2",
    story:
      "When I land on a component cold and need to integrate it, I want install + import + a working example, so I can render it in minutes, without reading conceptual docs first.",
    acceptances: [
      "the example compiles verbatim; the same data in one API call",
      "install + import + runnable example above the fold",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.builder-pair",
    },
    id: "sem://design-system-docs#job.b2",
  },
  "client:root:jobs(first:100):edges:8": {
    __id: "client:root:jobs(first:100):edges:8",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b3",
    },
  },
  "sem://design-system-docs#job.b3": {
    __id: "sem://design-system-docs#job.b3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b3",
    story:
      "When I pick a component, I want its canonical, maturity and parity status, so I can avoid betting on immature parts, without finding out in production.",
    acceptances: ["ambient status badge; parity view; agents get getStatus"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.change-watchers",
    },
    id: "sem://design-system-docs#job.b3",
  },
  "sem://design-system-docs#coordinate.change-watchers": {
    __id: "sem://design-system-docs#coordinate.change-watchers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.change-watchers",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.change-watchers:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.change-watchers:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.change-watchers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.change-watchers",
  },
  "client:sem://design-system-docs#coordinate.change-watchers:actors": {
    __id: "client:sem://design-system-docs#coordinate.change-watchers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.change-watchers:actors:edges:0",
        "client:sem://design-system-docs#coordinate.change-watchers:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.change-watchers:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.change-watchers:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.change-watchers:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.change-watchers:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.change-watchers:roles": {
    __id: "client:sem://design-system-docs#coordinate.change-watchers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.change-watchers:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.change-watchers:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.change-watchers:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.change-watchers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.change-watchers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:9": {
    __id: "client:root:jobs(first:100):edges:9",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b4",
    },
  },
  "sem://design-system-docs#job.b4": {
    __id: "sem://design-system-docs#job.b4",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b4",
    story:
      "When I implement a component, I want its accessibility contract, so I can ship conformant UI, without auditing from scratch.",
    acceptances: [
      "a11y section on the component page; agents get getConformance(entity)",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.builder-pair",
    },
    id: "sem://design-system-docs#job.b4",
  },
  "client:root:jobs(first:100):edges:10": {
    __id: "client:root:jobs(first:100):edges:10",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b5",
    },
  },
  "sem://design-system-docs#job.b5": {
    __id: "sem://design-system-docs#job.b5",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b5",
    story:
      "When I make visual decisions, I want to browse the token catalog and its rules, so I can design consistently, without hardcoding values.",
    acceptances: [
      "the Tokens surface lists tokens + rules; agents get listTokens",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.b5",
  },
  "sem://design-system-docs#coordinate.maker-duo": {
    __id: "sem://design-system-docs#coordinate.maker-duo",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.maker-duo",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.maker-duo:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.maker-duo:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.maker-duo:fluencies",
    },
    id: "sem://design-system-docs#coordinate.maker-duo",
  },
  "client:sem://design-system-docs#coordinate.maker-duo:actors": {
    __id: "client:sem://design-system-docs#coordinate.maker-duo:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.maker-duo:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.maker-duo:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.maker-duo:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.maker-duo:roles": {
    __id: "client:sem://design-system-docs#coordinate.maker-duo:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.maker-duo:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.maker-duo:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:11": {
    __id: "client:root:jobs(first:100):edges:11",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b6",
    },
  },
  "sem://design-system-docs#job.b6": {
    __id: "sem://design-system-docs#job.b6",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b6",
    story:
      "When I style a component, I want to pair the right tokens to it, so I can stay consistent with the system, without ad-hoc choices.",
    acceptances: [
      "the cascade + the component's tokens section; agents get getTokens(entity)",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.b6",
  },
  "client:root:jobs(first:100):edges:12": {
    __id: "client:root:jobs(first:100):edges:12",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b7",
    },
  },
  "sem://design-system-docs#job.b7": {
    __id: "sem://design-system-docs#job.b7",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b7",
    story:
      "When I brand an app, I want to theme type and colors from tokens, so I can express identity within the system, without breaking consistency.",
    acceptances: [
      "Guides:theming; the Tokens configurator (deferred); DTCG export",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.b7",
  },
  "client:root:jobs(first:100):edges:13": {
    __id: "client:root:jobs(first:100):edges:13",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b8",
    },
  },
  "sem://design-system-docs#job.b8": {
    __id: "sem://design-system-docs#job.b8",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b8",
    story:
      "When I hit an unfamiliar term while working, I want an inline definition I can reveal in place, with optional depth, so I can keep going, without context-switching to a glossary.",
    acceptances: [
      "agents get the same via the self-describing schema",
      "every term is a hoverable label; click resolves to the canonical definition",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.copy-makers",
    },
    id: "sem://design-system-docs#job.b8",
  },
  "sem://design-system-docs#coordinate.copy-makers": {
    __id: "sem://design-system-docs#coordinate.copy-makers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.copy-makers",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.copy-makers:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.copy-makers:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.copy-makers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.copy-makers",
  },
  "client:sem://design-system-docs#coordinate.copy-makers:actors": {
    __id: "client:sem://design-system-docs#coordinate.copy-makers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.copy-makers:actors:edges:0",
        "client:sem://design-system-docs#coordinate.copy-makers:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.copy-makers:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.copy-makers:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.copy-makers:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.copy-makers:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.copy-makers:roles": {
    __id: "client:sem://design-system-docs#coordinate.copy-makers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.copy-makers:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.copy-makers:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.copy-makers:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "client:sem://design-system-docs#coordinate.copy-makers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.copy-makers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:14": {
    __id: "client:root:jobs(first:100):edges:14",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.b9",
    },
  },
  "sem://design-system-docs#job.b9": {
    __id: "sem://design-system-docs#job.b9",
    __typename: "Job",
    uri: "sem://design-system-docs#job.b9",
    story:
      "When I need everything about an entity at once, I want one query returning summary, props, modifiers, anatomy, and implementations, so I can reason holistically, without N round-trips.",
    acceptances: [
      "one GraphQL query returns the cross-ontology dossier; the CLI returns the equivalent",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.agent",
    },
    id: "sem://design-system-docs#job.b9",
  },
  "sem://design-system-docs#coordinate.agent": {
    __id: "sem://design-system-docs#coordinate.agent",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.agent",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.agent:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.agent:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.agent:fluencies",
    },
    id: "sem://design-system-docs#coordinate.agent",
  },
  "client:sem://design-system-docs#coordinate.agent:actors": {
    __id: "client:sem://design-system-docs#coordinate.agent:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.agent:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.agent:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.agent:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.agent:roles": {
    __id: "client:sem://design-system-docs#coordinate.agent:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.agent:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.agent:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:15": {
    __id: "client:root:jobs(first:100):edges:15",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.c1",
    },
  },
  "sem://design-system-docs#job.c1": {
    __id: "sem://design-system-docs#job.c1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.c1",
    story:
      "When I have a component to add, I want to contribute it at the right tier, so I can extend the system cleanly, without violating governance.",
    acceptances: [
      "the contribute guide + routes; Definitions shows what to fill",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.c1",
  },
  "client:root:jobs(first:100):edges:16": {
    __id: "client:root:jobs(first:100):edges:16",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.c2",
    },
  },
  "sem://design-system-docs#job.c2": {
    __id: "sem://design-system-docs#job.c2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.c2",
    story:
      "When I design a new component, I want to spec it and choose consistent tokens, so I can align it with the system, without reinventing decisions.",
    acceptances: ["the class shape guides the spec; introspection twin"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.c2",
  },
  "client:root:jobs(first:100):edges:17": {
    __id: "client:root:jobs(first:100):edges:17",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.c3",
    },
  },
  "sem://design-system-docs#job.c3": {
    __id: "sem://design-system-docs#job.c3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.c3",
    story:
      "When a local component proves broadly useful, I want to upstream it to a higher tier, so I can share it, without a rewrite.",
    acceptances: ["the upstream guide + routes; Audit readiness (deferred)"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.c3",
  },
  "client:root:jobs(first:100):edges:18": {
    __id: "client:root:jobs(first:100):edges:18",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.c4",
    },
  },
  "sem://design-system-docs#job.c4": {
    __id: "sem://design-system-docs#job.c4",
    __typename: "Job",
    uri: "sem://design-system-docs#job.c4",
    story:
      "When I want to contribute code, I want the code standards and architecture, so I can meet the bar, without guessing conventions.",
    acceptances: [
      "Standards:code; chips to exemplar components; agents get getStandards",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.c4",
  },
  "client:root:jobs(first:100):edges:19": {
    __id: "client:root:jobs(first:100):edges:19",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.c5",
    },
  },
  "sem://design-system-docs#job.c5": {
    __id: "sem://design-system-docs#job.c5",
    __typename: "Job",
    uri: "sem://design-system-docs#job.c5",
    story:
      "When I spot a gap or a better pattern, I want to propose standardization or an architecture change, so I can improve the system bottom-up, without a side channel.",
    acceptances: ["the proposal route; an Audit report as evidence (deferred)"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.c5",
  },
  "client:root:jobs(first:100):edges:20": {
    __id: "client:root:jobs(first:100):edges:20",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.c6",
    },
  },
  "sem://design-system-docs#job.c6": {
    __id: "sem://design-system-docs#job.c6",
    __typename: "Job",
    uri: "sem://design-system-docs#job.c6",
    story:
      "When terminology is missing or wrong, I want to contribute copy or propose a term, so I can keep language consistent, without forking vocabulary.",
    acceptances: ["Standards:content + the contribute route"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.word-makers",
    },
    id: "sem://design-system-docs#job.c6",
  },
  "client:root:jobs(first:100):edges:21": {
    __id: "client:root:jobs(first:100):edges:21",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.cli-scaffold",
    },
  },
  "sem://design-system-docs#job.cli-scaffold": {
    __id: "sem://design-system-docs#job.cli-scaffold",
    __typename: "Job",
    uri: "sem://design-system-docs#job.cli-scaffold",
    story:
      "When I start a new component, I want it scaffolded to standard in one command, so I can begin at the interesting part, without copying boilerplate from an old one.",
    acceptances: [
      "pragma create component <name> emits the standard shape; --undo reverses cleanly",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer-agent",
    },
    id: "sem://design-system-docs#job.cli-scaffold",
  },
  "sem://design-system-docs#coordinate.engineer-agent": {
    __id: "sem://design-system-docs#coordinate.engineer-agent",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.engineer-agent",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.engineer-agent:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.engineer-agent:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.engineer-agent:fluencies",
    },
    id: "sem://design-system-docs#coordinate.engineer-agent",
  },
  "client:sem://design-system-docs#coordinate.engineer-agent:actors": {
    __id: "client:sem://design-system-docs#coordinate.engineer-agent:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.engineer-agent:actors:edges:0",
        "client:sem://design-system-docs#coordinate.engineer-agent:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-agent:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.engineer-agent:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-agent:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.engineer-agent:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-agent:roles": {
    __id: "client:sem://design-system-docs#coordinate.engineer-agent:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer-agent:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.engineer-agent:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:22": {
    __id: "client:root:jobs(first:100):edges:22",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.cli-wire-tokens",
    },
  },
  "sem://design-system-docs#job.cli-wire-tokens": {
    __id: "sem://design-system-docs#job.cli-wire-tokens",
    __typename: "Job",
    uri: "sem://design-system-docs#job.cli-wire-tokens",
    story:
      "When I adopt the token system, I want the build config generated for my project, so I can consume tokens natively, without hand-writing pipeline config.",
    acceptances: [
      "token add-config produces a working Terrazzo setup against the pinned tier",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer",
    },
    id: "sem://design-system-docs#job.cli-wire-tokens",
  },
  "sem://design-system-docs#coordinate.engineer": {
    __id: "sem://design-system-docs#coordinate.engineer",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.engineer",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.engineer:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.engineer:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.engineer:fluencies",
    },
    id: "sem://design-system-docs#coordinate.engineer",
  },
  "client:sem://design-system-docs#coordinate.engineer:actors": {
    __id: "client:sem://design-system-docs#coordinate.engineer:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.engineer:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.engineer:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.engineer:roles": {
    __id: "client:sem://design-system-docs#coordinate.engineer:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.engineer:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.engineer:fluencies:edges:0",
        "client:sem://design-system-docs#coordinate.engineer:fluencies:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.engineer:fluencies:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.engineer:fluencies:edges:0",
    __typename: "FluencyEdge",
    node: {
      __ref: "surface:Fluent",
    },
  },
  "surface:Fluent": {
    __id: "surface:Fluent",
    __typename: "Fluency",
    uri: "surface:Fluent",
    id: "surface:Fluent",
  },
  "client:sem://design-system-docs#coordinate.engineer:fluencies:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.engineer:fluencies:edges:1",
    __typename: "FluencyEdge",
    node: {
      __ref: "surface:Newcomer",
    },
  },
  "surface:Newcomer": {
    __id: "surface:Newcomer",
    __typename: "Fluency",
    uri: "surface:Newcomer",
    id: "surface:Newcomer",
  },
  "client:root:jobs(first:100):edges:23": {
    __id: "client:root:jobs(first:100):edges:23",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.cli-health",
    },
  },
  "sem://design-system-docs#job.cli-health": {
    __id: "sem://design-system-docs#job.cli-health",
    __typename: "Job",
    uri: "sem://design-system-docs#job.cli-health",
    story:
      "When something feels misconfigured, I want a checklist verdict with remedies, so I can fix it in minutes, without spelunking config files.",
    acceptances: ["doctor names each failing check and its remedy"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer",
    },
    id: "sem://design-system-docs#job.cli-health",
  },
  "client:root:jobs(first:100):edges:24": {
    __id: "client:root:jobs(first:100):edges:24",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.cli-setup",
    },
  },
  "sem://design-system-docs#job.cli-setup": {
    __id: "sem://design-system-docs#job.cli-setup",
    __typename: "Job",
    uri: "sem://design-system-docs#job.cli-setup",
    story:
      "When I work with an AI editor, I want the design system wired into it as an MCP server with skills, so I can get grounded answers in-flow, without pasting docs into prompts.",
    acceptances: [
      "setup mcp configures the harness; the agent answers from the graph afterwards",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.builder-pair",
    },
    id: "sem://design-system-docs#job.cli-setup",
  },
  "client:root:jobs(first:100):edges:25": {
    __id: "client:root:jobs(first:100):edges:25",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.cli-pin",
    },
  },
  "sem://design-system-docs#job.cli-pin": {
    __id: "sem://design-system-docs#job.cli-pin",
    __typename: "Job",
    uri: "sem://design-system-docs#job.cli-pin",
    story:
      "When my project targets a tier and channel, I want to pin them once, so I can see only what applies to me, without filtering every listing by hand.",
    acceptances: ["config tier/channel persists; listings respect the pin"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer",
    },
    id: "sem://design-system-docs#job.cli-pin",
  },
  "client:root:jobs(first:100):edges:26": {
    __id: "client:root:jobs(first:100):edges:26",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l1",
    },
  },
  "sem://design-system-docs#job.l1": {
    __id: "sem://design-system-docs#job.l1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l1",
    story:
      "When I first encounter Pragma, I want to grasp what it is and why it beats vanilla or Tailwind, so I can decide it's worth learning, without wading through reference docs.",
    acceptances: [
      "the reframe hero states the value prop, positioned vs alternatives",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.first-encounter",
    },
    id: "sem://design-system-docs#job.l1",
  },
  "sem://design-system-docs#coordinate.first-encounter": {
    __id: "sem://design-system-docs#coordinate.first-encounter",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.first-encounter",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.first-encounter:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.first-encounter:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.first-encounter:fluencies",
    },
    id: "sem://design-system-docs#coordinate.first-encounter",
  },
  "client:sem://design-system-docs#coordinate.first-encounter:actors": {
    __id: "client:sem://design-system-docs#coordinate.first-encounter:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.first-encounter:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.first-encounter:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.first-encounter:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.first-encounter:roles": {
    __id: "client:sem://design-system-docs#coordinate.first-encounter:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.first-encounter:roles:edges:0",
        "client:sem://design-system-docs#coordinate.first-encounter:roles:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.first-encounter:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.first-encounter:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.first-encounter:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.first-encounter:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "client:sem://design-system-docs#coordinate.first-encounter:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.first-encounter:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.first-encounter:fluencies:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.first-encounter:fluencies:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.first-encounter:fluencies:edges:0",
      __typename: "FluencyEdge",
      node: {
        __ref: "surface:Newcomer",
      },
    },
  "client:root:jobs(first:100):edges:27": {
    __id: "client:root:jobs(first:100):edges:27",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l10",
    },
  },
  "sem://design-system-docs#job.l10": {
    __id: "sem://design-system-docs#job.l10",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l10",
    story:
      "When I work with a class, I want its fields, constraints and meaning, so I can use it correctly, without guessing its shape.",
    acceptances: [
      "the class page shows fields + constraints; introspection twin",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.system-readers",
    },
    id: "sem://design-system-docs#job.l10",
  },
  "client:root:jobs(first:100):edges:28": {
    __id: "client:root:jobs(first:100):edges:28",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l11",
    },
  },
  "sem://design-system-docs#job.l11": {
    __id: "sem://design-system-docs#job.l11",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l11",
    story:
      "When two concepts seem related, I want to trace the path connecting them, so I can understand the relationship, without manually cross-referencing.",
    acceptances: [
      "the schema graph shows the connection; Neighborhood drill-in",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.structure-minded",
    },
    id: "sem://design-system-docs#job.l11",
  },
  "sem://design-system-docs#coordinate.structure-minded": {
    __id: "sem://design-system-docs#coordinate.structure-minded",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.structure-minded",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.structure-minded:actors",
    },
    roles: {
      __ref:
        "client:sem://design-system-docs#coordinate.structure-minded:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.structure-minded:fluencies",
    },
    id: "sem://design-system-docs#coordinate.structure-minded",
  },
  "client:sem://design-system-docs#coordinate.structure-minded:actors": {
    __id: "client:sem://design-system-docs#coordinate.structure-minded:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.structure-minded:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.structure-minded:actors:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.structure-minded:actors:edges:0",
      __typename: "ActorEdge",
      node: {
        __ref: "surface:Human",
      },
    },
  "client:sem://design-system-docs#coordinate.structure-minded:roles": {
    __id: "client:sem://design-system-docs#coordinate.structure-minded:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.structure-minded:roles:edges:0",
        "client:sem://design-system-docs#coordinate.structure-minded:roles:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.structure-minded:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.structure-minded:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.structure-minded:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.structure-minded:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "client:sem://design-system-docs#coordinate.structure-minded:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.structure-minded:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:29": {
    __id: "client:root:jobs(first:100):edges:29",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l12",
    },
  },
  "sem://design-system-docs#job.l12": {
    __id: "sem://design-system-docs#job.l12",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l12",
    story:
      "When a new version ships, I want releases, deprecations and breaking changes, so I can update safely, without being surprised.",
    acceptances: [
      "Changelog page + status dots + drift overlay; a release feed for agents",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.change-watchers",
    },
    id: "sem://design-system-docs#job.l12",
  },
  "client:root:jobs(first:100):edges:30": {
    __id: "client:root:jobs(first:100):edges:30",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l2",
    },
  },
  "sem://design-system-docs#job.l2": {
    __id: "sem://design-system-docs#job.l2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l2",
    story:
      "When I'm new to the system, I want the foundations — layout, type, spacing, color, a11y — in one place, so I can design and build on solid ground, without guessing conventions.",
    acceptances: [
      "the foundations guide covers all five; chips link out to Components and Standards",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.new-makers",
    },
    id: "sem://design-system-docs#job.l2",
  },
  "sem://design-system-docs#coordinate.new-makers": {
    __id: "sem://design-system-docs#coordinate.new-makers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.new-makers",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.new-makers:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.new-makers:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.new-makers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.new-makers",
  },
  "client:sem://design-system-docs#coordinate.new-makers:actors": {
    __id: "client:sem://design-system-docs#coordinate.new-makers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.new-makers:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.new-makers:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.new-makers:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.new-makers:roles": {
    __id: "client:sem://design-system-docs#coordinate.new-makers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.new-makers:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.new-makers:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.new-makers:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "client:sem://design-system-docs#coordinate.new-makers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.new-makers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.new-makers:fluencies:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.new-makers:fluencies:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.new-makers:fluencies:edges:0",
    __typename: "FluencyEdge",
    node: {
      __ref: "surface:Newcomer",
    },
  },
  "client:root:jobs(first:100):edges:31": {
    __id: "client:root:jobs(first:100):edges:31",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l3",
    },
  },
  "sem://design-system-docs#job.l3": {
    __id: "sem://design-system-docs#job.l3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l3",
    story:
      "When I don't yet know what exists, I want to browse and filter the full catalog, so I can find what exists and what it does, without reading source.",
    acceptances: ["listing + filters; Cmd-K; agents get listEntities"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.builder-pair",
    },
    id: "sem://design-system-docs#job.l3",
  },
  "client:root:jobs(first:100):edges:32": {
    __id: "client:root:jobs(first:100):edges:32",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l4",
    },
  },
  "sem://design-system-docs#job.l4": {
    __id: "sem://design-system-docs#job.l4",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l4",
    story:
      "When I know a component from another system, I want to look up Pragma's equivalent by synonym, so I can map my knowledge over, without learning new names blind.",
    acceptances: [
      "analog-map + Cmd-K synonyms resolve X to the Pragma component",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.analog-seekers",
    },
    id: "sem://design-system-docs#job.l4",
  },
  "sem://design-system-docs#coordinate.analog-seekers": {
    __id: "sem://design-system-docs#coordinate.analog-seekers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.analog-seekers",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.analog-seekers:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.analog-seekers:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.analog-seekers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.analog-seekers",
  },
  "client:sem://design-system-docs#coordinate.analog-seekers:actors": {
    __id: "client:sem://design-system-docs#coordinate.analog-seekers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.analog-seekers:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.analog-seekers:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.analog-seekers:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.analog-seekers:roles": {
    __id: "client:sem://design-system-docs#coordinate.analog-seekers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.analog-seekers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.analog-seekers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.analog-seekers:fluencies:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.analog-seekers:fluencies:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.analog-seekers:fluencies:edges:0",
      __typename: "FluencyEdge",
      node: {
        __ref: "surface:Newcomer",
      },
    },
  "client:root:jobs(first:100):edges:33": {
    __id: "client:root:jobs(first:100):edges:33",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l5",
    },
  },
  "sem://design-system-docs#job.l5": {
    __id: "sem://design-system-docs#job.l5",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l5",
    story:
      "When I'm evaluating or learning, I want to see real interfaces built with Pragma, so I can picture what's possible, without imagining it abstractly.",
    acceptances: ["a showcase gallery of example interfaces"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.all-disciplines",
    },
    id: "sem://design-system-docs#job.l5",
  },
  "sem://design-system-docs#coordinate.all-disciplines": {
    __id: "sem://design-system-docs#coordinate.all-disciplines",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.all-disciplines",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.all-disciplines:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.all-disciplines:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.all-disciplines:fluencies",
    },
    id: "sem://design-system-docs#coordinate.all-disciplines",
  },
  "client:sem://design-system-docs#coordinate.all-disciplines:actors": {
    __id: "client:sem://design-system-docs#coordinate.all-disciplines:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.all-disciplines:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.all-disciplines:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.all-disciplines:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.all-disciplines:roles": {
    __id: "client:sem://design-system-docs#coordinate.all-disciplines:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.all-disciplines:roles:edges:0",
        "client:sem://design-system-docs#coordinate.all-disciplines:roles:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.all-disciplines:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.all-disciplines:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.all-disciplines:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.all-disciplines:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "client:sem://design-system-docs#coordinate.all-disciplines:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.all-disciplines:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:34": {
    __id: "client:root:jobs(first:100):edges:34",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l6",
    },
  },
  "sem://design-system-docs#job.l6": {
    __id: "sem://design-system-docs#job.l6",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l6",
    story:
      "When I use a component, I want its dos and don'ts, so I can apply it correctly, without discovering misuse later.",
    acceptances: [
      "guidelines section on the component page; agents get getGuidance",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.makers-and-writers",
    },
    id: "sem://design-system-docs#job.l6",
  },
  "sem://design-system-docs#coordinate.makers-and-writers": {
    __id: "sem://design-system-docs#coordinate.makers-and-writers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.makers-and-writers",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.makers-and-writers:actors",
    },
    roles: {
      __ref:
        "client:sem://design-system-docs#coordinate.makers-and-writers:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.makers-and-writers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.makers-and-writers",
  },
  "client:sem://design-system-docs#coordinate.makers-and-writers:actors": {
    __id: "client:sem://design-system-docs#coordinate.makers-and-writers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.makers-and-writers:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.makers-and-writers:actors:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.makers-and-writers:actors:edges:0",
      __typename: "ActorEdge",
      node: {
        __ref: "surface:Human",
      },
    },
  "client:sem://design-system-docs#coordinate.makers-and-writers:roles": {
    __id: "client:sem://design-system-docs#coordinate.makers-and-writers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.makers-and-writers:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.makers-and-writers:roles:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.makers-and-writers:roles:edges:0",
      __typename: "RoleEdge",
      node: {
        __ref: "sem://design-system-docs#role.writer",
      },
    },
  "client:sem://design-system-docs#coordinate.makers-and-writers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.makers-and-writers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:35": {
    __id: "client:root:jobs(first:100):edges:35",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l7",
    },
  },
  "sem://design-system-docs#job.l7": {
    __id: "sem://design-system-docs#job.l7",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l7",
    story:
      "When a rule feels arbitrary, I want the rationale behind the principle, so I can trust and apply it, without treating it as dogma.",
    acceptances: [
      "principles guide, chip-entered, carries the reasoning; Definitions for depth",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.rationale-seekers",
    },
    id: "sem://design-system-docs#job.l7",
  },
  "sem://design-system-docs#coordinate.rationale-seekers": {
    __id: "sem://design-system-docs#coordinate.rationale-seekers",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.rationale-seekers",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.rationale-seekers:actors",
    },
    roles: {
      __ref:
        "client:sem://design-system-docs#coordinate.rationale-seekers:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.rationale-seekers:fluencies",
    },
    id: "sem://design-system-docs#coordinate.rationale-seekers",
  },
  "client:sem://design-system-docs#coordinate.rationale-seekers:actors": {
    __id: "client:sem://design-system-docs#coordinate.rationale-seekers:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.rationale-seekers:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.rationale-seekers:actors:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.rationale-seekers:actors:edges:0",
      __typename: "ActorEdge",
      node: {
        __ref: "surface:Human",
      },
    },
  "client:sem://design-system-docs#coordinate.rationale-seekers:roles": {
    __id: "client:sem://design-system-docs#coordinate.rationale-seekers:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:0",
        "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:1",
        "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:2",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:0",
      __typename: "RoleEdge",
      node: {
        __ref: "sem://design-system-docs#role.architect",
      },
    },
  "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:1":
    {
      __id: "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:1",
      __typename: "RoleEdge",
      node: {
        __ref: "sem://design-system-docs#role.steward",
      },
    },
  "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:2":
    {
      __id: "client:sem://design-system-docs#coordinate.rationale-seekers:roles:edges:2",
      __typename: "RoleEdge",
      node: {
        __ref: "sem://design-system-docs#role.writer",
      },
    },
  "client:sem://design-system-docs#coordinate.rationale-seekers:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.rationale-seekers:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.rationale-seekers:fluencies:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.rationale-seekers:fluencies:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.rationale-seekers:fluencies:edges:0",
      __typename: "FluencyEdge",
      node: {
        __ref: "surface:Expert",
      },
    },
  "surface:Expert": {
    __id: "surface:Expert",
    __typename: "Fluency",
    uri: "surface:Expert",
    id: "surface:Expert",
  },
  "client:root:jobs(first:100):edges:36": {
    __id: "client:root:jobs(first:100):edges:36",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l8",
    },
  },
  "sem://design-system-docs#job.l8": {
    __id: "sem://design-system-docs#job.l8",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l8",
    story:
      "When I write product copy, I want the content standards — voice, capitalization, terminology — so I can write on-brand, without inventing conventions.",
    acceptances: [
      "Standards:content covers voice, caps, terminology; agents get getStandards",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.word-makers",
    },
    id: "sem://design-system-docs#job.l8",
  },
  "client:root:jobs(first:100):edges:37": {
    __id: "client:root:jobs(first:100):edges:37",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.l9",
    },
  },
  "sem://design-system-docs#job.l9": {
    __id: "sem://design-system-docs#job.l9",
    __typename: "Job",
    uri: "sem://design-system-docs#job.l9",
    story:
      "When I need to understand the system's structure, I want to explore the model's classes and relations, so I can reason about the whole, without reverse-engineering it.",
    acceptances: [
      "the Definitions explorer is browsable; schema introspection for agents",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.guild-and-agents",
    },
    id: "sem://design-system-docs#job.l9",
  },
  "sem://design-system-docs#coordinate.guild-and-agents": {
    __id: "sem://design-system-docs#coordinate.guild-and-agents",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.guild-and-agents",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.guild-and-agents:actors",
    },
    roles: {
      __ref:
        "client:sem://design-system-docs#coordinate.guild-and-agents:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.guild-and-agents:fluencies",
    },
    id: "sem://design-system-docs#coordinate.guild-and-agents",
  },
  "client:sem://design-system-docs#coordinate.guild-and-agents:actors": {
    __id: "client:sem://design-system-docs#coordinate.guild-and-agents:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.guild-and-agents:actors:edges:0",
        "client:sem://design-system-docs#coordinate.guild-and-agents:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.guild-and-agents:actors:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.guild-and-agents:actors:edges:0",
      __typename: "ActorEdge",
      node: {
        __ref: "surface:Agent",
      },
    },
  "client:sem://design-system-docs#coordinate.guild-and-agents:actors:edges:1":
    {
      __id: "client:sem://design-system-docs#coordinate.guild-and-agents:actors:edges:1",
      __typename: "ActorEdge",
      node: {
        __ref: "surface:Human",
      },
    },
  "client:sem://design-system-docs#coordinate.guild-and-agents:roles": {
    __id: "client:sem://design-system-docs#coordinate.guild-and-agents:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:0",
        "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:1",
        "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:2",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:2": {
    __id: "client:sem://design-system-docs#coordinate.guild-and-agents:roles:edges:2",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "client:sem://design-system-docs#coordinate.guild-and-agents:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.guild-and-agents:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:38": {
    __id: "client:root:jobs(first:100):edges:38",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.q1",
    },
  },
  "sem://design-system-docs#job.q1": {
    __id: "sem://design-system-docs#job.q1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.q1",
    story:
      "When I know roughly what I want, I want to search by name or synonym from wherever I am, so I can land on the thing itself, without walking a navigation tree.",
    acceptances: [
      "results ranked across entities, synonyms and prose; reached from every page; agents call search(q) on both ports",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.guild-and-agents",
    },
    id: "sem://design-system-docs#job.q1",
  },
  "client:root:jobs(first:100):edges:39": {
    __id: "client:root:jobs(first:100):edges:39",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.q2",
    },
  },
  "sem://design-system-docs#job.q2": {
    __id: "sem://design-system-docs#job.q2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.q2",
    story:
      "When I've found a candidate component, I want to judge in one screen whether it fits my need, so I can commit or move on, without integrating it to find out.",
    acceptances: [
      "a catalog card answers what-it-is + status at a glance; the detail page answers fit above the fold",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.q2",
  },
  "client:root:jobs(first:100):edges:40": {
    __id: "client:root:jobs(first:100):edges:40",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.q3",
    },
  },
  "sem://design-system-docs#job.q3": {
    __id: "sem://design-system-docs#job.q3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.q3",
    story:
      "When a release breaks my app, I want what changed paired with what I must do, so I can act on it, without diffing source.",
    acceptances: [
      "each breaking change names its remedy; the release feed carries the same pairing for agents",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer-pair",
    },
    id: "sem://design-system-docs#job.q3",
  },
  "client:root:jobs(first:100):edges:41": {
    __id: "client:root:jobs(first:100):edges:41",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.q4",
    },
  },
  "sem://design-system-docs#job.q4": {
    __id: "sem://design-system-docs#job.q4",
    __typename: "Job",
    uri: "sem://design-system-docs#job.q4",
    story:
      "When a page fails me, I want to say so right there in one gesture, so I can improve it cheaply, without filing a formal bug.",
    acceptances: [
      "a one-gesture feedback affordance on every page, anchored at the page it judges",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.whole-guild",
    },
    id: "sem://design-system-docs#job.q4",
  },
  "sem://design-system-docs#coordinate.whole-guild": {
    __id: "sem://design-system-docs#coordinate.whole-guild",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.whole-guild",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.whole-guild:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.whole-guild:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.whole-guild:fluencies",
    },
    id: "sem://design-system-docs#coordinate.whole-guild",
  },
  "client:sem://design-system-docs#coordinate.whole-guild:actors": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.whole-guild:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.whole-guild:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.whole-guild:roles": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:0",
        "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:1",
        "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:2",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:2": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:roles:edges:2",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.writer",
    },
  },
  "client:sem://design-system-docs#coordinate.whole-guild:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.whole-guild:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:42": {
    __id: "client:root:jobs(first:100):edges:42",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.q5",
    },
  },
  "sem://design-system-docs#job.q5": {
    __id: "sem://design-system-docs#job.q5",
    __typename: "Job",
    uri: "sem://design-system-docs#job.q5",
    story:
      "When my network is restricted, I want the reference to keep working, so I can keep building, without an exception request.",
    acceptances: ["the reference remains usable without reaching the site"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.engineer",
    },
    id: "sem://design-system-docs#job.q5",
  },
  "client:root:jobs(first:100):edges:43": {
    __id: "client:root:jobs(first:100):edges:43",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.s1",
    },
  },
  "sem://design-system-docs#job.s1": {
    __id: "sem://design-system-docs#job.s1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.s1",
    story:
      "When I steward the system, I want a coverage audit — WCAG AA across all, token consistency — so I can know its true state, without manual audits.",
    acceptances: [
      "Audit:coverage (deferred); chips into Components from report rows; agents get getCoverage",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.governors",
    },
    id: "sem://design-system-docs#job.s1",
  },
  "sem://design-system-docs#coordinate.governors": {
    __id: "sem://design-system-docs#coordinate.governors",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.governors",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.governors:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.governors:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.governors:fluencies",
    },
    id: "sem://design-system-docs#coordinate.governors",
  },
  "client:sem://design-system-docs#coordinate.governors:actors": {
    __id: "client:sem://design-system-docs#coordinate.governors:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.governors:actors:edges:0",
        "client:sem://design-system-docs#coordinate.governors:actors:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.governors:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.governors:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Agent",
    },
  },
  "client:sem://design-system-docs#coordinate.governors:actors:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.governors:actors:edges:1",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.governors:roles": {
    __id: "client:sem://design-system-docs#coordinate.governors:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.governors:roles:edges:0",
        "client:sem://design-system-docs#coordinate.governors:roles:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.governors:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.governors:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.architect",
    },
  },
  "client:sem://design-system-docs#coordinate.governors:roles:edges:1": {
    __id: "client:sem://design-system-docs#coordinate.governors:roles:edges:1",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "client:sem://design-system-docs#coordinate.governors:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.governors:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:44": {
    __id: "client:root:jobs(first:100):edges:44",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.s2",
    },
  },
  "sem://design-system-docs#job.s2": {
    __id: "sem://design-system-docs#job.s2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.s2",
    story:
      "When the system needs a new rule, I want to author a guideline or principle, so I can steer it top-down, without ad-hoc decisions.",
    acceptances: [
      "the Editor route; the artifact lands in Standards or Guides",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.steward-any",
    },
    id: "sem://design-system-docs#job.s2",
  },
  "sem://design-system-docs#coordinate.steward-any": {
    __id: "sem://design-system-docs#coordinate.steward-any",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.steward-any",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.steward-any:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.steward-any:roles",
    },
    fluencies: {
      __ref: "client:sem://design-system-docs#coordinate.steward-any:fluencies",
    },
    id: "sem://design-system-docs#coordinate.steward-any",
  },
  "client:sem://design-system-docs#coordinate.steward-any:actors": {
    __id: "client:sem://design-system-docs#coordinate.steward-any:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.steward-any:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.steward-any:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.steward-any:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.steward-any:roles": {
    __id: "client:sem://design-system-docs#coordinate.steward-any:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.steward-any:roles:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.steward-any:roles:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.steward-any:roles:edges:0",
    __typename: "RoleEdge",
    node: {
      __ref: "sem://design-system-docs#role.steward",
    },
  },
  "client:sem://design-system-docs#coordinate.steward-any:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.steward-any:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:45": {
    __id: "client:root:jobs(first:100):edges:45",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.s3",
    },
  },
  "sem://design-system-docs#job.s3": {
    __id: "sem://design-system-docs#job.s3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.s3",
    story:
      "When direction must be set, I want to make and publish a steering decision backed by evidence, so I can guide the system, without unbacked calls.",
    acceptances: [
      "Audit evidence into a published decision (deferred); the artifact lands in Guides",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.stewardship",
    },
    id: "sem://design-system-docs#job.s3",
  },
  "client:root:jobs(first:100):edges:46": {
    __id: "client:root:jobs(first:100):edges:46",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.s4",
    },
  },
  "sem://design-system-docs#job.s4": {
    __id: "sem://design-system-docs#job.s4",
    __typename: "Job",
    uri: "sem://design-system-docs#job.s4",
    story:
      "When contributions arrive, I want to ratify them and govern tiers, so I can keep the system coherent, without rule bypass.",
    acceptances: ["review queues + drift checks"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.steward-any",
    },
    id: "sem://design-system-docs#job.s4",
  },
  "client:root:jobs(first:100):edges:47": {
    __id: "client:root:jobs(first:100):edges:47",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.s5",
    },
  },
  "sem://design-system-docs#job.s5": {
    __id: "sem://design-system-docs#job.s5",
    __typename: "Job",
    uri: "sem://design-system-docs#job.s5",
    story:
      "When content conventions must evolve, I want to author and govern the content standards, so I can keep language consistent, without decks as source.",
    acceptances: ["the content-standards artifact + the Editor route"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.content-governors",
    },
    id: "sem://design-system-docs#job.s5",
  },
  "sem://design-system-docs#coordinate.content-governors": {
    __id: "sem://design-system-docs#coordinate.content-governors",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.content-governors",
    actors: {
      __ref:
        "client:sem://design-system-docs#coordinate.content-governors:actors",
    },
    roles: {
      __ref:
        "client:sem://design-system-docs#coordinate.content-governors:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.content-governors:fluencies",
    },
    id: "sem://design-system-docs#coordinate.content-governors",
  },
  "client:sem://design-system-docs#coordinate.content-governors:actors": {
    __id: "client:sem://design-system-docs#coordinate.content-governors:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.content-governors:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.content-governors:actors:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.content-governors:actors:edges:0",
      __typename: "ActorEdge",
      node: {
        __ref: "surface:Human",
      },
    },
  "client:sem://design-system-docs#coordinate.content-governors:roles": {
    __id: "client:sem://design-system-docs#coordinate.content-governors:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.content-governors:roles:edges:0",
        "client:sem://design-system-docs#coordinate.content-governors:roles:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.content-governors:roles:edges:0":
    {
      __id: "client:sem://design-system-docs#coordinate.content-governors:roles:edges:0",
      __typename: "RoleEdge",
      node: {
        __ref: "sem://design-system-docs#role.steward",
      },
    },
  "client:sem://design-system-docs#coordinate.content-governors:roles:edges:1":
    {
      __id: "client:sem://design-system-docs#coordinate.content-governors:roles:edges:1",
      __typename: "RoleEdge",
      node: {
        __ref: "sem://design-system-docs#role.writer",
      },
    },
  "client:sem://design-system-docs#coordinate.content-governors:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.content-governors:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:48": {
    __id: "client:root:jobs(first:100):edges:48",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.v1",
    },
  },
  "sem://design-system-docs#job.v1": {
    __id: "sem://design-system-docs#job.v1",
    __typename: "Job",
    uri: "sem://design-system-docs#job.v1",
    story:
      "When checking a build against my spec, I want to see its structure beside the live component, so I can compare node by node, without leaving the page.",
    acceptances: [
      "per-node drift; Focus isolates the tree",
      "the structure section renders the anatomy tree beside the live component",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.designer-alone",
    },
    id: "sem://design-system-docs#job.v1",
  },
  "sem://design-system-docs#coordinate.designer-alone": {
    __id: "sem://design-system-docs#coordinate.designer-alone",
    __typename: "Coordinate",
    uri: "sem://design-system-docs#coordinate.designer-alone",
    actors: {
      __ref: "client:sem://design-system-docs#coordinate.designer-alone:actors",
    },
    roles: {
      __ref: "client:sem://design-system-docs#coordinate.designer-alone:roles",
    },
    fluencies: {
      __ref:
        "client:sem://design-system-docs#coordinate.designer-alone:fluencies",
    },
    id: "sem://design-system-docs#coordinate.designer-alone",
  },
  "client:sem://design-system-docs#coordinate.designer-alone:actors": {
    __id: "client:sem://design-system-docs#coordinate.designer-alone:actors",
    __typename: "ActorConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#coordinate.designer-alone:actors:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#coordinate.designer-alone:actors:edges:0": {
    __id: "client:sem://design-system-docs#coordinate.designer-alone:actors:edges:0",
    __typename: "ActorEdge",
    node: {
      __ref: "surface:Human",
    },
  },
  "client:sem://design-system-docs#coordinate.designer-alone:roles": {
    __id: "client:sem://design-system-docs#coordinate.designer-alone:roles",
    __typename: "RoleConnection",
    edges: {
      __refs: [],
    },
  },
  "client:sem://design-system-docs#coordinate.designer-alone:fluencies": {
    __id: "client:sem://design-system-docs#coordinate.designer-alone:fluencies",
    __typename: "FluencyConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:jobs(first:100):edges:49": {
    __id: "client:root:jobs(first:100):edges:49",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.v2",
    },
  },
  "sem://design-system-docs#job.v2": {
    __id: "sem://design-system-docs#job.v2",
    __typename: "Job",
    uri: "sem://design-system-docs#job.v2",
    story:
      "When I check a component, I want to verify its modifiers and states actually shipped, so I can trust the spec matches the build, without manual poking.",
    acceptances: ["states section + drift overlay; agents get getModifiers"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.maker-duo",
    },
    id: "sem://design-system-docs#job.v2",
  },
  "client:root:jobs(first:100):edges:50": {
    __id: "client:root:jobs(first:100):edges:50",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.v3",
    },
  },
  "sem://design-system-docs#job.v3": {
    __id: "sem://design-system-docs#job.v3",
    __typename: "Job",
    uri: "sem://design-system-docs#job.v3",
    story:
      "When I check my app, I want an automated conformance audit — a11y, tokens, standards — so I can find drift at scale, without manual review.",
    acceptances: [
      "Audit:conformance(app) (deferred; Guides interim); agents get getConformance(app)",
    ],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.change-watchers",
    },
    id: "sem://design-system-docs#job.v3",
  },
  "client:root:jobs(first:100):edges:51": {
    __id: "client:root:jobs(first:100):edges:51",
    __typename: "JobEdge",
    node: {
      __ref: "sem://design-system-docs#job.v4",
    },
  },
  "sem://design-system-docs#job.v4": {
    __id: "sem://design-system-docs#job.v4",
    __typename: "Job",
    uri: "sem://design-system-docs#job.v4",
    story:
      "When I find a bug, I want to report it in context from the entity page, so I can get it fixed, without leaving my flow.",
    acceptances: ["the issue route + a contextual cue on the entity page"],
    coordinates: {
      __ref: "sem://design-system-docs#coordinate.builder-pair",
    },
    id: "sem://design-system-docs#job.v4",
  },
  "client:root:pairings(first:100)": {
    __id: "client:root:pairings(first:100)",
    __typename: "PairingConnection",
    edges: {
      __refs: [
        "client:root:pairings(first:100):edges:0",
        "client:root:pairings(first:100):edges:1",
        "client:root:pairings(first:100):edges:2",
        "client:root:pairings(first:100):edges:3",
        "client:root:pairings(first:100):edges:4",
        "client:root:pairings(first:100):edges:5",
        "client:root:pairings(first:100):edges:6",
        "client:root:pairings(first:100):edges:7",
        "client:root:pairings(first:100):edges:8",
        "client:root:pairings(first:100):edges:9",
        "client:root:pairings(first:100):edges:10",
        "client:root:pairings(first:100):edges:11",
        "client:root:pairings(first:100):edges:12",
        "client:root:pairings(first:100):edges:13",
        "client:root:pairings(first:100):edges:14",
        "client:root:pairings(first:100):edges:15",
        "client:root:pairings(first:100):edges:16",
        "client:root:pairings(first:100):edges:17",
        "client:root:pairings(first:100):edges:18",
        "client:root:pairings(first:100):edges:19",
        "client:root:pairings(first:100):edges:20",
        "client:root:pairings(first:100):edges:21",
        "client:root:pairings(first:100):edges:22",
        "client:root:pairings(first:100):edges:23",
        "client:root:pairings(first:100):edges:24",
        "client:root:pairings(first:100):edges:25",
        "client:root:pairings(first:100):edges:26",
        "client:root:pairings(first:100):edges:27",
        "client:root:pairings(first:100):edges:28",
        "client:root:pairings(first:100):edges:29",
        "client:root:pairings(first:100):edges:30",
        "client:root:pairings(first:100):edges:31",
        "client:root:pairings(first:100):edges:32",
        "client:root:pairings(first:100):edges:33",
        "client:root:pairings(first:100):edges:34",
        "client:root:pairings(first:100):edges:35",
        "client:root:pairings(first:100):edges:36",
        "client:root:pairings(first:100):edges:37",
        "client:root:pairings(first:100):edges:38",
        "client:root:pairings(first:100):edges:39",
        "client:root:pairings(first:100):edges:40",
        "client:root:pairings(first:100):edges:41",
        "client:root:pairings(first:100):edges:42",
        "client:root:pairings(first:100):edges:43",
        "client:root:pairings(first:100):edges:44",
        "client:root:pairings(first:100):edges:45",
        "client:root:pairings(first:100):edges:46",
        "client:root:pairings(first:100):edges:47",
        "client:root:pairings(first:100):edges:48",
        "client:root:pairings(first:100):edges:49",
        "client:root:pairings(first:100):edges:50",
        "client:root:pairings(first:100):edges:51",
        "client:root:pairings(first:100):edges:52",
        "client:root:pairings(first:100):edges:53",
        "client:root:pairings(first:100):edges:54",
        "client:root:pairings(first:100):edges:55",
        "client:root:pairings(first:100):edges:56",
        "client:root:pairings(first:100):edges:57",
        "client:root:pairings(first:100):edges:58",
        "client:root:pairings(first:100):edges:59",
        "client:root:pairings(first:100):edges:60",
        "client:root:pairings(first:100):edges:61",
        "client:root:pairings(first:100):edges:62",
        "client:root:pairings(first:100):edges:63",
        "client:root:pairings(first:100):edges:64",
        "client:root:pairings(first:100):edges:65",
        "client:root:pairings(first:100):edges:66",
        "client:root:pairings(first:100):edges:67",
        "client:root:pairings(first:100):edges:68",
        "client:root:pairings(first:100):edges:69",
        "client:root:pairings(first:100):edges:70",
        "client:root:pairings(first:100):edges:71",
        "client:root:pairings(first:100):edges:72",
        "client:root:pairings(first:100):edges:73",
        "client:root:pairings(first:100):edges:74",
        "client:root:pairings(first:100):edges:75",
        "client:root:pairings(first:100):edges:76",
        "client:root:pairings(first:100):edges:77",
        "client:root:pairings(first:100):edges:78",
        "client:root:pairings(first:100):edges:79",
        "client:root:pairings(first:100):edges:80",
        "client:root:pairings(first:100):edges:81",
        "client:root:pairings(first:100):edges:82",
        "client:root:pairings(first:100):edges:83",
        "client:root:pairings(first:100):edges:84",
        "client:root:pairings(first:100):edges:85",
        "client:root:pairings(first:100):edges:86",
        "client:root:pairings(first:100):edges:87",
        "client:root:pairings(first:100):edges:88",
        "client:root:pairings(first:100):edges:89",
        "client:root:pairings(first:100):edges:90",
        "client:root:pairings(first:100):edges:91",
        "client:root:pairings(first:100):edges:92",
        "client:root:pairings(first:100):edges:93",
        "client:root:pairings(first:100):edges:94",
        "client:root:pairings(first:100):edges:95",
        "client:root:pairings(first:100):edges:96",
        "client:root:pairings(first:100):edges:97",
        "client:root:pairings(first:100):edges:98",
        "client:root:pairings(first:100):edges:99",
      ],
    },
  },
  "client:root:pairings(first:100):edges:0": {
    __id: "client:root:pairings(first:100):edges:0",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a1-audit-adoption",
    },
  },
  "sem://design-system-docs#pairing.a1-audit-adoption": {
    __id: "sem://design-system-docs#pairing.a1-audit-adoption",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a1-audit-adoption",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a1",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.a1-audit-adoption:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-adoption",
    },
    id: "sem://design-system-docs#pairing.a1-audit-adoption",
  },
  "surface:Primary": {
    __id: "surface:Primary",
    __typename: "PairingRole",
    uri: "surface:Primary",
    id: "surface:Primary",
  },
  "client:sem://design-system-docs#pairing.a1-audit-adoption:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a1-audit-adoption:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.a1-audit-adoption:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.a1-audit-adoption:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.a1-audit-adoption:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "surface:ColdEntry": {
    __id: "surface:ColdEntry",
    __typename: "Preservation",
    uri: "surface:ColdEntry",
    id: "surface:ColdEntry",
  },
  "sem://design-system-docs#view.audit-adoption": {
    __id: "sem://design-system-docs#view.audit-adoption",
    __typename: "View",
    uri: "sem://design-system-docs#view.audit-adoption",
    composes: {
      __ref: "client:sem://design-system-docs#view.audit-adoption:composes",
    },
    id: "sem://design-system-docs#view.audit-adoption",
  },
  "client:sem://design-system-docs#view.audit-adoption:composes": {
    __id: "client:sem://design-system-docs#view.audit-adoption:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:1": {
    __id: "client:root:pairings(first:100):edges:1",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a1-port",
    },
  },
  "sem://design-system-docs#pairing.a1-port": {
    __id: "sem://design-system-docs#pairing.a1-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a1-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.a1-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.a1-port",
  },
  "surface:Secondary": {
    __id: "surface:Secondary",
    __typename: "PairingRole",
    uri: "surface:Secondary",
    id: "surface:Secondary",
  },
  "client:sem://design-system-docs#pairing.a1-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a1-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "sem://design-system-docs#port": {
    __id: "sem://design-system-docs#port",
    __typename: "Port",
    uri: "sem://design-system-docs#port",
    composes: {
      __ref: "client:sem://design-system-docs#port:composes",
    },
    id: "sem://design-system-docs#port",
  },
  "client:sem://design-system-docs#port:composes": {
    __id: "client:sem://design-system-docs#port:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:2": {
    __id: "client:root:pairings(first:100):edges:2",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a2-audit-adoption",
    },
  },
  "sem://design-system-docs#pairing.a2-audit-adoption": {
    __id: "sem://design-system-docs#pairing.a2-audit-adoption",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a2-audit-adoption",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a2",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.a2-audit-adoption:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-adoption",
    },
    id: "sem://design-system-docs#pairing.a2-audit-adoption",
  },
  "client:sem://design-system-docs#pairing.a2-audit-adoption:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a2-audit-adoption:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.a2-audit-adoption:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.a2-audit-adoption:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.a2-audit-adoption:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(first:100):edges:3": {
    __id: "client:root:pairings(first:100):edges:3",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a2-guide-positioning",
    },
  },
  "sem://design-system-docs#pairing.a2-guide-positioning": {
    __id: "sem://design-system-docs#pairing.a2-guide-positioning",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a2-guide-positioning",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a2",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.a2-guide-positioning:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-positioning",
    },
    id: "sem://design-system-docs#pairing.a2-guide-positioning",
  },
  "client:sem://design-system-docs#pairing.a2-guide-positioning:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a2-guide-positioning:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.a2-guide-positioning:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.a2-guide-positioning:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.a2-guide-positioning:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.guide-positioning": {
    __id: "sem://design-system-docs#view.guide-positioning",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-positioning",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-positioning:composes",
    },
    id: "sem://design-system-docs#view.guide-positioning",
  },
  "client:sem://design-system-docs#view.guide-positioning:composes": {
    __id: "client:sem://design-system-docs#view.guide-positioning:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:4": {
    __id: "client:root:pairings(first:100):edges:4",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a3-audit-gap-plan",
    },
  },
  "sem://design-system-docs#pairing.a3-audit-gap-plan": {
    __id: "sem://design-system-docs#pairing.a3-audit-gap-plan",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a3-audit-gap-plan",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.a3-audit-gap-plan:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-gap-plan",
    },
    id: "sem://design-system-docs#pairing.a3-audit-gap-plan",
  },
  "client:sem://design-system-docs#pairing.a3-audit-gap-plan:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a3-audit-gap-plan:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.a3-audit-gap-plan:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.a3-audit-gap-plan:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.a3-audit-gap-plan:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.audit-gap-plan": {
    __id: "sem://design-system-docs#view.audit-gap-plan",
    __typename: "View",
    uri: "sem://design-system-docs#view.audit-gap-plan",
    composes: {
      __ref: "client:sem://design-system-docs#view.audit-gap-plan:composes",
    },
    id: "sem://design-system-docs#view.audit-gap-plan",
  },
  "client:sem://design-system-docs#view.audit-gap-plan:composes": {
    __id: "client:sem://design-system-docs#view.audit-gap-plan:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:5": {
    __id: "client:root:pairings(first:100):edges:5",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a3-guide-migration",
    },
  },
  "sem://design-system-docs#pairing.a3-guide-migration": {
    __id: "sem://design-system-docs#pairing.a3-guide-migration",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a3-guide-migration",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.a3-guide-migration:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-migration",
    },
    id: "sem://design-system-docs#pairing.a3-guide-migration",
  },
  "client:sem://design-system-docs#pairing.a3-guide-migration:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a3-guide-migration:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.a3-guide-migration:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.a3-guide-migration:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.a3-guide-migration:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.guide-migration": {
    __id: "sem://design-system-docs#view.guide-migration",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-migration",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-migration:composes",
    },
    id: "sem://design-system-docs#view.guide-migration",
  },
  "client:sem://design-system-docs#view.guide-migration:composes": {
    __id: "client:sem://design-system-docs#view.guide-migration:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:6": {
    __id: "client:root:pairings(first:100):edges:6",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.a3-port",
    },
  },
  "sem://design-system-docs#pairing.a3-port": {
    __id: "sem://design-system-docs#pairing.a3-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.a3-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.a3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.a3-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.a3-port",
  },
  "client:sem://design-system-docs#pairing.a3-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.a3-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:7": {
    __id: "client:root:pairings(first:100):edges:7",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b1-guide-setup",
    },
  },
  "sem://design-system-docs#pairing.b1-guide-setup": {
    __id: "sem://design-system-docs#pairing.b1-guide-setup",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b1-guide-setup",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b1-guide-setup:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-setup",
    },
    id: "sem://design-system-docs#pairing.b1-guide-setup",
  },
  "client:sem://design-system-docs#pairing.b1-guide-setup:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b1-guide-setup:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b1-guide-setup:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b1-guide-setup:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b1-guide-setup:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.guide-setup": {
    __id: "sem://design-system-docs#view.guide-setup",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-setup",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-setup:composes",
    },
    id: "sem://design-system-docs#view.guide-setup",
  },
  "client:sem://design-system-docs#view.guide-setup:composes": {
    __id: "client:sem://design-system-docs#view.guide-setup:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:8": {
    __id: "client:root:pairings(first:100):edges:8",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b10-composer-contribute",
    },
  },
  "sem://design-system-docs#pairing.b10-composer-contribute": {
    __id: "sem://design-system-docs#pairing.b10-composer-contribute",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b10-composer-contribute",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b10",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b10-composer-contribute:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-contribute",
    },
    id: "sem://design-system-docs#pairing.b10-composer-contribute",
  },
  "client:sem://design-system-docs#pairing.b10-composer-contribute:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b10-composer-contribute:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b10-composer-contribute:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b10-composer-contribute:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.b10-composer-contribute:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.composer-contribute": {
    __id: "sem://design-system-docs#view.composer-contribute",
    __typename: "ComposerSurface",
    uri: "sem://design-system-docs#view.composer-contribute",
    composes: {
      __ref:
        "client:sem://design-system-docs#view.composer-contribute:composes",
    },
    id: "sem://design-system-docs#view.composer-contribute",
  },
  "client:sem://design-system-docs#view.composer-contribute:composes": {
    __id: "client:sem://design-system-docs#view.composer-contribute:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:9": {
    __id: "client:root:pairings(first:100):edges:9",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b10-port",
    },
  },
  "sem://design-system-docs#pairing.b10-port": {
    __id: "sem://design-system-docs#pairing.b10-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b10-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b10",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b10-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b10-port",
  },
  "client:sem://design-system-docs#pairing.b10-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b10-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:10": {
    __id: "client:root:pairings(first:100):edges:10",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b10-section-content",
    },
  },
  "sem://design-system-docs#pairing.b10-section-content": {
    __id: "sem://design-system-docs#pairing.b10-section-content",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b10-section-content",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b10",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b10-section-content:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-content",
    },
    id: "sem://design-system-docs#pairing.b10-section-content",
  },
  "client:sem://design-system-docs#pairing.b10-section-content:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b10-section-content:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b10-section-content:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b10-section-content:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.b10-section-content:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.section-content": {
    __id: "sem://design-system-docs#view.section-content",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-content",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-content:composes",
    },
    id: "sem://design-system-docs#view.section-content",
  },
  "client:sem://design-system-docs#view.section-content:composes": {
    __id: "client:sem://design-system-docs#view.section-content:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:11": {
    __id: "client:root:pairings(first:100):edges:11",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b10-standards-content",
    },
  },
  "sem://design-system-docs#pairing.b10-standards-content": {
    __id: "sem://design-system-docs#pairing.b10-standards-content",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b10-standards-content",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b10",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b10-standards-content:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards-content",
    },
    id: "sem://design-system-docs#pairing.b10-standards-content",
  },
  "client:sem://design-system-docs#pairing.b10-standards-content:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b10-standards-content:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b10-standards-content:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b10-standards-content:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.b10-standards-content:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.standards-content": {
    __id: "sem://design-system-docs#view.standards-content",
    __typename: "View",
    uri: "sem://design-system-docs#view.standards-content",
    composes: {
      __ref: "client:sem://design-system-docs#view.standards-content:composes",
    },
    id: "sem://design-system-docs#view.standards-content",
  },
  "client:sem://design-system-docs#view.standards-content:composes": {
    __id: "client:sem://design-system-docs#view.standards-content:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:12": {
    __id: "client:root:pairings(first:100):edges:12",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b11-cascade",
    },
  },
  "sem://design-system-docs#pairing.b11-cascade": {
    __id: "sem://design-system-docs#pairing.b11-cascade",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b11-cascade",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b11",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b11-cascade:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.cascade",
    },
    id: "sem://design-system-docs#pairing.b11-cascade",
  },
  "client:sem://design-system-docs#pairing.b11-cascade:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b11-cascade:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b11-cascade:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b11-cascade:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b11-cascade:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.cascade": {
    __id: "sem://design-system-docs#view.cascade",
    __typename: "View",
    uri: "sem://design-system-docs#view.cascade",
    composes: {
      __ref: "client:sem://design-system-docs#view.cascade:composes",
    },
    id: "sem://design-system-docs#view.cascade",
  },
  "client:sem://design-system-docs#view.cascade:composes": {
    __id: "client:sem://design-system-docs#view.cascade:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:13": {
    __id: "client:root:pairings(first:100):edges:13",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b11-chips",
    },
  },
  "sem://design-system-docs#pairing.b11-chips": {
    __id: "sem://design-system-docs#pairing.b11-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b11-chips",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b11",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b11-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.b11-chips",
  },
  "client:sem://design-system-docs#pairing.b11-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b11-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b11-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b11-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b11-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "surface:NoMove": {
    __id: "surface:NoMove",
    __typename: "Preservation",
    uri: "surface:NoMove",
    id: "surface:NoMove",
  },
  "sem://design-system-docs#view.chips": {
    __id: "sem://design-system-docs#view.chips",
    __typename: "Mechanism",
    uri: "sem://design-system-docs#view.chips",
    composes: {
      __ref: "client:sem://design-system-docs#view.chips:composes",
    },
    id: "sem://design-system-docs#view.chips",
  },
  "client:sem://design-system-docs#view.chips:composes": {
    __id: "client:sem://design-system-docs#view.chips:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:14": {
    __id: "client:root:pairings(first:100):edges:14",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b11-port",
    },
  },
  "sem://design-system-docs#pairing.b11-port": {
    __id: "sem://design-system-docs#pairing.b11-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b11-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b11",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b11-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b11-port",
  },
  "client:sem://design-system-docs#pairing.b11-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b11-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:15": {
    __id: "client:root:pairings(first:100):edges:15",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b12-section-graph",
    },
  },
  "sem://design-system-docs#pairing.b12-section-graph": {
    __id: "sem://design-system-docs#pairing.b12-section-graph",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b12-section-graph",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b12",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b12-section-graph:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-graph",
    },
    id: "sem://design-system-docs#pairing.b12-section-graph",
  },
  "client:sem://design-system-docs#pairing.b12-section-graph:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b12-section-graph:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b12-section-graph:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b12-section-graph:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.b12-section-graph:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "surface:SubjectKept": {
    __id: "surface:SubjectKept",
    __typename: "Preservation",
    uri: "surface:SubjectKept",
    id: "surface:SubjectKept",
  },
  "sem://design-system-docs#view.section-graph": {
    __id: "sem://design-system-docs#view.section-graph",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-graph",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-graph:composes",
    },
    id: "sem://design-system-docs#view.section-graph",
  },
  "client:sem://design-system-docs#view.section-graph:composes": {
    __id: "client:sem://design-system-docs#view.section-graph:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:16": {
    __id: "client:root:pairings(first:100):edges:16",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b12-neighborhood",
    },
  },
  "sem://design-system-docs#pairing.b12-neighborhood": {
    __id: "sem://design-system-docs#pairing.b12-neighborhood",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b12-neighborhood",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b12",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b12-neighborhood:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.neighborhood",
    },
    id: "sem://design-system-docs#pairing.b12-neighborhood",
  },
  "client:sem://design-system-docs#pairing.b12-neighborhood:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b12-neighborhood:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b12-neighborhood:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b12-neighborhood:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b12-neighborhood:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.neighborhood": {
    __id: "sem://design-system-docs#view.neighborhood",
    __typename: "Peek",
    uri: "sem://design-system-docs#view.neighborhood",
    composes: {
      __ref: "client:sem://design-system-docs#view.neighborhood:composes",
    },
    id: "sem://design-system-docs#view.neighborhood",
  },
  "client:sem://design-system-docs#view.neighborhood:composes": {
    __id: "client:sem://design-system-docs#view.neighborhood:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:17": {
    __id: "client:root:pairings(first:100):edges:17",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b12-port",
    },
  },
  "sem://design-system-docs#pairing.b12-port": {
    __id: "sem://design-system-docs#pairing.b12-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b12-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b12",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b12-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b12-port",
  },
  "client:sem://design-system-docs#pairing.b12-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b12-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:18": {
    __id: "client:root:pairings(first:100):edges:18",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b12-token-consumers",
    },
  },
  "sem://design-system-docs#pairing.b12-token-consumers": {
    __id: "sem://design-system-docs#pairing.b12-token-consumers",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b12-token-consumers",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b12",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b12-token-consumers:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.token-consumers",
    },
    id: "sem://design-system-docs#pairing.b12-token-consumers",
  },
  "client:sem://design-system-docs#pairing.b12-token-consumers:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b12-token-consumers:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b12-token-consumers:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b12-token-consumers:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.b12-token-consumers:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "sem://design-system-docs#view.token-consumers": {
    __id: "sem://design-system-docs#view.token-consumers",
    __typename: "View",
    uri: "sem://design-system-docs#view.token-consumers",
    composes: {
      __ref: "client:sem://design-system-docs#view.token-consumers:composes",
    },
    id: "sem://design-system-docs#view.token-consumers",
  },
  "client:sem://design-system-docs#view.token-consumers:composes": {
    __id: "client:sem://design-system-docs#view.token-consumers:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:19": {
    __id: "client:root:pairings(first:100):edges:19",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b2-focus",
    },
  },
  "sem://design-system-docs#pairing.b2-focus": {
    __id: "sem://design-system-docs#pairing.b2-focus",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b2-focus",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b2-focus:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.focus",
    },
    id: "sem://design-system-docs#pairing.b2-focus",
  },
  "client:sem://design-system-docs#pairing.b2-focus:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b2-focus:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b2-focus:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b2-focus:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b2-focus:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.focus": {
    __id: "sem://design-system-docs#view.focus",
    __typename: "Peek",
    uri: "sem://design-system-docs#view.focus",
    composes: {
      __ref: "client:sem://design-system-docs#view.focus:composes",
    },
    id: "sem://design-system-docs#view.focus",
  },
  "client:sem://design-system-docs#view.focus:composes": {
    __id: "client:sem://design-system-docs#view.focus:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:20": {
    __id: "client:root:pairings(first:100):edges:20",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b2-port",
    },
  },
  "sem://design-system-docs#pairing.b2-port": {
    __id: "sem://design-system-docs#pairing.b2-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b2-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b2-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b2-port",
  },
  "client:sem://design-system-docs#pairing.b2-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b2-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:21": {
    __id: "client:root:pairings(first:100):edges:21",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b2-section-usage",
    },
  },
  "sem://design-system-docs#pairing.b2-section-usage": {
    __id: "sem://design-system-docs#pairing.b2-section-usage",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b2-section-usage",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b2",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b2-section-usage:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-usage",
    },
    id: "sem://design-system-docs#pairing.b2-section-usage",
  },
  "client:sem://design-system-docs#pairing.b2-section-usage:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b2-section-usage:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b2-section-usage:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b2-section-usage:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b2-section-usage:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.section-usage": {
    __id: "sem://design-system-docs#view.section-usage",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-usage",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-usage:composes",
    },
    id: "sem://design-system-docs#view.section-usage",
  },
  "client:sem://design-system-docs#view.section-usage:composes": {
    __id: "client:sem://design-system-docs#view.section-usage:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:22": {
    __id: "client:root:pairings(first:100):edges:22",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b2-terminal",
    },
  },
  "sem://design-system-docs#pairing.b2-terminal": {
    __id: "sem://design-system-docs#pairing.b2-terminal",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b2-terminal",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b2-terminal:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.terminal-lookup",
    },
    id: "sem://design-system-docs#pairing.b2-terminal",
  },
  "client:sem://design-system-docs#pairing.b2-terminal:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b2-terminal:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b2-terminal:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b2-terminal:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b2-terminal:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.terminal-lookup": {
    __id: "sem://design-system-docs#view.terminal-lookup",
    __typename: "Detail",
    uri: "sem://design-system-docs#view.terminal-lookup",
    composes: {
      __ref: "client:sem://design-system-docs#view.terminal-lookup:composes",
    },
    id: "sem://design-system-docs#view.terminal-lookup",
  },
  "client:sem://design-system-docs#view.terminal-lookup:composes": {
    __id: "client:sem://design-system-docs#view.terminal-lookup:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:23": {
    __id: "client:root:pairings(first:100):edges:23",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b3-port",
    },
  },
  "sem://design-system-docs#pairing.b3-port": {
    __id: "sem://design-system-docs#pairing.b3-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b3-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b3-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b3-port",
  },
  "client:sem://design-system-docs#pairing.b3-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b3-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:24": {
    __id: "client:root:pairings(first:100):edges:24",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b3-status-badge",
    },
  },
  "sem://design-system-docs#pairing.b3-status-badge": {
    __id: "sem://design-system-docs#pairing.b3-status-badge",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b3-status-badge",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b3-status-badge:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.status-badge",
    },
    id: "sem://design-system-docs#pairing.b3-status-badge",
  },
  "client:sem://design-system-docs#pairing.b3-status-badge:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b3-status-badge:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b3-status-badge:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b3-status-badge:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b3-status-badge:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "sem://design-system-docs#view.status-badge": {
    __id: "sem://design-system-docs#view.status-badge",
    __typename: "View",
    uri: "sem://design-system-docs#view.status-badge",
    composes: {
      __ref: "client:sem://design-system-docs#view.status-badge:composes",
    },
    id: "sem://design-system-docs#view.status-badge",
  },
  "client:sem://design-system-docs#view.status-badge:composes": {
    __id: "client:sem://design-system-docs#view.status-badge:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:25": {
    __id: "client:root:pairings(first:100):edges:25",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b4-port",
    },
  },
  "sem://design-system-docs#pairing.b4-port": {
    __id: "sem://design-system-docs#pairing.b4-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b4-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b4-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b4-port",
  },
  "client:sem://design-system-docs#pairing.b4-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b4-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:26": {
    __id: "client:root:pairings(first:100):edges:26",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b4-section-a11y",
    },
  },
  "sem://design-system-docs#pairing.b4-section-a11y": {
    __id: "sem://design-system-docs#pairing.b4-section-a11y",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b4-section-a11y",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b4-section-a11y:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-a11y",
    },
    id: "sem://design-system-docs#pairing.b4-section-a11y",
  },
  "client:sem://design-system-docs#pairing.b4-section-a11y:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b4-section-a11y:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b4-section-a11y:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b4-section-a11y:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b4-section-a11y:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.section-a11y": {
    __id: "sem://design-system-docs#view.section-a11y",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-a11y",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-a11y:composes",
    },
    id: "sem://design-system-docs#view.section-a11y",
  },
  "client:sem://design-system-docs#view.section-a11y:composes": {
    __id: "client:sem://design-system-docs#view.section-a11y:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:27": {
    __id: "client:root:pairings(first:100):edges:27",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b4-standards",
    },
  },
  "sem://design-system-docs#pairing.b4-standards": {
    __id: "sem://design-system-docs#pairing.b4-standards",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b4-standards",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b4-standards:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards",
    },
    id: "sem://design-system-docs#pairing.b4-standards",
  },
  "client:sem://design-system-docs#pairing.b4-standards:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b4-standards:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b4-standards:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b4-standards:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b4-standards:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.standards": {
    __id: "sem://design-system-docs#view.standards",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.standards",
    composes: {
      __ref: "client:sem://design-system-docs#view.standards:composes",
    },
    id: "sem://design-system-docs#view.standards",
  },
  "client:sem://design-system-docs#view.standards:composes": {
    __id: "client:sem://design-system-docs#view.standards:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.standards:composes:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#view.standards:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.standards:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.reading",
    },
  },
  "sem://design-system-docs#layout.reading": {
    __id: "sem://design-system-docs#layout.reading",
    __typename: "Layout",
    uri: "sem://design-system-docs#layout.reading",
    name: "Reading",
    id: "sem://design-system-docs#layout.reading",
  },
  "client:root:pairings(first:100):edges:28": {
    __id: "client:root:pairings(first:100):edges:28",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b5-chips",
    },
  },
  "sem://design-system-docs#pairing.b5-chips": {
    __id: "sem://design-system-docs#pairing.b5-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b5-chips",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b5",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b5-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.b5-chips",
  },
  "client:sem://design-system-docs#pairing.b5-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b5-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b5-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b5-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b5-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:29": {
    __id: "client:root:pairings(first:100):edges:29",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b5-port",
    },
  },
  "sem://design-system-docs#pairing.b5-port": {
    __id: "sem://design-system-docs#pairing.b5-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b5-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b5",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b5-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b5-port",
  },
  "client:sem://design-system-docs#pairing.b5-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b5-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:30": {
    __id: "client:root:pairings(first:100):edges:30",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b5-terminal",
    },
  },
  "sem://design-system-docs#pairing.b5-terminal": {
    __id: "sem://design-system-docs#pairing.b5-terminal",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b5-terminal",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b5",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b5-terminal:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#lens.terminal-catalog",
    },
    id: "sem://design-system-docs#pairing.b5-terminal",
  },
  "client:sem://design-system-docs#pairing.b5-terminal:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b5-terminal:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b5-terminal:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b5-terminal:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b5-terminal:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#lens.terminal-catalog": {
    __id: "sem://design-system-docs#lens.terminal-catalog",
    __typename: "Lens",
    uri: "sem://design-system-docs#lens.terminal-catalog",
    composes: {
      __ref: "client:sem://design-system-docs#lens.terminal-catalog:composes",
    },
    id: "sem://design-system-docs#lens.terminal-catalog",
  },
  "client:sem://design-system-docs#lens.terminal-catalog:composes": {
    __id: "client:sem://design-system-docs#lens.terminal-catalog:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:31": {
    __id: "client:root:pairings(first:100):edges:31",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b5-tokens",
    },
  },
  "sem://design-system-docs#pairing.b5-tokens": {
    __id: "sem://design-system-docs#pairing.b5-tokens",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b5-tokens",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b5",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b5-tokens:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.tokens",
    },
    id: "sem://design-system-docs#pairing.b5-tokens",
  },
  "client:sem://design-system-docs#pairing.b5-tokens:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b5-tokens:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b5-tokens:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b5-tokens:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b5-tokens:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.tokens": {
    __id: "sem://design-system-docs#view.tokens",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.tokens",
    composes: {
      __ref: "client:sem://design-system-docs#view.tokens:composes",
    },
    id: "sem://design-system-docs#view.tokens",
  },
  "client:sem://design-system-docs#view.tokens:composes": {
    __id: "client:sem://design-system-docs#view.tokens:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.tokens:composes:edges:0",
        "client:sem://design-system-docs#view.tokens:composes:edges:1",
      ],
    },
  },
  "client:sem://design-system-docs#view.tokens:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.tokens:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.catalog",
    },
  },
  "sem://design-system-docs#layout.catalog": {
    __id: "sem://design-system-docs#layout.catalog",
    __typename: "Layout",
    uri: "sem://design-system-docs#layout.catalog",
    name: "Catalog",
    id: "sem://design-system-docs#layout.catalog",
  },
  "client:sem://design-system-docs#view.tokens:composes:edges:1": {
    __id: "client:sem://design-system-docs#view.tokens:composes:edges:1",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.explorer",
    },
  },
  "sem://design-system-docs#layout.explorer": {
    __id: "sem://design-system-docs#layout.explorer",
    __typename: "Layout",
    uri: "sem://design-system-docs#layout.explorer",
    name: "Explorer",
    id: "sem://design-system-docs#layout.explorer",
  },
  "client:root:pairings(first:100):edges:32": {
    __id: "client:root:pairings(first:100):edges:32",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-cascade",
    },
  },
  "sem://design-system-docs#pairing.b6-cascade": {
    __id: "sem://design-system-docs#pairing.b6-cascade",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b6-cascade",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b6",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b6-cascade:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.cascade",
    },
    id: "sem://design-system-docs#pairing.b6-cascade",
  },
  "client:sem://design-system-docs#pairing.b6-cascade:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b6-cascade:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b6-cascade:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b6-cascade:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b6-cascade:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:33": {
    __id: "client:root:pairings(first:100):edges:33",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-compare",
    },
  },
  "sem://design-system-docs#pairing.b6-compare": {
    __id: "sem://design-system-docs#pairing.b6-compare",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b6-compare",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b6",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b6-compare:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.compare",
    },
    id: "sem://design-system-docs#pairing.b6-compare",
  },
  "client:sem://design-system-docs#pairing.b6-compare:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b6-compare:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b6-compare:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b6-compare:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b6-compare:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.compare": {
    __id: "sem://design-system-docs#view.compare",
    __typename: "Peek",
    uri: "sem://design-system-docs#view.compare",
    composes: {
      __ref: "client:sem://design-system-docs#view.compare:composes",
    },
    id: "sem://design-system-docs#view.compare",
  },
  "client:sem://design-system-docs#view.compare:composes": {
    __id: "client:sem://design-system-docs#view.compare:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:34": {
    __id: "client:root:pairings(first:100):edges:34",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-port",
    },
  },
  "sem://design-system-docs#pairing.b6-port": {
    __id: "sem://design-system-docs#pairing.b6-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b6-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b6",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b6-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b6-port",
  },
  "client:sem://design-system-docs#pairing.b6-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b6-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:35": {
    __id: "client:root:pairings(first:100):edges:35",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-section-tokens",
    },
  },
  "sem://design-system-docs#pairing.b6-section-tokens": {
    __id: "sem://design-system-docs#pairing.b6-section-tokens",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b6-section-tokens",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b6",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b6-section-tokens:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-tokens",
    },
    id: "sem://design-system-docs#pairing.b6-section-tokens",
  },
  "client:sem://design-system-docs#pairing.b6-section-tokens:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b6-section-tokens:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b6-section-tokens:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b6-section-tokens:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.b6-section-tokens:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.section-tokens": {
    __id: "sem://design-system-docs#view.section-tokens",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-tokens",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-tokens:composes",
    },
    id: "sem://design-system-docs#view.section-tokens",
  },
  "client:sem://design-system-docs#view.section-tokens:composes": {
    __id: "client:sem://design-system-docs#view.section-tokens:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:36": {
    __id: "client:root:pairings(first:100):edges:36",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b7-configurator",
    },
  },
  "sem://design-system-docs#pairing.b7-configurator": {
    __id: "sem://design-system-docs#pairing.b7-configurator",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b7-configurator",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b7",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b7-configurator:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.configurator",
    },
    id: "sem://design-system-docs#pairing.b7-configurator",
  },
  "client:sem://design-system-docs#pairing.b7-configurator:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b7-configurator:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b7-configurator:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b7-configurator:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b7-configurator:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.configurator": {
    __id: "sem://design-system-docs#view.configurator",
    __typename: "ComposerSurface",
    uri: "sem://design-system-docs#view.configurator",
    composes: {
      __ref: "client:sem://design-system-docs#view.configurator:composes",
    },
    id: "sem://design-system-docs#view.configurator",
  },
  "client:sem://design-system-docs#view.configurator:composes": {
    __id: "client:sem://design-system-docs#view.configurator:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:37": {
    __id: "client:root:pairings(first:100):edges:37",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b7-guide-theming",
    },
  },
  "sem://design-system-docs#pairing.b7-guide-theming": {
    __id: "sem://design-system-docs#pairing.b7-guide-theming",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b7-guide-theming",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b7",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.b7-guide-theming:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-theming",
    },
    id: "sem://design-system-docs#pairing.b7-guide-theming",
  },
  "client:sem://design-system-docs#pairing.b7-guide-theming:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b7-guide-theming:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b7-guide-theming:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b7-guide-theming:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b7-guide-theming:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.guide-theming": {
    __id: "sem://design-system-docs#view.guide-theming",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-theming",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-theming:composes",
    },
    id: "sem://design-system-docs#view.guide-theming",
  },
  "client:sem://design-system-docs#view.guide-theming:composes": {
    __id: "client:sem://design-system-docs#view.guide-theming:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:38": {
    __id: "client:root:pairings(first:100):edges:38",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b7-port",
    },
  },
  "sem://design-system-docs#pairing.b7-port": {
    __id: "sem://design-system-docs#pairing.b7-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b7-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b7",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b7-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b7-port",
  },
  "client:sem://design-system-docs#pairing.b7-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b7-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:39": {
    __id: "client:root:pairings(first:100):edges:39",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-chips",
    },
  },
  "sem://design-system-docs#pairing.b8-chips": {
    __id: "sem://design-system-docs#pairing.b8-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b8-chips",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b8",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b8-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.b8-chips",
  },
  "client:sem://design-system-docs#pairing.b8-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b8-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b8-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b8-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b8-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:40": {
    __id: "client:root:pairings(first:100):edges:40",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-cmdk",
    },
  },
  "sem://design-system-docs#pairing.b8-cmdk": {
    __id: "sem://design-system-docs#pairing.b8-cmdk",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b8-cmdk",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b8",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b8-cmdk:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.cmdk",
    },
    id: "sem://design-system-docs#pairing.b8-cmdk",
  },
  "client:sem://design-system-docs#pairing.b8-cmdk:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b8-cmdk:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.b8-cmdk:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.b8-cmdk:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.b8-cmdk:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "sem://design-system-docs#view.cmdk": {
    __id: "sem://design-system-docs#view.cmdk",
    __typename: "Mechanism",
    uri: "sem://design-system-docs#view.cmdk",
    composes: {
      __ref: "client:sem://design-system-docs#view.cmdk:composes",
    },
    id: "sem://design-system-docs#view.cmdk",
  },
  "client:sem://design-system-docs#view.cmdk:composes": {
    __id: "client:sem://design-system-docs#view.cmdk:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:41": {
    __id: "client:root:pairings(first:100):edges:41",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-port",
    },
  },
  "sem://design-system-docs#pairing.b8-port": {
    __id: "sem://design-system-docs#pairing.b8-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b8-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b8",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b8-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b8-port",
  },
  "client:sem://design-system-docs#pairing.b8-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b8-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:42": {
    __id: "client:root:pairings(first:100):edges:42",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-pragma-port",
    },
  },
  "sem://design-system-docs#pairing.b8-pragma-port": {
    __id: "sem://design-system-docs#pairing.b8-pragma-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b8-pragma-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b8",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b8-pragma-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port.pragma",
    },
    id: "sem://design-system-docs#pairing.b8-pragma-port",
  },
  "client:sem://design-system-docs#pairing.b8-pragma-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b8-pragma-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "sem://design-system-docs#port.pragma": {
    __id: "sem://design-system-docs#port.pragma",
    __typename: "Port",
    uri: "sem://design-system-docs#port.pragma",
    composes: {
      __ref: "client:sem://design-system-docs#port.pragma:composes",
    },
    id: "sem://design-system-docs#port.pragma",
  },
  "client:sem://design-system-docs#port.pragma:composes": {
    __id: "client:sem://design-system-docs#port.pragma:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:43": {
    __id: "client:root:pairings(first:100):edges:43",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b9-port",
    },
  },
  "sem://design-system-docs#pairing.b9-port": {
    __id: "sem://design-system-docs#pairing.b9-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.b9-port",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.b9",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.b9-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.b9-port",
  },
  "client:sem://design-system-docs#pairing.b9-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.b9-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:44": {
    __id: "client:root:pairings(first:100):edges:44",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c1-composer-contribute",
    },
  },
  "sem://design-system-docs#pairing.c1-composer-contribute": {
    __id: "sem://design-system-docs#pairing.c1-composer-contribute",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c1-composer-contribute",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c1",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c1-composer-contribute:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-contribute",
    },
    id: "sem://design-system-docs#pairing.c1-composer-contribute",
  },
  "client:sem://design-system-docs#pairing.c1-composer-contribute:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c1-composer-contribute:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c1-composer-contribute:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c1-composer-contribute:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c1-composer-contribute:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(first:100):edges:45": {
    __id: "client:root:pairings(first:100):edges:45",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c1-guide",
    },
  },
  "sem://design-system-docs#pairing.c1-guide": {
    __id: "sem://design-system-docs#pairing.c1-guide",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c1-guide",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c1-guide:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-contribute",
    },
    id: "sem://design-system-docs#pairing.c1-guide",
  },
  "client:sem://design-system-docs#pairing.c1-guide:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c1-guide:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c1-guide:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c1-guide:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.c1-guide:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.guide-contribute": {
    __id: "sem://design-system-docs#view.guide-contribute",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-contribute",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-contribute:composes",
    },
    id: "sem://design-system-docs#view.guide-contribute",
  },
  "client:sem://design-system-docs#view.guide-contribute:composes": {
    __id: "client:sem://design-system-docs#view.guide-contribute:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:46": {
    __id: "client:root:pairings(first:100):edges:46",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c1-definitions",
    },
  },
  "sem://design-system-docs#pairing.c1-definitions": {
    __id: "sem://design-system-docs#pairing.c1-definitions",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c1-definitions",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c1-definitions:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.definitions",
    },
    id: "sem://design-system-docs#pairing.c1-definitions",
  },
  "client:sem://design-system-docs#pairing.c1-definitions:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c1-definitions:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c1-definitions:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c1-definitions:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.c1-definitions:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.definitions": {
    __id: "sem://design-system-docs#view.definitions",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.definitions",
    composes: {
      __ref: "client:sem://design-system-docs#view.definitions:composes",
    },
    id: "sem://design-system-docs#view.definitions",
  },
  "client:sem://design-system-docs#view.definitions:composes": {
    __id: "client:sem://design-system-docs#view.definitions:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.definitions:composes:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#view.definitions:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.definitions:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.explorer",
    },
  },
  "client:root:pairings(first:100):edges:47": {
    __id: "client:root:pairings(first:100):edges:47",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c2-class-page",
    },
  },
  "sem://design-system-docs#pairing.c2-class-page": {
    __id: "sem://design-system-docs#pairing.c2-class-page",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c2-class-page",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c2-class-page:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.class-page",
    },
    id: "sem://design-system-docs#pairing.c2-class-page",
  },
  "client:sem://design-system-docs#pairing.c2-class-page:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c2-class-page:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c2-class-page:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c2-class-page:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.c2-class-page:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.class-page": {
    __id: "sem://design-system-docs#view.class-page",
    __typename: "Detail",
    uri: "sem://design-system-docs#view.class-page",
    composes: {
      __ref: "client:sem://design-system-docs#view.class-page:composes",
    },
    id: "sem://design-system-docs#view.class-page",
  },
  "client:sem://design-system-docs#view.class-page:composes": {
    __id: "client:sem://design-system-docs#view.class-page:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.class-page:composes:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#view.class-page:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.class-page:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.entity",
    },
  },
  "sem://design-system-docs#layout.entity": {
    __id: "sem://design-system-docs#layout.entity",
    __typename: "Layout",
    uri: "sem://design-system-docs#layout.entity",
    name: "Entity",
    id: "sem://design-system-docs#layout.entity",
  },
  "client:root:pairings(first:100):edges:48": {
    __id: "client:root:pairings(first:100):edges:48",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c2-editor",
    },
  },
  "sem://design-system-docs#pairing.c2-editor": {
    __id: "sem://design-system-docs#pairing.c2-editor",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c2-editor",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c2-editor:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.editor",
    },
    id: "sem://design-system-docs#pairing.c2-editor",
  },
  "client:sem://design-system-docs#pairing.c2-editor:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c2-editor:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c2-editor:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c2-editor:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.c2-editor:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.editor": {
    __id: "sem://design-system-docs#view.editor",
    __typename: "Editor",
    uri: "sem://design-system-docs#view.editor",
    composes: {
      __ref: "client:sem://design-system-docs#view.editor:composes",
    },
    id: "sem://design-system-docs#view.editor",
  },
  "client:sem://design-system-docs#view.editor:composes": {
    __id: "client:sem://design-system-docs#view.editor:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:49": {
    __id: "client:root:pairings(first:100):edges:49",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c2-port",
    },
  },
  "sem://design-system-docs#pairing.c2-port": {
    __id: "sem://design-system-docs#pairing.c2-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c2-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c2-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.c2-port",
  },
  "client:sem://design-system-docs#pairing.c2-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c2-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:50": {
    __id: "client:root:pairings(first:100):edges:50",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c3-composer-contribute",
    },
  },
  "sem://design-system-docs#pairing.c3-composer-contribute": {
    __id: "sem://design-system-docs#pairing.c3-composer-contribute",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c3-composer-contribute",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c3-composer-contribute:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-contribute",
    },
    id: "sem://design-system-docs#pairing.c3-composer-contribute",
  },
  "client:sem://design-system-docs#pairing.c3-composer-contribute:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c3-composer-contribute:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c3-composer-contribute:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c3-composer-contribute:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c3-composer-contribute:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(first:100):edges:51": {
    __id: "client:root:pairings(first:100):edges:51",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c3-guide-upstream",
    },
  },
  "sem://design-system-docs#pairing.c3-guide-upstream": {
    __id: "sem://design-system-docs#pairing.c3-guide-upstream",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c3-guide-upstream",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c3-guide-upstream:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-upstream",
    },
    id: "sem://design-system-docs#pairing.c3-guide-upstream",
  },
  "client:sem://design-system-docs#pairing.c3-guide-upstream:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c3-guide-upstream:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c3-guide-upstream:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c3-guide-upstream:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c3-guide-upstream:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.guide-upstream": {
    __id: "sem://design-system-docs#view.guide-upstream",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-upstream",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-upstream:composes",
    },
    id: "sem://design-system-docs#view.guide-upstream",
  },
  "client:sem://design-system-docs#view.guide-upstream:composes": {
    __id: "client:sem://design-system-docs#view.guide-upstream:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:52": {
    __id: "client:root:pairings(first:100):edges:52",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-chips",
    },
  },
  "sem://design-system-docs#pairing.c4-chips": {
    __id: "sem://design-system-docs#pairing.c4-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c4-chips",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c4-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.c4-chips",
  },
  "client:sem://design-system-docs#pairing.c4-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c4-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c4-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c4-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.c4-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:53": {
    __id: "client:root:pairings(first:100):edges:53",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-port",
    },
  },
  "sem://design-system-docs#pairing.c4-port": {
    __id: "sem://design-system-docs#pairing.c4-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c4-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c4-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.c4-port",
  },
  "client:sem://design-system-docs#pairing.c4-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c4-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:54": {
    __id: "client:root:pairings(first:100):edges:54",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-standards-code",
    },
  },
  "sem://design-system-docs#pairing.c4-standards-code": {
    __id: "sem://design-system-docs#pairing.c4-standards-code",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c4-standards-code",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c4",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c4-standards-code:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards-code",
    },
    id: "sem://design-system-docs#pairing.c4-standards-code",
  },
  "client:sem://design-system-docs#pairing.c4-standards-code:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c4-standards-code:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c4-standards-code:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c4-standards-code:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c4-standards-code:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.standards-code": {
    __id: "sem://design-system-docs#view.standards-code",
    __typename: "View",
    uri: "sem://design-system-docs#view.standards-code",
    composes: {
      __ref: "client:sem://design-system-docs#view.standards-code:composes",
    },
    id: "sem://design-system-docs#view.standards-code",
  },
  "client:sem://design-system-docs#view.standards-code:composes": {
    __id: "client:sem://design-system-docs#view.standards-code:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:55": {
    __id: "client:root:pairings(first:100):edges:55",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-terminal",
    },
  },
  "sem://design-system-docs#pairing.c4-terminal": {
    __id: "sem://design-system-docs#pairing.c4-terminal",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c4-terminal",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.c4-terminal:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.terminal-lookup",
    },
    id: "sem://design-system-docs#pairing.c4-terminal",
  },
  "client:sem://design-system-docs#pairing.c4-terminal:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c4-terminal:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c4-terminal:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c4-terminal:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.c4-terminal:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "client:root:pairings(first:100):edges:56": {
    __id: "client:root:pairings(first:100):edges:56",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c5-audit-coverage",
    },
  },
  "sem://design-system-docs#pairing.c5-audit-coverage": {
    __id: "sem://design-system-docs#pairing.c5-audit-coverage",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c5-audit-coverage",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c5",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c5-audit-coverage:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-coverage",
    },
    id: "sem://design-system-docs#pairing.c5-audit-coverage",
  },
  "client:sem://design-system-docs#pairing.c5-audit-coverage:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c5-audit-coverage:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c5-audit-coverage:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c5-audit-coverage:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c5-audit-coverage:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.audit-coverage": {
    __id: "sem://design-system-docs#view.audit-coverage",
    __typename: "View",
    uri: "sem://design-system-docs#view.audit-coverage",
    composes: {
      __ref: "client:sem://design-system-docs#view.audit-coverage:composes",
    },
    id: "sem://design-system-docs#view.audit-coverage",
  },
  "client:sem://design-system-docs#view.audit-coverage:composes": {
    __id: "client:sem://design-system-docs#view.audit-coverage:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:57": {
    __id: "client:root:pairings(first:100):edges:57",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c5-composer-proposal",
    },
  },
  "sem://design-system-docs#pairing.c5-composer-proposal": {
    __id: "sem://design-system-docs#pairing.c5-composer-proposal",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c5-composer-proposal",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c5",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c5-composer-proposal:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-proposal",
    },
    id: "sem://design-system-docs#pairing.c5-composer-proposal",
  },
  "client:sem://design-system-docs#pairing.c5-composer-proposal:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c5-composer-proposal:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c5-composer-proposal:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c5-composer-proposal:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c5-composer-proposal:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.composer-proposal": {
    __id: "sem://design-system-docs#view.composer-proposal",
    __typename: "ComposerSurface",
    uri: "sem://design-system-docs#view.composer-proposal",
    composes: {
      __ref: "client:sem://design-system-docs#view.composer-proposal:composes",
    },
    id: "sem://design-system-docs#view.composer-proposal",
  },
  "client:sem://design-system-docs#view.composer-proposal:composes": {
    __id: "client:sem://design-system-docs#view.composer-proposal:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:58": {
    __id: "client:root:pairings(first:100):edges:58",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c5-proposal-status",
    },
  },
  "sem://design-system-docs#pairing.c5-proposal-status": {
    __id: "sem://design-system-docs#pairing.c5-proposal-status",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c5-proposal-status",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c5",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c5-proposal-status:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.proposal-status",
    },
    id: "sem://design-system-docs#pairing.c5-proposal-status",
  },
  "client:sem://design-system-docs#pairing.c5-proposal-status:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c5-proposal-status:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c5-proposal-status:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c5-proposal-status:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c5-proposal-status:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "sem://design-system-docs#view.proposal-status": {
    __id: "sem://design-system-docs#view.proposal-status",
    __typename: "View",
    uri: "sem://design-system-docs#view.proposal-status",
    composes: {
      __ref: "client:sem://design-system-docs#view.proposal-status:composes",
    },
    id: "sem://design-system-docs#view.proposal-status",
  },
  "client:sem://design-system-docs#view.proposal-status:composes": {
    __id: "client:sem://design-system-docs#view.proposal-status:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:59": {
    __id: "client:root:pairings(first:100):edges:59",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c6-composer-contribute",
    },
  },
  "sem://design-system-docs#pairing.c6-composer-contribute": {
    __id: "sem://design-system-docs#pairing.c6-composer-contribute",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c6-composer-contribute",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c6",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c6-composer-contribute:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-contribute",
    },
    id: "sem://design-system-docs#pairing.c6-composer-contribute",
  },
  "client:sem://design-system-docs#pairing.c6-composer-contribute:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c6-composer-contribute:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c6-composer-contribute:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c6-composer-contribute:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c6-composer-contribute:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(first:100):edges:60": {
    __id: "client:root:pairings(first:100):edges:60",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c6-standards-content",
    },
  },
  "sem://design-system-docs#pairing.c6-standards-content": {
    __id: "sem://design-system-docs#pairing.c6-standards-content",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.c6-standards-content",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.c6",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.c6-standards-content:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards-content",
    },
    id: "sem://design-system-docs#pairing.c6-standards-content",
  },
  "client:sem://design-system-docs#pairing.c6-standards-content:arrivals": {
    __id: "client:sem://design-system-docs#pairing.c6-standards-content:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.c6-standards-content:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.c6-standards-content:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.c6-standards-content:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(first:100):edges:61": {
    __id: "client:root:pairings(first:100):edges:61",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-scaffold",
    },
  },
  "sem://design-system-docs#pairing.cli-scaffold": {
    __id: "sem://design-system-docs#pairing.cli-scaffold",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.cli-scaffold",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.cli-scaffold",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.cli-scaffold:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#composer.create",
    },
    id: "sem://design-system-docs#pairing.cli-scaffold",
  },
  "client:sem://design-system-docs#pairing.cli-scaffold:arrivals": {
    __id: "client:sem://design-system-docs#pairing.cli-scaffold:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.cli-scaffold:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.cli-scaffold:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.cli-scaffold:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#composer.create": {
    __id: "sem://design-system-docs#composer.create",
    __typename: "ComposerSurface",
    uri: "sem://design-system-docs#composer.create",
    composes: {
      __ref: "client:sem://design-system-docs#composer.create:composes",
    },
    id: "sem://design-system-docs#composer.create",
  },
  "client:sem://design-system-docs#composer.create:composes": {
    __id: "client:sem://design-system-docs#composer.create:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:62": {
    __id: "client:root:pairings(first:100):edges:62",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-wire",
    },
  },
  "sem://design-system-docs#pairing.cli-wire": {
    __id: "sem://design-system-docs#pairing.cli-wire",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.cli-wire",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.cli-wire-tokens",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.cli-wire:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port.pragma",
    },
    id: "sem://design-system-docs#pairing.cli-wire",
  },
  "client:sem://design-system-docs#pairing.cli-wire:arrivals": {
    __id: "client:sem://design-system-docs#pairing.cli-wire:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:63": {
    __id: "client:root:pairings(first:100):edges:63",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-health",
    },
  },
  "sem://design-system-docs#pairing.cli-health": {
    __id: "sem://design-system-docs#pairing.cli-health",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.cli-health",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.cli-health",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.cli-health:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#lens.doctor",
    },
    id: "sem://design-system-docs#pairing.cli-health",
  },
  "client:sem://design-system-docs#pairing.cli-health:arrivals": {
    __id: "client:sem://design-system-docs#pairing.cli-health:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.cli-health:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.cli-health:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.cli-health:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#lens.doctor": {
    __id: "sem://design-system-docs#lens.doctor",
    __typename: "Lens",
    uri: "sem://design-system-docs#lens.doctor",
    composes: {
      __ref: "client:sem://design-system-docs#lens.doctor:composes",
    },
    id: "sem://design-system-docs#lens.doctor",
  },
  "client:sem://design-system-docs#lens.doctor:composes": {
    __id: "client:sem://design-system-docs#lens.doctor:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:64": {
    __id: "client:root:pairings(first:100):edges:64",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-setup",
    },
  },
  "sem://design-system-docs#pairing.cli-setup": {
    __id: "sem://design-system-docs#pairing.cli-setup",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.cli-setup",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.cli-setup",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.cli-setup:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port.pragma",
    },
    id: "sem://design-system-docs#pairing.cli-setup",
  },
  "client:sem://design-system-docs#pairing.cli-setup:arrivals": {
    __id: "client:sem://design-system-docs#pairing.cli-setup:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:65": {
    __id: "client:root:pairings(first:100):edges:65",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-pin",
    },
  },
  "sem://design-system-docs#pairing.cli-pin": {
    __id: "sem://design-system-docs#pairing.cli-pin",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.cli-pin",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.cli-pin",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.cli-pin:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port.pragma",
    },
    id: "sem://design-system-docs#pairing.cli-pin",
  },
  "client:sem://design-system-docs#pairing.cli-pin:arrivals": {
    __id: "client:sem://design-system-docs#pairing.cli-pin:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:66": {
    __id: "client:root:pairings(first:100):edges:66",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l1-guides",
    },
  },
  "sem://design-system-docs#pairing.l1-guides": {
    __id: "sem://design-system-docs#pairing.l1-guides",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l1-guides",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l1-guides:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guides",
    },
    id: "sem://design-system-docs#pairing.l1-guides",
  },
  "client:sem://design-system-docs#pairing.l1-guides:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l1-guides:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l1-guides:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l1-guides:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l1-guides:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.guides": {
    __id: "sem://design-system-docs#view.guides",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.guides",
    composes: {
      __ref: "client:sem://design-system-docs#view.guides:composes",
    },
    id: "sem://design-system-docs#view.guides",
  },
  "client:sem://design-system-docs#view.guides:composes": {
    __id: "client:sem://design-system-docs#view.guides:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: ["client:sem://design-system-docs#view.guides:composes:edges:0"],
    },
  },
  "client:sem://design-system-docs#view.guides:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.guides:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.reading",
    },
  },
  "client:root:pairings(first:100):edges:67": {
    __id: "client:root:pairings(first:100):edges:67",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l1-home",
    },
  },
  "sem://design-system-docs#pairing.l1-home": {
    __id: "sem://design-system-docs#pairing.l1-home",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l1-home",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l1-home:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.home",
    },
    id: "sem://design-system-docs#pairing.l1-home",
  },
  "client:sem://design-system-docs#pairing.l1-home:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l1-home:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l1-home:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l1-home:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l1-home:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.home": {
    __id: "sem://design-system-docs#view.home",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.home",
    composes: {
      __ref: "client:sem://design-system-docs#view.home:composes",
    },
    id: "sem://design-system-docs#view.home",
  },
  "client:sem://design-system-docs#view.home:composes": {
    __id: "client:sem://design-system-docs#view.home:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: ["client:sem://design-system-docs#view.home:composes:edges:0"],
    },
  },
  "client:sem://design-system-docs#view.home:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.home:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.lobby",
    },
  },
  "sem://design-system-docs#layout.lobby": {
    __id: "sem://design-system-docs#layout.lobby",
    __typename: "Layout",
    uri: "sem://design-system-docs#layout.lobby",
    name: "Lobby",
    id: "sem://design-system-docs#layout.lobby",
  },
  "client:root:pairings(first:100):edges:68": {
    __id: "client:root:pairings(first:100):edges:68",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l10-class-page",
    },
  },
  "sem://design-system-docs#pairing.l10-class-page": {
    __id: "sem://design-system-docs#pairing.l10-class-page",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l10-class-page",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l10",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l10-class-page:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.class-page",
    },
    id: "sem://design-system-docs#pairing.l10-class-page",
  },
  "client:sem://design-system-docs#pairing.l10-class-page:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l10-class-page:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l10-class-page:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l10-class-page:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l10-class-page:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:69": {
    __id: "client:root:pairings(first:100):edges:69",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l10-port",
    },
  },
  "sem://design-system-docs#pairing.l10-port": {
    __id: "sem://design-system-docs#pairing.l10-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l10-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l10",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l10-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l10-port",
  },
  "client:sem://design-system-docs#pairing.l10-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l10-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:70": {
    __id: "client:root:pairings(first:100):edges:70",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l10-schema-graph",
    },
  },
  "sem://design-system-docs#pairing.l10-schema-graph": {
    __id: "sem://design-system-docs#pairing.l10-schema-graph",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l10-schema-graph",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l10",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l10-schema-graph:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.schema-graph",
    },
    id: "sem://design-system-docs#pairing.l10-schema-graph",
  },
  "client:sem://design-system-docs#pairing.l10-schema-graph:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l10-schema-graph:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l10-schema-graph:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l10-schema-graph:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l10-schema-graph:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.schema-graph": {
    __id: "sem://design-system-docs#view.schema-graph",
    __typename: "View",
    uri: "sem://design-system-docs#view.schema-graph",
    composes: {
      __ref: "client:sem://design-system-docs#view.schema-graph:composes",
    },
    id: "sem://design-system-docs#view.schema-graph",
  },
  "client:sem://design-system-docs#view.schema-graph:composes": {
    __id: "client:sem://design-system-docs#view.schema-graph:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:71": {
    __id: "client:root:pairings(first:100):edges:71",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-section-graph",
    },
  },
  "sem://design-system-docs#pairing.l11-section-graph": {
    __id: "sem://design-system-docs#pairing.l11-section-graph",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l11-section-graph",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l11",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l11-section-graph:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-graph",
    },
    id: "sem://design-system-docs#pairing.l11-section-graph",
  },
  "client:sem://design-system-docs#pairing.l11-section-graph:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l11-section-graph:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l11-section-graph:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l11-section-graph:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.l11-section-graph:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "client:root:pairings(first:100):edges:72": {
    __id: "client:root:pairings(first:100):edges:72",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-neighborhood",
    },
  },
  "sem://design-system-docs#pairing.l11-neighborhood": {
    __id: "sem://design-system-docs#pairing.l11-neighborhood",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l11-neighborhood",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l11",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l11-neighborhood:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.neighborhood",
    },
    id: "sem://design-system-docs#pairing.l11-neighborhood",
  },
  "client:sem://design-system-docs#pairing.l11-neighborhood:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l11-neighborhood:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l11-neighborhood:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l11-neighborhood:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l11-neighborhood:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "client:root:pairings(first:100):edges:73": {
    __id: "client:root:pairings(first:100):edges:73",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-port",
    },
  },
  "sem://design-system-docs#pairing.l11-port": {
    __id: "sem://design-system-docs#pairing.l11-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l11-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l11",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l11-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l11-port",
  },
  "client:sem://design-system-docs#pairing.l11-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l11-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:74": {
    __id: "client:root:pairings(first:100):edges:74",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-schema-graph",
    },
  },
  "sem://design-system-docs#pairing.l11-schema-graph": {
    __id: "sem://design-system-docs#pairing.l11-schema-graph",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l11-schema-graph",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l11",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l11-schema-graph:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.schema-graph",
    },
    id: "sem://design-system-docs#pairing.l11-schema-graph",
  },
  "client:sem://design-system-docs#pairing.l11-schema-graph:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l11-schema-graph:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l11-schema-graph:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l11-schema-graph:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l11-schema-graph:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:75": {
    __id: "client:root:pairings(first:100):edges:75",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l12-changelog",
    },
  },
  "sem://design-system-docs#pairing.l12-changelog": {
    __id: "sem://design-system-docs#pairing.l12-changelog",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l12-changelog",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l12",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l12-changelog:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.changelog",
    },
    id: "sem://design-system-docs#pairing.l12-changelog",
  },
  "client:sem://design-system-docs#pairing.l12-changelog:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l12-changelog:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l12-changelog:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l12-changelog:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l12-changelog:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.changelog": {
    __id: "sem://design-system-docs#view.changelog",
    __typename: "View",
    uri: "sem://design-system-docs#view.changelog",
    composes: {
      __ref: "client:sem://design-system-docs#view.changelog:composes",
    },
    id: "sem://design-system-docs#view.changelog",
  },
  "client:sem://design-system-docs#view.changelog:composes": {
    __id: "client:sem://design-system-docs#view.changelog:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.changelog:composes:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#view.changelog:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.changelog:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.reading",
    },
  },
  "client:root:pairings(first:100):edges:76": {
    __id: "client:root:pairings(first:100):edges:76",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l12-port",
    },
  },
  "sem://design-system-docs#pairing.l12-port": {
    __id: "sem://design-system-docs#pairing.l12-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l12-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l12",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l12-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l12-port",
  },
  "client:sem://design-system-docs#pairing.l12-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l12-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:77": {
    __id: "client:root:pairings(first:100):edges:77",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l12-status-badge",
    },
  },
  "sem://design-system-docs#pairing.l12-status-badge": {
    __id: "sem://design-system-docs#pairing.l12-status-badge",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l12-status-badge",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l12",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l12-status-badge:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.status-badge",
    },
    id: "sem://design-system-docs#pairing.l12-status-badge",
  },
  "client:sem://design-system-docs#pairing.l12-status-badge:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l12-status-badge:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l12-status-badge:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l12-status-badge:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l12-status-badge:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:78": {
    __id: "client:root:pairings(first:100):edges:78",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l2-chips",
    },
  },
  "sem://design-system-docs#pairing.l2-chips": {
    __id: "sem://design-system-docs#pairing.l2-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l2-chips",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l2-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.l2-chips",
  },
  "client:sem://design-system-docs#pairing.l2-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l2-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l2-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l2-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l2-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:79": {
    __id: "client:root:pairings(first:100):edges:79",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l2-guide-foundations",
    },
  },
  "sem://design-system-docs#pairing.l2-guide-foundations": {
    __id: "sem://design-system-docs#pairing.l2-guide-foundations",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l2-guide-foundations",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l2",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l2-guide-foundations:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-foundations",
    },
    id: "sem://design-system-docs#pairing.l2-guide-foundations",
  },
  "client:sem://design-system-docs#pairing.l2-guide-foundations:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l2-guide-foundations:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l2-guide-foundations:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l2-guide-foundations:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.l2-guide-foundations:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.guide-foundations": {
    __id: "sem://design-system-docs#view.guide-foundations",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-foundations",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-foundations:composes",
    },
    id: "sem://design-system-docs#view.guide-foundations",
  },
  "client:sem://design-system-docs#view.guide-foundations:composes": {
    __id: "client:sem://design-system-docs#view.guide-foundations:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:80": {
    __id: "client:root:pairings(first:100):edges:80",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-components",
    },
  },
  "sem://design-system-docs#pairing.l3-components": {
    __id: "sem://design-system-docs#pairing.l3-components",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l3-components",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l3-components:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.components",
    },
    id: "sem://design-system-docs#pairing.l3-components",
  },
  "client:sem://design-system-docs#pairing.l3-components:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l3-components:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l3-components:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l3-components:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l3-components:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.components": {
    __id: "sem://design-system-docs#view.components",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.components",
    composes: {
      __ref: "client:sem://design-system-docs#view.components:composes",
    },
    id: "sem://design-system-docs#view.components",
  },
  "client:sem://design-system-docs#view.components:composes": {
    __id: "client:sem://design-system-docs#view.components:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.components:composes:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#view.components:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.components:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.catalog",
    },
  },
  "client:root:pairings(first:100):edges:81": {
    __id: "client:root:pairings(first:100):edges:81",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-neighborhood",
    },
  },
  "sem://design-system-docs#pairing.l3-neighborhood": {
    __id: "sem://design-system-docs#pairing.l3-neighborhood",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l3-neighborhood",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l3-neighborhood:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.neighborhood",
    },
    id: "sem://design-system-docs#pairing.l3-neighborhood",
  },
  "client:sem://design-system-docs#pairing.l3-neighborhood:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l3-neighborhood:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l3-neighborhood:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l3-neighborhood:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l3-neighborhood:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "client:root:pairings(first:100):edges:82": {
    __id: "client:root:pairings(first:100):edges:82",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-port",
    },
  },
  "sem://design-system-docs#pairing.l3-port": {
    __id: "sem://design-system-docs#pairing.l3-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l3-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l3-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l3-port",
  },
  "client:sem://design-system-docs#pairing.l3-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l3-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:83": {
    __id: "client:root:pairings(first:100):edges:83",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-terminal",
    },
  },
  "sem://design-system-docs#pairing.l3-terminal": {
    __id: "sem://design-system-docs#pairing.l3-terminal",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l3-terminal",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l3-terminal:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#lens.terminal-catalog",
    },
    id: "sem://design-system-docs#pairing.l3-terminal",
  },
  "client:sem://design-system-docs#pairing.l3-terminal:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l3-terminal:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l3-terminal:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l3-terminal:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l3-terminal:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:84": {
    __id: "client:root:pairings(first:100):edges:84",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-cmdk",
    },
  },
  "sem://design-system-docs#pairing.l4-cmdk": {
    __id: "sem://design-system-docs#pairing.l4-cmdk",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l4-cmdk",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l4-cmdk:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.cmdk",
    },
    id: "sem://design-system-docs#pairing.l4-cmdk",
  },
  "client:sem://design-system-docs#pairing.l4-cmdk:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l4-cmdk:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l4-cmdk:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l4-cmdk:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l4-cmdk:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:85": {
    __id: "client:root:pairings(first:100):edges:85",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-compare",
    },
  },
  "sem://design-system-docs#pairing.l4-compare": {
    __id: "sem://design-system-docs#pairing.l4-compare",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l4-compare",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l4-compare:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.compare",
    },
    id: "sem://design-system-docs#pairing.l4-compare",
  },
  "client:sem://design-system-docs#pairing.l4-compare:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l4-compare:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l4-compare:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l4-compare:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l4-compare:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "client:root:pairings(first:100):edges:86": {
    __id: "client:root:pairings(first:100):edges:86",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-guide-analog",
    },
  },
  "sem://design-system-docs#pairing.l4-guide-analog": {
    __id: "sem://design-system-docs#pairing.l4-guide-analog",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l4-guide-analog",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l4-guide-analog:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-analog",
    },
    id: "sem://design-system-docs#pairing.l4-guide-analog",
  },
  "client:sem://design-system-docs#pairing.l4-guide-analog:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l4-guide-analog:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l4-guide-analog:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l4-guide-analog:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l4-guide-analog:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.guide-analog": {
    __id: "sem://design-system-docs#view.guide-analog",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-analog",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-analog:composes",
    },
    id: "sem://design-system-docs#view.guide-analog",
  },
  "client:sem://design-system-docs#view.guide-analog:composes": {
    __id: "client:sem://design-system-docs#view.guide-analog:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:87": {
    __id: "client:root:pairings(first:100):edges:87",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-port",
    },
  },
  "sem://design-system-docs#pairing.l4-port": {
    __id: "sem://design-system-docs#pairing.l4-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l4-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l4-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l4-port",
  },
  "client:sem://design-system-docs#pairing.l4-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l4-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:88": {
    __id: "client:root:pairings(first:100):edges:88",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l5-guide-showcase",
    },
  },
  "sem://design-system-docs#pairing.l5-guide-showcase": {
    __id: "sem://design-system-docs#pairing.l5-guide-showcase",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l5-guide-showcase",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l5",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l5-guide-showcase:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-showcase",
    },
    id: "sem://design-system-docs#pairing.l5-guide-showcase",
  },
  "client:sem://design-system-docs#pairing.l5-guide-showcase:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l5-guide-showcase:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l5-guide-showcase:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l5-guide-showcase:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.l5-guide-showcase:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.guide-showcase": {
    __id: "sem://design-system-docs#view.guide-showcase",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-showcase",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-showcase:composes",
    },
    id: "sem://design-system-docs#view.guide-showcase",
  },
  "client:sem://design-system-docs#view.guide-showcase:composes": {
    __id: "client:sem://design-system-docs#view.guide-showcase:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:89": {
    __id: "client:root:pairings(first:100):edges:89",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l5-home",
    },
  },
  "sem://design-system-docs#pairing.l5-home": {
    __id: "sem://design-system-docs#pairing.l5-home",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l5-home",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l5",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l5-home:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.home",
    },
    id: "sem://design-system-docs#pairing.l5-home",
  },
  "client:sem://design-system-docs#pairing.l5-home:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l5-home:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l5-home:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l5-home:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l5-home:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:90": {
    __id: "client:root:pairings(first:100):edges:90",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l6-port",
    },
  },
  "sem://design-system-docs#pairing.l6-port": {
    __id: "sem://design-system-docs#pairing.l6-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l6-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l6",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l6-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l6-port",
  },
  "client:sem://design-system-docs#pairing.l6-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l6-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:91": {
    __id: "client:root:pairings(first:100):edges:91",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l6-section-guidelines",
    },
  },
  "sem://design-system-docs#pairing.l6-section-guidelines": {
    __id: "sem://design-system-docs#pairing.l6-section-guidelines",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l6-section-guidelines",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l6",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l6-section-guidelines:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-guidelines",
    },
    id: "sem://design-system-docs#pairing.l6-section-guidelines",
  },
  "client:sem://design-system-docs#pairing.l6-section-guidelines:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l6-section-guidelines:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l6-section-guidelines:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l6-section-guidelines:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.l6-section-guidelines:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.section-guidelines": {
    __id: "sem://design-system-docs#view.section-guidelines",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-guidelines",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-guidelines:composes",
    },
    id: "sem://design-system-docs#view.section-guidelines",
  },
  "client:sem://design-system-docs#view.section-guidelines:composes": {
    __id: "client:sem://design-system-docs#view.section-guidelines:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:92": {
    __id: "client:root:pairings(first:100):edges:92",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l6-standards",
    },
  },
  "sem://design-system-docs#pairing.l6-standards": {
    __id: "sem://design-system-docs#pairing.l6-standards",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l6-standards",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l6",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l6-standards:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards",
    },
    id: "sem://design-system-docs#pairing.l6-standards",
  },
  "client:sem://design-system-docs#pairing.l6-standards:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l6-standards:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l6-standards:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l6-standards:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l6-standards:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:93": {
    __id: "client:root:pairings(first:100):edges:93",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l7-definitions",
    },
  },
  "sem://design-system-docs#pairing.l7-definitions": {
    __id: "sem://design-system-docs#pairing.l7-definitions",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l7-definitions",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l7",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l7-definitions:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.definitions",
    },
    id: "sem://design-system-docs#pairing.l7-definitions",
  },
  "client:sem://design-system-docs#pairing.l7-definitions:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l7-definitions:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l7-definitions:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l7-definitions:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l7-definitions:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:94": {
    __id: "client:root:pairings(first:100):edges:94",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l7-guide-principles",
    },
  },
  "sem://design-system-docs#pairing.l7-guide-principles": {
    __id: "sem://design-system-docs#pairing.l7-guide-principles",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l7-guide-principles",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l7",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l7-guide-principles:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guide-principles",
    },
    id: "sem://design-system-docs#pairing.l7-guide-principles",
  },
  "client:sem://design-system-docs#pairing.l7-guide-principles:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l7-guide-principles:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l7-guide-principles:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l7-guide-principles:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.l7-guide-principles:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "sem://design-system-docs#view.guide-principles": {
    __id: "sem://design-system-docs#view.guide-principles",
    __typename: "View",
    uri: "sem://design-system-docs#view.guide-principles",
    composes: {
      __ref: "client:sem://design-system-docs#view.guide-principles:composes",
    },
    id: "sem://design-system-docs#view.guide-principles",
  },
  "client:sem://design-system-docs#view.guide-principles:composes": {
    __id: "client:sem://design-system-docs#view.guide-principles:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:95": {
    __id: "client:root:pairings(first:100):edges:95",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l8-port",
    },
  },
  "sem://design-system-docs#pairing.l8-port": {
    __id: "sem://design-system-docs#pairing.l8-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l8-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l8",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l8-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l8-port",
  },
  "client:sem://design-system-docs#pairing.l8-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l8-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(first:100):edges:96": {
    __id: "client:root:pairings(first:100):edges:96",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l8-standards-content",
    },
  },
  "sem://design-system-docs#pairing.l8-standards-content": {
    __id: "sem://design-system-docs#pairing.l8-standards-content",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l8-standards-content",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l8",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.l8-standards-content:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards-content",
    },
    id: "sem://design-system-docs#pairing.l8-standards-content",
  },
  "client:sem://design-system-docs#pairing.l8-standards-content:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l8-standards-content:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l8-standards-content:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l8-standards-content:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.l8-standards-content:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(first:100):edges:97": {
    __id: "client:root:pairings(first:100):edges:97",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-chips",
    },
  },
  "sem://design-system-docs#pairing.l9-chips": {
    __id: "sem://design-system-docs#pairing.l9-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l9-chips",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l9",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l9-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.l9-chips",
  },
  "client:sem://design-system-docs#pairing.l9-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l9-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l9-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l9-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l9-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(first:100):edges:98": {
    __id: "client:root:pairings(first:100):edges:98",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-definitions",
    },
  },
  "sem://design-system-docs#pairing.l9-definitions": {
    __id: "sem://design-system-docs#pairing.l9-definitions",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l9-definitions",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l9",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l9-definitions:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.definitions",
    },
    id: "sem://design-system-docs#pairing.l9-definitions",
  },
  "client:sem://design-system-docs#pairing.l9-definitions:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l9-definitions:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.l9-definitions:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.l9-definitions:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.l9-definitions:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(first:100):edges:99": {
    __id: "client:root:pairings(first:100):edges:99",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-port",
    },
  },
  "sem://design-system-docs#pairing.l9-port": {
    __id: "sem://design-system-docs#pairing.l9-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l9-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l9",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l9-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.l9-port",
  },
  "client:sem://design-system-docs#pairing.l9-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l9-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100)": {
    __id: "client:root:pairings(last:100)",
    __typename: "PairingConnection",
    edges: {
      __refs: [
        "client:root:pairings(last:100):edges:0",
        "client:root:pairings(last:100):edges:1",
        "client:root:pairings(last:100):edges:2",
        "client:root:pairings(last:100):edges:3",
        "client:root:pairings(last:100):edges:4",
        "client:root:pairings(last:100):edges:5",
        "client:root:pairings(last:100):edges:6",
        "client:root:pairings(last:100):edges:7",
        "client:root:pairings(last:100):edges:8",
        "client:root:pairings(last:100):edges:9",
        "client:root:pairings(last:100):edges:10",
        "client:root:pairings(last:100):edges:11",
        "client:root:pairings(last:100):edges:12",
        "client:root:pairings(last:100):edges:13",
        "client:root:pairings(last:100):edges:14",
        "client:root:pairings(last:100):edges:15",
        "client:root:pairings(last:100):edges:16",
        "client:root:pairings(last:100):edges:17",
        "client:root:pairings(last:100):edges:18",
        "client:root:pairings(last:100):edges:19",
        "client:root:pairings(last:100):edges:20",
        "client:root:pairings(last:100):edges:21",
        "client:root:pairings(last:100):edges:22",
        "client:root:pairings(last:100):edges:23",
        "client:root:pairings(last:100):edges:24",
        "client:root:pairings(last:100):edges:25",
        "client:root:pairings(last:100):edges:26",
        "client:root:pairings(last:100):edges:27",
        "client:root:pairings(last:100):edges:28",
        "client:root:pairings(last:100):edges:29",
        "client:root:pairings(last:100):edges:30",
        "client:root:pairings(last:100):edges:31",
        "client:root:pairings(last:100):edges:32",
        "client:root:pairings(last:100):edges:33",
        "client:root:pairings(last:100):edges:34",
        "client:root:pairings(last:100):edges:35",
        "client:root:pairings(last:100):edges:36",
        "client:root:pairings(last:100):edges:37",
        "client:root:pairings(last:100):edges:38",
        "client:root:pairings(last:100):edges:39",
        "client:root:pairings(last:100):edges:40",
        "client:root:pairings(last:100):edges:41",
        "client:root:pairings(last:100):edges:42",
        "client:root:pairings(last:100):edges:43",
        "client:root:pairings(last:100):edges:44",
        "client:root:pairings(last:100):edges:45",
        "client:root:pairings(last:100):edges:46",
        "client:root:pairings(last:100):edges:47",
        "client:root:pairings(last:100):edges:48",
        "client:root:pairings(last:100):edges:49",
        "client:root:pairings(last:100):edges:50",
        "client:root:pairings(last:100):edges:51",
        "client:root:pairings(last:100):edges:52",
        "client:root:pairings(last:100):edges:53",
        "client:root:pairings(last:100):edges:54",
        "client:root:pairings(last:100):edges:55",
        "client:root:pairings(last:100):edges:56",
        "client:root:pairings(last:100):edges:57",
        "client:root:pairings(last:100):edges:58",
        "client:root:pairings(last:100):edges:59",
        "client:root:pairings(last:100):edges:60",
        "client:root:pairings(last:100):edges:61",
        "client:root:pairings(last:100):edges:62",
        "client:root:pairings(last:100):edges:63",
        "client:root:pairings(last:100):edges:64",
        "client:root:pairings(last:100):edges:65",
        "client:root:pairings(last:100):edges:66",
        "client:root:pairings(last:100):edges:67",
        "client:root:pairings(last:100):edges:68",
        "client:root:pairings(last:100):edges:69",
        "client:root:pairings(last:100):edges:70",
        "client:root:pairings(last:100):edges:71",
        "client:root:pairings(last:100):edges:72",
        "client:root:pairings(last:100):edges:73",
        "client:root:pairings(last:100):edges:74",
        "client:root:pairings(last:100):edges:75",
        "client:root:pairings(last:100):edges:76",
        "client:root:pairings(last:100):edges:77",
        "client:root:pairings(last:100):edges:78",
        "client:root:pairings(last:100):edges:79",
        "client:root:pairings(last:100):edges:80",
        "client:root:pairings(last:100):edges:81",
        "client:root:pairings(last:100):edges:82",
        "client:root:pairings(last:100):edges:83",
        "client:root:pairings(last:100):edges:84",
        "client:root:pairings(last:100):edges:85",
        "client:root:pairings(last:100):edges:86",
        "client:root:pairings(last:100):edges:87",
        "client:root:pairings(last:100):edges:88",
        "client:root:pairings(last:100):edges:89",
        "client:root:pairings(last:100):edges:90",
        "client:root:pairings(last:100):edges:91",
        "client:root:pairings(last:100):edges:92",
        "client:root:pairings(last:100):edges:93",
        "client:root:pairings(last:100):edges:94",
        "client:root:pairings(last:100):edges:95",
        "client:root:pairings(last:100):edges:96",
        "client:root:pairings(last:100):edges:97",
        "client:root:pairings(last:100):edges:98",
        "client:root:pairings(last:100):edges:99",
      ],
    },
  },
  "client:root:pairings(last:100):edges:0": {
    __id: "client:root:pairings(last:100):edges:0",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-compare",
    },
  },
  "client:root:pairings(last:100):edges:1": {
    __id: "client:root:pairings(last:100):edges:1",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-port",
    },
  },
  "client:root:pairings(last:100):edges:2": {
    __id: "client:root:pairings(last:100):edges:2",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b6-section-tokens",
    },
  },
  "client:root:pairings(last:100):edges:3": {
    __id: "client:root:pairings(last:100):edges:3",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b7-configurator",
    },
  },
  "client:root:pairings(last:100):edges:4": {
    __id: "client:root:pairings(last:100):edges:4",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b7-guide-theming",
    },
  },
  "client:root:pairings(last:100):edges:5": {
    __id: "client:root:pairings(last:100):edges:5",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b7-port",
    },
  },
  "client:root:pairings(last:100):edges:6": {
    __id: "client:root:pairings(last:100):edges:6",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-chips",
    },
  },
  "client:root:pairings(last:100):edges:7": {
    __id: "client:root:pairings(last:100):edges:7",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-cmdk",
    },
  },
  "client:root:pairings(last:100):edges:8": {
    __id: "client:root:pairings(last:100):edges:8",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-port",
    },
  },
  "client:root:pairings(last:100):edges:9": {
    __id: "client:root:pairings(last:100):edges:9",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b8-pragma-port",
    },
  },
  "client:root:pairings(last:100):edges:10": {
    __id: "client:root:pairings(last:100):edges:10",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.b9-port",
    },
  },
  "client:root:pairings(last:100):edges:11": {
    __id: "client:root:pairings(last:100):edges:11",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c1-composer-contribute",
    },
  },
  "client:root:pairings(last:100):edges:12": {
    __id: "client:root:pairings(last:100):edges:12",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c1-guide",
    },
  },
  "client:root:pairings(last:100):edges:13": {
    __id: "client:root:pairings(last:100):edges:13",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c1-definitions",
    },
  },
  "client:root:pairings(last:100):edges:14": {
    __id: "client:root:pairings(last:100):edges:14",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c2-class-page",
    },
  },
  "client:root:pairings(last:100):edges:15": {
    __id: "client:root:pairings(last:100):edges:15",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c2-editor",
    },
  },
  "client:root:pairings(last:100):edges:16": {
    __id: "client:root:pairings(last:100):edges:16",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c2-port",
    },
  },
  "client:root:pairings(last:100):edges:17": {
    __id: "client:root:pairings(last:100):edges:17",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c3-composer-contribute",
    },
  },
  "client:root:pairings(last:100):edges:18": {
    __id: "client:root:pairings(last:100):edges:18",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c3-guide-upstream",
    },
  },
  "client:root:pairings(last:100):edges:19": {
    __id: "client:root:pairings(last:100):edges:19",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-chips",
    },
  },
  "client:root:pairings(last:100):edges:20": {
    __id: "client:root:pairings(last:100):edges:20",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-port",
    },
  },
  "client:root:pairings(last:100):edges:21": {
    __id: "client:root:pairings(last:100):edges:21",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-standards-code",
    },
  },
  "client:root:pairings(last:100):edges:22": {
    __id: "client:root:pairings(last:100):edges:22",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c4-terminal",
    },
  },
  "client:root:pairings(last:100):edges:23": {
    __id: "client:root:pairings(last:100):edges:23",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c5-audit-coverage",
    },
  },
  "client:root:pairings(last:100):edges:24": {
    __id: "client:root:pairings(last:100):edges:24",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c5-composer-proposal",
    },
  },
  "client:root:pairings(last:100):edges:25": {
    __id: "client:root:pairings(last:100):edges:25",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c5-proposal-status",
    },
  },
  "client:root:pairings(last:100):edges:26": {
    __id: "client:root:pairings(last:100):edges:26",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c6-composer-contribute",
    },
  },
  "client:root:pairings(last:100):edges:27": {
    __id: "client:root:pairings(last:100):edges:27",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.c6-standards-content",
    },
  },
  "client:root:pairings(last:100):edges:28": {
    __id: "client:root:pairings(last:100):edges:28",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-scaffold",
    },
  },
  "client:root:pairings(last:100):edges:29": {
    __id: "client:root:pairings(last:100):edges:29",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-wire",
    },
  },
  "client:root:pairings(last:100):edges:30": {
    __id: "client:root:pairings(last:100):edges:30",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-health",
    },
  },
  "client:root:pairings(last:100):edges:31": {
    __id: "client:root:pairings(last:100):edges:31",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-setup",
    },
  },
  "client:root:pairings(last:100):edges:32": {
    __id: "client:root:pairings(last:100):edges:32",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.cli-pin",
    },
  },
  "client:root:pairings(last:100):edges:33": {
    __id: "client:root:pairings(last:100):edges:33",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l1-guides",
    },
  },
  "client:root:pairings(last:100):edges:34": {
    __id: "client:root:pairings(last:100):edges:34",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l1-home",
    },
  },
  "client:root:pairings(last:100):edges:35": {
    __id: "client:root:pairings(last:100):edges:35",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l10-class-page",
    },
  },
  "client:root:pairings(last:100):edges:36": {
    __id: "client:root:pairings(last:100):edges:36",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l10-port",
    },
  },
  "client:root:pairings(last:100):edges:37": {
    __id: "client:root:pairings(last:100):edges:37",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l10-schema-graph",
    },
  },
  "client:root:pairings(last:100):edges:38": {
    __id: "client:root:pairings(last:100):edges:38",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-section-graph",
    },
  },
  "client:root:pairings(last:100):edges:39": {
    __id: "client:root:pairings(last:100):edges:39",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-neighborhood",
    },
  },
  "client:root:pairings(last:100):edges:40": {
    __id: "client:root:pairings(last:100):edges:40",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-port",
    },
  },
  "client:root:pairings(last:100):edges:41": {
    __id: "client:root:pairings(last:100):edges:41",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l11-schema-graph",
    },
  },
  "client:root:pairings(last:100):edges:42": {
    __id: "client:root:pairings(last:100):edges:42",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l12-changelog",
    },
  },
  "client:root:pairings(last:100):edges:43": {
    __id: "client:root:pairings(last:100):edges:43",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l12-port",
    },
  },
  "client:root:pairings(last:100):edges:44": {
    __id: "client:root:pairings(last:100):edges:44",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l12-status-badge",
    },
  },
  "client:root:pairings(last:100):edges:45": {
    __id: "client:root:pairings(last:100):edges:45",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l2-chips",
    },
  },
  "client:root:pairings(last:100):edges:46": {
    __id: "client:root:pairings(last:100):edges:46",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l2-guide-foundations",
    },
  },
  "client:root:pairings(last:100):edges:47": {
    __id: "client:root:pairings(last:100):edges:47",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-components",
    },
  },
  "client:root:pairings(last:100):edges:48": {
    __id: "client:root:pairings(last:100):edges:48",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-neighborhood",
    },
  },
  "client:root:pairings(last:100):edges:49": {
    __id: "client:root:pairings(last:100):edges:49",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-port",
    },
  },
  "client:root:pairings(last:100):edges:50": {
    __id: "client:root:pairings(last:100):edges:50",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l3-terminal",
    },
  },
  "client:root:pairings(last:100):edges:51": {
    __id: "client:root:pairings(last:100):edges:51",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-cmdk",
    },
  },
  "client:root:pairings(last:100):edges:52": {
    __id: "client:root:pairings(last:100):edges:52",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-compare",
    },
  },
  "client:root:pairings(last:100):edges:53": {
    __id: "client:root:pairings(last:100):edges:53",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-guide-analog",
    },
  },
  "client:root:pairings(last:100):edges:54": {
    __id: "client:root:pairings(last:100):edges:54",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l4-port",
    },
  },
  "client:root:pairings(last:100):edges:55": {
    __id: "client:root:pairings(last:100):edges:55",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l5-guide-showcase",
    },
  },
  "client:root:pairings(last:100):edges:56": {
    __id: "client:root:pairings(last:100):edges:56",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l5-home",
    },
  },
  "client:root:pairings(last:100):edges:57": {
    __id: "client:root:pairings(last:100):edges:57",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l6-port",
    },
  },
  "client:root:pairings(last:100):edges:58": {
    __id: "client:root:pairings(last:100):edges:58",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l6-section-guidelines",
    },
  },
  "client:root:pairings(last:100):edges:59": {
    __id: "client:root:pairings(last:100):edges:59",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l6-standards",
    },
  },
  "client:root:pairings(last:100):edges:60": {
    __id: "client:root:pairings(last:100):edges:60",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l7-definitions",
    },
  },
  "client:root:pairings(last:100):edges:61": {
    __id: "client:root:pairings(last:100):edges:61",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l7-guide-principles",
    },
  },
  "client:root:pairings(last:100):edges:62": {
    __id: "client:root:pairings(last:100):edges:62",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l8-port",
    },
  },
  "client:root:pairings(last:100):edges:63": {
    __id: "client:root:pairings(last:100):edges:63",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l8-standards-content",
    },
  },
  "client:root:pairings(last:100):edges:64": {
    __id: "client:root:pairings(last:100):edges:64",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-chips",
    },
  },
  "client:root:pairings(last:100):edges:65": {
    __id: "client:root:pairings(last:100):edges:65",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-definitions",
    },
  },
  "client:root:pairings(last:100):edges:66": {
    __id: "client:root:pairings(last:100):edges:66",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-port",
    },
  },
  "client:root:pairings(last:100):edges:67": {
    __id: "client:root:pairings(last:100):edges:67",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.l9-pragma-port",
    },
  },
  "sem://design-system-docs#pairing.l9-pragma-port": {
    __id: "sem://design-system-docs#pairing.l9-pragma-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.l9-pragma-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.l9",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.l9-pragma-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port.pragma",
    },
    id: "sem://design-system-docs#pairing.l9-pragma-port",
  },
  "client:sem://design-system-docs#pairing.l9-pragma-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.l9-pragma-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:68": {
    __id: "client:root:pairings(last:100):edges:68",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q1-cmdk",
    },
  },
  "sem://design-system-docs#pairing.q1-cmdk": {
    __id: "sem://design-system-docs#pairing.q1-cmdk",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q1-cmdk",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q1-cmdk:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.cmdk",
    },
    id: "sem://design-system-docs#pairing.q1-cmdk",
  },
  "client:sem://design-system-docs#pairing.q1-cmdk:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q1-cmdk:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q1-cmdk:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q1-cmdk:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.q1-cmdk:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(last:100):edges:69": {
    __id: "client:root:pairings(last:100):edges:69",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q1-port",
    },
  },
  "sem://design-system-docs#pairing.q1-port": {
    __id: "sem://design-system-docs#pairing.q1-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q1-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q1-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.q1-port",
  },
  "client:sem://design-system-docs#pairing.q1-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q1-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:70": {
    __id: "client:root:pairings(last:100):edges:70",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q1-search-results",
    },
  },
  "sem://design-system-docs#pairing.q1-search-results": {
    __id: "sem://design-system-docs#pairing.q1-search-results",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q1-search-results",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q1",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.q1-search-results:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.search-results",
    },
    id: "sem://design-system-docs#pairing.q1-search-results",
  },
  "client:sem://design-system-docs#pairing.q1-search-results:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q1-search-results:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q1-search-results:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q1-search-results:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.q1-search-results:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.search-results": {
    __id: "sem://design-system-docs#view.search-results",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.search-results",
    composes: {
      __ref: "client:sem://design-system-docs#view.search-results:composes",
    },
    id: "sem://design-system-docs#view.search-results",
  },
  "client:sem://design-system-docs#view.search-results:composes": {
    __id: "client:sem://design-system-docs#view.search-results:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:71": {
    __id: "client:root:pairings(last:100):edges:71",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q2-detail",
    },
  },
  "sem://design-system-docs#pairing.q2-detail": {
    __id: "sem://design-system-docs#pairing.q2-detail",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q2-detail",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q2-detail:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.component-detail",
    },
    id: "sem://design-system-docs#pairing.q2-detail",
  },
  "client:sem://design-system-docs#pairing.q2-detail:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q2-detail:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q2-detail:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q2-detail:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.q2-detail:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.component-detail": {
    __id: "sem://design-system-docs#view.component-detail",
    __typename: "Detail",
    uri: "sem://design-system-docs#view.component-detail",
    composes: {
      __ref: "client:sem://design-system-docs#view.component-detail:composes",
    },
    id: "sem://design-system-docs#view.component-detail",
  },
  "client:sem://design-system-docs#view.component-detail:composes": {
    __id: "client:sem://design-system-docs#view.component-detail:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#view.component-detail:composes:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#view.component-detail:composes:edges:0": {
    __id: "client:sem://design-system-docs#view.component-detail:composes:edges:0",
    __typename: "LayoutEdge",
    node: {
      __ref: "sem://design-system-docs#layout.entity",
    },
  },
  "client:root:pairings(last:100):edges:72": {
    __id: "client:root:pairings(last:100):edges:72",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q2-fit",
    },
  },
  "sem://design-system-docs#pairing.q2-fit": {
    __id: "sem://design-system-docs#pairing.q2-fit",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q2-fit",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q2-fit:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-fit",
    },
    id: "sem://design-system-docs#pairing.q2-fit",
  },
  "client:sem://design-system-docs#pairing.q2-fit:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q2-fit:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q2-fit:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q2-fit:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.q2-fit:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "sem://design-system-docs#view.section-fit": {
    __id: "sem://design-system-docs#view.section-fit",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-fit",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-fit:composes",
    },
    id: "sem://design-system-docs#view.section-fit",
  },
  "client:sem://design-system-docs#view.section-fit:composes": {
    __id: "client:sem://design-system-docs#view.section-fit:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:73": {
    __id: "client:root:pairings(last:100):edges:73",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q2-status-badge",
    },
  },
  "sem://design-system-docs#pairing.q2-status-badge": {
    __id: "sem://design-system-docs#pairing.q2-status-badge",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q2-status-badge",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q2-status-badge:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.status-badge",
    },
    id: "sem://design-system-docs#pairing.q2-status-badge",
  },
  "client:sem://design-system-docs#pairing.q2-status-badge:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q2-status-badge:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q2-status-badge:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q2-status-badge:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.q2-status-badge:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(last:100):edges:74": {
    __id: "client:root:pairings(last:100):edges:74",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q3-changelog",
    },
  },
  "sem://design-system-docs#pairing.q3-changelog": {
    __id: "sem://design-system-docs#pairing.q3-changelog",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q3-changelog",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q3-changelog:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.changelog",
    },
    id: "sem://design-system-docs#pairing.q3-changelog",
  },
  "client:sem://design-system-docs#pairing.q3-changelog:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q3-changelog:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q3-changelog:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q3-changelog:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.q3-changelog:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(last:100):edges:75": {
    __id: "client:root:pairings(last:100):edges:75",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q3-port",
    },
  },
  "sem://design-system-docs#pairing.q3-port": {
    __id: "sem://design-system-docs#pairing.q3-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q3-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q3-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.q3-port",
  },
  "client:sem://design-system-docs#pairing.q3-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q3-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:76": {
    __id: "client:root:pairings(last:100):edges:76",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.q4-feedback",
    },
  },
  "sem://design-system-docs#pairing.q4-feedback": {
    __id: "sem://design-system-docs#pairing.q4-feedback",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.q4-feedback",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.q4",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.q4-feedback:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-feedback",
    },
    id: "sem://design-system-docs#pairing.q4-feedback",
  },
  "client:sem://design-system-docs#pairing.q4-feedback:arrivals": {
    __id: "client:sem://design-system-docs#pairing.q4-feedback:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.q4-feedback:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.q4-feedback:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.q4-feedback:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "sem://design-system-docs#view.composer-feedback": {
    __id: "sem://design-system-docs#view.composer-feedback",
    __typename: "ComposerSurface",
    uri: "sem://design-system-docs#view.composer-feedback",
    composes: {
      __ref: "client:sem://design-system-docs#view.composer-feedback:composes",
    },
    id: "sem://design-system-docs#view.composer-feedback",
  },
  "client:sem://design-system-docs#view.composer-feedback:composes": {
    __id: "client:sem://design-system-docs#view.composer-feedback:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:77": {
    __id: "client:root:pairings(last:100):edges:77",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s1-audit-coverage",
    },
  },
  "sem://design-system-docs#pairing.s1-audit-coverage": {
    __id: "sem://design-system-docs#pairing.s1-audit-coverage",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s1-audit-coverage",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s1",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s1-audit-coverage:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-coverage",
    },
    id: "sem://design-system-docs#pairing.s1-audit-coverage",
  },
  "client:sem://design-system-docs#pairing.s1-audit-coverage:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s1-audit-coverage:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s1-audit-coverage:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s1-audit-coverage:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.s1-audit-coverage:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(last:100):edges:78": {
    __id: "client:root:pairings(last:100):edges:78",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s1-chips",
    },
  },
  "sem://design-system-docs#pairing.s1-chips": {
    __id: "sem://design-system-docs#pairing.s1-chips",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s1-chips",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.s1-chips:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.chips",
    },
    id: "sem://design-system-docs#pairing.s1-chips",
  },
  "client:sem://design-system-docs#pairing.s1-chips:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s1-chips:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s1-chips:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s1-chips:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.s1-chips:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:NoMove",
    },
  },
  "client:root:pairings(last:100):edges:79": {
    __id: "client:root:pairings(last:100):edges:79",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s1-governance",
    },
  },
  "sem://design-system-docs#pairing.s1-governance": {
    __id: "sem://design-system-docs#pairing.s1-governance",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s1-governance",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.s1-governance:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.governance",
    },
    id: "sem://design-system-docs#pairing.s1-governance",
  },
  "client:sem://design-system-docs#pairing.s1-governance:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s1-governance:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s1-governance:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s1-governance:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.s1-governance:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.governance": {
    __id: "sem://design-system-docs#view.governance",
    __typename: "View",
    uri: "sem://design-system-docs#view.governance",
    composes: {
      __ref: "client:sem://design-system-docs#view.governance:composes",
    },
    id: "sem://design-system-docs#view.governance",
  },
  "client:sem://design-system-docs#view.governance:composes": {
    __id: "client:sem://design-system-docs#view.governance:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:80": {
    __id: "client:root:pairings(last:100):edges:80",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s1-port",
    },
  },
  "sem://design-system-docs#pairing.s1-port": {
    __id: "sem://design-system-docs#pairing.s1-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s1-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.s1-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.s1-port",
  },
  "client:sem://design-system-docs#pairing.s1-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s1-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:81": {
    __id: "client:root:pairings(last:100):edges:81",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s2-composer-contribute",
    },
  },
  "sem://design-system-docs#pairing.s2-composer-contribute": {
    __id: "sem://design-system-docs#pairing.s2-composer-contribute",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s2-composer-contribute",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s2",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s2-composer-contribute:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-contribute",
    },
    id: "sem://design-system-docs#pairing.s2-composer-contribute",
  },
  "client:sem://design-system-docs#pairing.s2-composer-contribute:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s2-composer-contribute:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s2-composer-contribute:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s2-composer-contribute:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.s2-composer-contribute:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(last:100):edges:82": {
    __id: "client:root:pairings(last:100):edges:82",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s2-editor",
    },
  },
  "sem://design-system-docs#pairing.s2-editor": {
    __id: "sem://design-system-docs#pairing.s2-editor",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s2-editor",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.s2-editor:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.editor",
    },
    id: "sem://design-system-docs#pairing.s2-editor",
  },
  "client:sem://design-system-docs#pairing.s2-editor:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s2-editor:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s2-editor:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s2-editor:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.s2-editor:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(last:100):edges:83": {
    __id: "client:root:pairings(last:100):edges:83",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s3-audit-coverage",
    },
  },
  "sem://design-system-docs#pairing.s3-audit-coverage": {
    __id: "sem://design-system-docs#pairing.s3-audit-coverage",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s3-audit-coverage",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s3-audit-coverage:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-coverage",
    },
    id: "sem://design-system-docs#pairing.s3-audit-coverage",
  },
  "client:sem://design-system-docs#pairing.s3-audit-coverage:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s3-audit-coverage:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s3-audit-coverage:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s3-audit-coverage:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.s3-audit-coverage:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(last:100):edges:84": {
    __id: "client:root:pairings(last:100):edges:84",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s3-composer-proposal",
    },
  },
  "sem://design-system-docs#pairing.s3-composer-proposal": {
    __id: "sem://design-system-docs#pairing.s3-composer-proposal",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s3-composer-proposal",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s3-composer-proposal:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-proposal",
    },
    id: "sem://design-system-docs#pairing.s3-composer-proposal",
  },
  "client:sem://design-system-docs#pairing.s3-composer-proposal:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s3-composer-proposal:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s3-composer-proposal:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s3-composer-proposal:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.s3-composer-proposal:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(last:100):edges:85": {
    __id: "client:root:pairings(last:100):edges:85",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s3-governance",
    },
  },
  "sem://design-system-docs#pairing.s3-governance": {
    __id: "sem://design-system-docs#pairing.s3-governance",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s3-governance",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.s3-governance:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.governance",
    },
    id: "sem://design-system-docs#pairing.s3-governance",
  },
  "client:sem://design-system-docs#pairing.s3-governance:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s3-governance:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s3-governance:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s3-governance:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.s3-governance:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(last:100):edges:86": {
    __id: "client:root:pairings(last:100):edges:86",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s4-proposal-status",
    },
  },
  "sem://design-system-docs#pairing.s4-proposal-status": {
    __id: "sem://design-system-docs#pairing.s4-proposal-status",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s4-proposal-status",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s4",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s4-proposal-status:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.proposal-status",
    },
    id: "sem://design-system-docs#pairing.s4-proposal-status",
  },
  "client:sem://design-system-docs#pairing.s4-proposal-status:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s4-proposal-status:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s4-proposal-status:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s4-proposal-status:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.s4-proposal-status:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "client:root:pairings(last:100):edges:87": {
    __id: "client:root:pairings(last:100):edges:87",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s4-review-queues",
    },
  },
  "sem://design-system-docs#pairing.s4-review-queues": {
    __id: "sem://design-system-docs#pairing.s4-review-queues",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s4-review-queues",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s4",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s4-review-queues:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.review-queues",
    },
    id: "sem://design-system-docs#pairing.s4-review-queues",
  },
  "client:sem://design-system-docs#pairing.s4-review-queues:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s4-review-queues:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s4-review-queues:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s4-review-queues:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.s4-review-queues:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "sem://design-system-docs#view.review-queues": {
    __id: "sem://design-system-docs#view.review-queues",
    __typename: "Lens",
    uri: "sem://design-system-docs#view.review-queues",
    composes: {
      __ref: "client:sem://design-system-docs#view.review-queues:composes",
    },
    id: "sem://design-system-docs#view.review-queues",
  },
  "client:sem://design-system-docs#view.review-queues:composes": {
    __id: "client:sem://design-system-docs#view.review-queues:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:88": {
    __id: "client:root:pairings(last:100):edges:88",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s5-editor",
    },
  },
  "sem://design-system-docs#pairing.s5-editor": {
    __id: "sem://design-system-docs#pairing.s5-editor",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s5-editor",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s5",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.s5-editor:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.editor",
    },
    id: "sem://design-system-docs#pairing.s5-editor",
  },
  "client:sem://design-system-docs#pairing.s5-editor:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s5-editor:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s5-editor:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s5-editor:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.s5-editor:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(last:100):edges:89": {
    __id: "client:root:pairings(last:100):edges:89",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.s5-standards-content",
    },
  },
  "sem://design-system-docs#pairing.s5-standards-content": {
    __id: "sem://design-system-docs#pairing.s5-standards-content",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.s5-standards-content",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.s5",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.s5-standards-content:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.standards-content",
    },
    id: "sem://design-system-docs#pairing.s5-standards-content",
  },
  "client:sem://design-system-docs#pairing.s5-standards-content:arrivals": {
    __id: "client:sem://design-system-docs#pairing.s5-standards-content:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.s5-standards-content:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.s5-standards-content:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.s5-standards-content:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "client:root:pairings(last:100):edges:90": {
    __id: "client:root:pairings(last:100):edges:90",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v1-compare",
    },
  },
  "sem://design-system-docs#pairing.v1-compare": {
    __id: "sem://design-system-docs#pairing.v1-compare",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v1-compare",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.v1-compare:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.compare",
    },
    id: "sem://design-system-docs#pairing.v1-compare",
  },
  "client:sem://design-system-docs#pairing.v1-compare:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v1-compare:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v1-compare:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v1-compare:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.v1-compare:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "client:root:pairings(last:100):edges:91": {
    __id: "client:root:pairings(last:100):edges:91",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v1-focus",
    },
  },
  "sem://design-system-docs#pairing.v1-focus": {
    __id: "sem://design-system-docs#pairing.v1-focus",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v1-focus",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.v1-focus:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.focus",
    },
    id: "sem://design-system-docs#pairing.v1-focus",
  },
  "client:sem://design-system-docs#pairing.v1-focus:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v1-focus:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v1-focus:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v1-focus:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.v1-focus:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:SubjectKept",
    },
  },
  "client:root:pairings(last:100):edges:92": {
    __id: "client:root:pairings(last:100):edges:92",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v1-port",
    },
  },
  "sem://design-system-docs#pairing.v1-port": {
    __id: "sem://design-system-docs#pairing.v1-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v1-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v1",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.v1-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.v1-port",
  },
  "client:sem://design-system-docs#pairing.v1-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v1-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:93": {
    __id: "client:root:pairings(last:100):edges:93",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v1-section-structure",
    },
  },
  "sem://design-system-docs#pairing.v1-section-structure": {
    __id: "sem://design-system-docs#pairing.v1-section-structure",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v1-section-structure",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v1",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.v1-section-structure:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-structure",
    },
    id: "sem://design-system-docs#pairing.v1-section-structure",
  },
  "client:sem://design-system-docs#pairing.v1-section-structure:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v1-section-structure:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v1-section-structure:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v1-section-structure:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.v1-section-structure:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "sem://design-system-docs#view.section-structure": {
    __id: "sem://design-system-docs#view.section-structure",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-structure",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-structure:composes",
    },
    id: "sem://design-system-docs#view.section-structure",
  },
  "client:sem://design-system-docs#view.section-structure:composes": {
    __id: "client:sem://design-system-docs#view.section-structure:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:94": {
    __id: "client:root:pairings(last:100):edges:94",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v2-port",
    },
  },
  "sem://design-system-docs#pairing.v2-port": {
    __id: "sem://design-system-docs#pairing.v2-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v2-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v2",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.v2-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.v2-port",
  },
  "client:sem://design-system-docs#pairing.v2-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v2-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:95": {
    __id: "client:root:pairings(last:100):edges:95",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v2-section-states",
    },
  },
  "sem://design-system-docs#pairing.v2-section-states": {
    __id: "sem://design-system-docs#pairing.v2-section-states",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v2-section-states",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v2",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.v2-section-states:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.section-states",
    },
    id: "sem://design-system-docs#pairing.v2-section-states",
  },
  "client:sem://design-system-docs#pairing.v2-section-states:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v2-section-states:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v2-section-states:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v2-section-states:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.v2-section-states:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.section-states": {
    __id: "sem://design-system-docs#view.section-states",
    __typename: "View",
    uri: "sem://design-system-docs#view.section-states",
    composes: {
      __ref: "client:sem://design-system-docs#view.section-states:composes",
    },
    id: "sem://design-system-docs#view.section-states",
  },
  "client:sem://design-system-docs#view.section-states:composes": {
    __id: "client:sem://design-system-docs#view.section-states:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:96": {
    __id: "client:root:pairings(last:100):edges:96",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v3-audit-conformance",
    },
  },
  "sem://design-system-docs#pairing.v3-audit-conformance": {
    __id: "sem://design-system-docs#pairing.v3-audit-conformance",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v3-audit-conformance",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v3",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.v3-audit-conformance:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.audit-conformance",
    },
    id: "sem://design-system-docs#pairing.v3-audit-conformance",
  },
  "client:sem://design-system-docs#pairing.v3-audit-conformance:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v3-audit-conformance:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v3-audit-conformance:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v3-audit-conformance:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.v3-audit-conformance:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:ColdEntry",
      },
    },
  "sem://design-system-docs#view.audit-conformance": {
    __id: "sem://design-system-docs#view.audit-conformance",
    __typename: "View",
    uri: "sem://design-system-docs#view.audit-conformance",
    composes: {
      __ref: "client:sem://design-system-docs#view.audit-conformance:composes",
    },
    id: "sem://design-system-docs#view.audit-conformance",
  },
  "client:sem://design-system-docs#view.audit-conformance:composes": {
    __id: "client:sem://design-system-docs#view.audit-conformance:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:97": {
    __id: "client:root:pairings(last:100):edges:97",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v3-guides",
    },
  },
  "sem://design-system-docs#pairing.v3-guides": {
    __id: "sem://design-system-docs#pairing.v3-guides",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v3-guides",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.v3-guides:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.guides",
    },
    id: "sem://design-system-docs#pairing.v3-guides",
  },
  "client:sem://design-system-docs#pairing.v3-guides:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v3-guides:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v3-guides:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v3-guides:arrivals:edges:0": {
    __id: "client:sem://design-system-docs#pairing.v3-guides:arrivals:edges:0",
    __typename: "PreservationEdge",
    node: {
      __ref: "surface:ColdEntry",
    },
  },
  "client:root:pairings(last:100):edges:98": {
    __id: "client:root:pairings(last:100):edges:98",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v3-port",
    },
  },
  "sem://design-system-docs#pairing.v3-port": {
    __id: "sem://design-system-docs#pairing.v3-port",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v3-port",
    pairingRole: {
      __ref: "surface:Secondary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v3",
    },
    arrivals: {
      __ref: "client:sem://design-system-docs#pairing.v3-port:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#port",
    },
    id: "sem://design-system-docs#pairing.v3-port",
  },
  "client:sem://design-system-docs#pairing.v3-port:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v3-port:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:pairings(last:100):edges:99": {
    __id: "client:root:pairings(last:100):edges:99",
    __typename: "PairingEdge",
    node: {
      __ref: "sem://design-system-docs#pairing.v4-composer-issue",
    },
  },
  "sem://design-system-docs#pairing.v4-composer-issue": {
    __id: "sem://design-system-docs#pairing.v4-composer-issue",
    __typename: "Pairing",
    uri: "sem://design-system-docs#pairing.v4-composer-issue",
    pairingRole: {
      __ref: "surface:Primary",
    },
    forJob: {
      __ref: "sem://design-system-docs#job.v4",
    },
    arrivals: {
      __ref:
        "client:sem://design-system-docs#pairing.v4-composer-issue:arrivals",
    },
    pairsSurface: {
      __ref: "sem://design-system-docs#view.composer-issue",
    },
    id: "sem://design-system-docs#pairing.v4-composer-issue",
  },
  "client:sem://design-system-docs#pairing.v4-composer-issue:arrivals": {
    __id: "client:sem://design-system-docs#pairing.v4-composer-issue:arrivals",
    __typename: "PreservationConnection",
    edges: {
      __refs: [
        "client:sem://design-system-docs#pairing.v4-composer-issue:arrivals:edges:0",
      ],
    },
  },
  "client:sem://design-system-docs#pairing.v4-composer-issue:arrivals:edges:0":
    {
      __id: "client:sem://design-system-docs#pairing.v4-composer-issue:arrivals:edges:0",
      __typename: "PreservationEdge",
      node: {
        __ref: "surface:SubjectKept",
      },
    },
  "sem://design-system-docs#view.composer-issue": {
    __id: "sem://design-system-docs#view.composer-issue",
    __typename: "ComposerSurface",
    uri: "sem://design-system-docs#view.composer-issue",
    composes: {
      __ref: "client:sem://design-system-docs#view.composer-issue:composes",
    },
    id: "sem://design-system-docs#view.composer-issue",
  },
  "client:sem://design-system-docs#view.composer-issue:composes": {
    __id: "client:sem://design-system-docs#view.composer-issue:composes",
    __typename: "LayoutConnection",
    edges: {
      __refs: [],
    },
  },
  "client:root:personas": {
    __id: "client:root:personas",
    __typename: "PersonaConnection",
    edges: {
      __refs: [
        "client:root:personas:edges:0",
        "client:root:personas:edges:1",
        "client:root:personas:edges:2",
        "client:root:personas:edges:3",
        "client:root:personas:edges:4",
        "client:root:personas:edges:5",
      ],
    },
  },
  "client:root:personas:edges:0": {
    __id: "client:root:personas:edges:0",
    __typename: "PersonaEdge",
    node: {
      __ref: "sem://design-system-docs#persona.agent",
    },
  },
  "sem://design-system-docs#persona.agent": {
    __id: "sem://design-system-docs#persona.agent",
    __typename: "Persona",
    uri: "sem://design-system-docs#persona.agent",
    id: "sem://design-system-docs#persona.agent",
  },
  "client:root:personas:edges:1": {
    __id: "client:root:personas:edges:1",
    __typename: "PersonaEdge",
    node: {
      __ref: "sem://design-system-docs#persona.architect",
    },
  },
  "sem://design-system-docs#persona.architect": {
    __id: "sem://design-system-docs#persona.architect",
    __typename: "Persona",
    uri: "sem://design-system-docs#persona.architect",
    id: "sem://design-system-docs#persona.architect",
  },
  "client:root:personas:edges:2": {
    __id: "client:root:personas:edges:2",
    __typename: "PersonaEdge",
    node: {
      __ref: "sem://design-system-docs#persona.designer",
    },
  },
  "sem://design-system-docs#persona.designer": {
    __id: "sem://design-system-docs#persona.designer",
    __typename: "Persona",
    uri: "sem://design-system-docs#persona.designer",
    id: "sem://design-system-docs#persona.designer",
  },
  "client:root:personas:edges:3": {
    __id: "client:root:personas:edges:3",
    __typename: "PersonaEdge",
    node: {
      __ref: "sem://design-system-docs#persona.engineer",
    },
  },
  "sem://design-system-docs#persona.engineer": {
    __id: "sem://design-system-docs#persona.engineer",
    __typename: "Persona",
    uri: "sem://design-system-docs#persona.engineer",
    id: "sem://design-system-docs#persona.engineer",
  },
  "client:root:personas:edges:4": {
    __id: "client:root:personas:edges:4",
    __typename: "PersonaEdge",
    node: {
      __ref: "sem://design-system-docs#persona.steward",
    },
  },
  "sem://design-system-docs#persona.steward": {
    __id: "sem://design-system-docs#persona.steward",
    __typename: "Persona",
    uri: "sem://design-system-docs#persona.steward",
    id: "sem://design-system-docs#persona.steward",
  },
  "client:root:personas:edges:5": {
    __id: "client:root:personas:edges:5",
    __typename: "PersonaEdge",
    node: {
      __ref: "sem://design-system-docs#persona.writer",
    },
  },
  "sem://design-system-docs#persona.writer": {
    __id: "sem://design-system-docs#persona.writer",
    __typename: "Persona",
    uri: "sem://design-system-docs#persona.writer",
    id: "sem://design-system-docs#persona.writer",
  },
} as unknown as RecordMap;

export default journeysExplorerRecordsJob;
