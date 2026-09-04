/**
 * A serialised Relay store snapshot for `StandardsIndexQuery` at
 * { classUri: "cs:CodeStandard", count: 100, cursor: null }.
 *
 * HAND-WRITTEN, NOT CAPTURED, and this file says so rather than implying a
 * dev-server origin it does not have. The lens stopped asking for
 * `Query.codeStandards` and started asking for
 * `ontologyClass(uri:).instances`, and no capture of the new shape is
 * possible in this environment: the `code-standards` reference package is
 * absent, so the graph cannot be booted with the `cs:` vocabulary at all.
 *
 * WHAT IS TRUSTWORTHY ABOUT IT ANYWAY. The store SHAPE is not hand-guessed
 * — the payload below was authored as a GraphQL response and then
 * normalised by Relay itself, through the app's own `createEnvironment`
 * (hence the real `getDataID`, hence records keyed by absolute IRI) and
 * `commitPayload` over the real compiled artifact. Every storage key here
 * — `ontologyClass(uri:"cs:CodeStandard")`, `instances(first:100)`, the
 * `__StandardsIndex_instances_connection` handle, the positional edge ids,
 * the `client:<iri>:_meta` records — is Relay's own, so a store the live
 * graph writes for these variables differs from this file only in its
 * VALUES.
 *
 * WHAT IS NOT VERIFIED, and must be on first live boot: that
 * `_meta.title` falls back to the IRI's local name for a standard with no
 * `cs:name` (the compiler's documented chain says it does), that
 * `_meta.definition` reaches `cs:description` through the local-name
 * tier, and that `cs:CodeStandard` really has no subclasses — which is
 * what makes this fixture a SINGLE group, and therefore what makes the
 * index's jump-link nav absent here.
 *
 * The eight standards are the same eight the previous capture was trimmed
 * to, so what this file proves about the view did not shrink when the
 * operation changed. Cursors are `base64(absolute IRI)`, the convention
 * both known providers derive theirs from.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const standardsIndexRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
  },
  "http://pragma.canonical.com/codestandards#CodeStandard": {
    __id: "http://pragma.canonical.com/codestandards#CodeStandard",
    __typename: "OntologyClass",
    uri: "http://pragma.canonical.com/codestandards#CodeStandard",
    "instances(first:100)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:_meta",
    },
    __StandardsIndex_instances_connection: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection",
    },
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100)",
      __typename: "NodeConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:0",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:1",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:2",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:3",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:4",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:5",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:6",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:7",
        ],
      },
      pageInfo: {
        __ref:
          "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:0",
      __typename: "NodeEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code.api.stability",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
    },
  "http://pragma.canonical.com/codestandards#code.api.stability": {
    __id: "http://pragma.canonical.com/codestandards#code.api.stability",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.api.stability",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta": {
    __id: "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta",
    __typename: "EntityMeta",
    curie: "cs:code.api.stability",
    title: "code.api.stability",
    type: {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:_meta": {
    __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:_meta",
    __typename: "EntityMeta",
    title: "CodeStandard",
  },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:1":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:1",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#code.array.safe_access",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcnJheS5zYWZlX2FjY2Vzcw==",
    },
  "http://pragma.canonical.com/codestandards#code.array.safe_access": {
    __id: "http://pragma.canonical.com/codestandards#code.array.safe_access",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.array.safe_access",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.array.safe_access:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#code.array.safe_access:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.array.safe_access:_meta",
      __typename: "EntityMeta",
      curie: "cs:code.array.safe_access",
      title: "code.array.safe_access",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:2":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:2",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#code.assertion.non_null",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hc3NlcnRpb24ubm9uX251bGw=",
    },
  "http://pragma.canonical.com/codestandards#code.assertion.non_null": {
    __id: "http://pragma.canonical.com/codestandards#code.assertion.non_null",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.assertion.non_null",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:_meta",
      __typename: "EntityMeta",
      curie: "cs:code.assertion.non_null",
      title: "code.assertion.non_null",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:3":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:3",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#css.selectors.specificity",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY3NzLnNlbGVjdG9ycy5zcGVjaWZpY2l0eQ==",
    },
  "http://pragma.canonical.com/codestandards#css.selectors.specificity": {
    __id: "http://pragma.canonical.com/codestandards#css.selectors.specificity",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#css.selectors.specificity",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:_meta",
      __typename: "EntityMeta",
      curie: "cs:css.selectors.specificity",
      title: "css.selectors.specificity",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:4":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:4",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#react.component.link_component",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LmxpbmtfY29tcG9uZW50",
    },
  "http://pragma.canonical.com/codestandards#react.component.link_component": {
    __id: "http://pragma.canonical.com/codestandards#react.component.link_component",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#react.component.link_component",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta",
      __typename: "EntityMeta",
      curie: "cs:react.component.link_component",
      title: "react.component.link_component",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:5":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:5",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#react.component.props",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LnByb3Bz",
    },
  "http://pragma.canonical.com/codestandards#react.component.props": {
    __id: "http://pragma.canonical.com/codestandards#react.component.props",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#react.component.props",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.props:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#react.component.props:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.props:_meta",
      __typename: "EntityMeta",
      curie: "cs:react.component.props",
      title: "react.component.props",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:6":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:6",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#storybook.story.documentation",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3Rvcnlib29rLnN0b3J5LmRvY3VtZW50YXRpb24=",
    },
  "http://pragma.canonical.com/codestandards#storybook.story.documentation": {
    __id: "http://pragma.canonical.com/codestandards#storybook.story.documentation",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#storybook.story.documentation",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:_meta",
      __typename: "EntityMeta",
      curie: "cs:storybook.story.documentation",
      title: "storybook.story.documentation",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:7":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):edges:7",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#styling.tokens.creation",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
    },
  "http://pragma.canonical.com/codestandards#styling.tokens.creation": {
    __id: "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta",
    },
  },
  "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta",
      __typename: "EntityMeta",
      curie: "cs:styling.tokens.creation",
      title: "styling.tokens.creation",
      type: {
        __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:instances(first:100):pageInfo",
      __typename: "PageInfo",
      endCursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
      hasNextPage: true,
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection",
      __typename: "NodeConnection",
      __connection_next_edge_index: 8,
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:0",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:1",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:2",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:3",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:4",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:5",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:6",
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:7",
        ],
      },
      pageInfo: {
        __ref:
          "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo",
      },
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:0",
      __typename: "NodeEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code.api.stability",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:1":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:1",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#code.array.safe_access",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcnJheS5zYWZlX2FjY2Vzcw==",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:2":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:2",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#code.assertion.non_null",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hc3NlcnRpb24ubm9uX251bGw=",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:3":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:3",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#css.selectors.specificity",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY3NzLnNlbGVjdG9ycy5zcGVjaWZpY2l0eQ==",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:4":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:4",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#react.component.link_component",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LmxpbmtfY29tcG9uZW50",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:5":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:5",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#react.component.props",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LnByb3Bz",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:6":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:6",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#storybook.story.documentation",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3Rvcnlib29rLnN0b3J5LmRvY3VtZW50YXRpb24=",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:7":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:edges:7",
      __typename: "NodeEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#styling.tokens.creation",
      },
      cursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
    },
  "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo":
    {
      __id: "client:http://pragma.canonical.com/codestandards#CodeStandard:__StandardsIndex_instances_connection:pageInfo",
      __typename: "PageInfo",
      hasNextPage: true,
      hasPreviousPage: false,
      endCursor:
        "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
      startCursor: null,
    },
} as unknown as RecordMap;

export default standardsIndexRecords;
