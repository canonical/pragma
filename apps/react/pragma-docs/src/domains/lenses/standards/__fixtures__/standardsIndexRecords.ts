/**
 * A serialised Relay store snapshot for `StandardsIndexQuery` at
 * { count: 100, cursor: null } — captured from a dev server's
 * `__INITIAL_DATA__.relay.records` at /standards, then HAND-TRIMMED from
 * the live 100-edge page down to eight standards across five categories
 * (code: api.stability, array.safe_access, assertion.non_null ·
 * css: selectors.specificity · react: component.link_component,
 * component.props · storybook: story.documentation ·
 * styling: tokens.creation) so the unit fixture stays reviewable.
 *
 * Trimming discipline — STORAGE KEYS KEPT EXACT (the catalogRecords
 * precedent):
 * - every record id, field key, and cursor is byte-identical to the
 *   capture (`codeStandards(first:100)`, the
 *   `__StandardsIndex_codeStandards_connection` handle, positional edge
 *   ids — the kept edges retain their ORIGINAL indices, e.g. `edges:93`,
 *   because ids are never renumbered);
 * - both connection records (raw field + @connection handle) had their
 *   `edges.__refs` filtered to the same eight edges; dropped edge/node/
 *   category records were removed wholesale; nothing else was edited;
 * - `pageInfo` is verbatim (hasNextPage: true — the live graph carries
 *   more than one page, which is what makes "Load more" render).
 *
 * Regenerate: boot `dev:bun`, copy `relay.records` out of the
 * `__INITIAL_DATA__` script served at /standards, filter both edge lists
 * to the eight URIs above, keep the records they reference.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const standardsIndexRecords = {
  "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta": {
    __id: "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta",
    __typename: "EntityMeta",
    curie: "cs:code.api.stability",
  },
  "client:http://pragma.canonical.com/codestandards#code.api.stability:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.api.stability:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#code.api.stability:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#code.api.stability:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.api.stability:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code",
      },
    },
  "client:http://pragma.canonical.com/codestandards#code.array.safe_access:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.array.safe_access:_meta",
      __typename: "EntityMeta",
      curie: "cs:code.array.safe_access",
    },
  "client:http://pragma.canonical.com/codestandards#code.array.safe_access:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.array.safe_access:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#code.array.safe_access:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#code.array.safe_access:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.array.safe_access:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code",
      },
    },
  "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:_meta",
      __typename: "EntityMeta",
      curie: "cs:code.assertion.non_null",
    },
  "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#code",
      },
    },
  "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:_meta",
      __typename: "EntityMeta",
      curie: "cs:css.selectors.specificity",
    },
  "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#css",
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta",
      __typename: "EntityMeta",
      curie: "cs:react.component.link_component",
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#react",
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.props:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.props:_meta",
      __typename: "EntityMeta",
      curie: "cs:react.component.props",
    },
  "client:http://pragma.canonical.com/codestandards#react.component.props:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.props:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#react.component.props:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.props:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.props:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#react",
      },
    },
  "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:_meta",
      __typename: "EntityMeta",
      curie: "cs:storybook.story.documentation",
    },
  "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#storybook",
      },
    },
  "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta",
      __typename: "EntityMeta",
      curie: "cs:styling.tokens.creation",
    },
  "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:categories(first:1)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:categories(first:1)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:categories(first:1):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:categories(first:1):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:categories(first:1):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#styling",
      },
    },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    "codeStandards(first:100)": {
      __ref: "client:root:codeStandards(first:100)",
    },
    __StandardsIndex_codeStandards_connection: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection",
    },
  },
  "client:root:__StandardsIndex_codeStandards_connection": {
    __id: "client:root:__StandardsIndex_codeStandards_connection",
    __typename: "CodeStandardConnection",
    __connection_next_edge_index: 100,
    edges: {
      __refs: [
        "client:root:__StandardsIndex_codeStandards_connection:edges:0",
        "client:root:__StandardsIndex_codeStandards_connection:edges:1",
        "client:root:__StandardsIndex_codeStandards_connection:edges:2",
        "client:root:__StandardsIndex_codeStandards_connection:edges:23",
        "client:root:__StandardsIndex_codeStandards_connection:edges:64",
        "client:root:__StandardsIndex_codeStandards_connection:edges:66",
        "client:root:__StandardsIndex_codeStandards_connection:edges:89",
        "client:root:__StandardsIndex_codeStandards_connection:edges:99",
      ],
    },
    pageInfo: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    },
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:0": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:0",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "http://pragma.canonical.com/codestandards#code.api.stability",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:1": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:1",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "http://pragma.canonical.com/codestandards#code.array.safe_access",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcnJheS5zYWZlX2FjY2Vzcw==",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:2": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:2",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#code.assertion.non_null",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hc3NlcnRpb24ubm9uX251bGw=",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:23": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:23",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#css.selectors.specificity",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY3NzLnNlbGVjdG9ycy5zcGVjaWZpY2l0eQ==",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:64": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:64",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#react.component.link_component",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LmxpbmtfY29tcG9uZW50",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:66": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:66",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "http://pragma.canonical.com/codestandards#react.component.props",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LnByb3Bz",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:89": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:89",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#storybook.story.documentation",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3Rvcnlib29rLnN0b3J5LmRvY3VtZW50YXRpb24=",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:99": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:99",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
  },
  "client:root:__StandardsIndex_codeStandards_connection:pageInfo": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    __typename: "PageInfo",
    hasNextPage: true,
    hasPreviousPage: false,
    endCursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
    startCursor: null,
  },
  "client:root:codeStandards(first:100)": {
    __id: "client:root:codeStandards(first:100)",
    __typename: "CodeStandardConnection",
    edges: {
      __refs: [
        "client:root:codeStandards(first:100):edges:0",
        "client:root:codeStandards(first:100):edges:1",
        "client:root:codeStandards(first:100):edges:2",
        "client:root:codeStandards(first:100):edges:23",
        "client:root:codeStandards(first:100):edges:64",
        "client:root:codeStandards(first:100):edges:66",
        "client:root:codeStandards(first:100):edges:89",
        "client:root:codeStandards(first:100):edges:99",
      ],
    },
    pageInfo: {
      __ref: "client:root:codeStandards(first:100):pageInfo",
    },
  },
  "client:root:codeStandards(first:100):edges:0": {
    __id: "client:root:codeStandards(first:100):edges:0",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "http://pragma.canonical.com/codestandards#code.api.stability",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcGkuc3RhYmlsaXR5",
  },
  "client:root:codeStandards(first:100):edges:1": {
    __id: "client:root:codeStandards(first:100):edges:1",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "http://pragma.canonical.com/codestandards#code.array.safe_access",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hcnJheS5zYWZlX2FjY2Vzcw==",
  },
  "client:root:codeStandards(first:100):edges:2": {
    __id: "client:root:codeStandards(first:100):edges:2",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#code.assertion.non_null",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY29kZS5hc3NlcnRpb24ubm9uX251bGw=",
  },
  "client:root:codeStandards(first:100):edges:23": {
    __id: "client:root:codeStandards(first:100):edges:23",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#css.selectors.specificity",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjY3NzLnNlbGVjdG9ycy5zcGVjaWZpY2l0eQ==",
  },
  "client:root:codeStandards(first:100):edges:64": {
    __id: "client:root:codeStandards(first:100):edges:64",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#react.component.link_component",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LmxpbmtfY29tcG9uZW50",
  },
  "client:root:codeStandards(first:100):edges:66": {
    __id: "client:root:codeStandards(first:100):edges:66",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "http://pragma.canonical.com/codestandards#react.component.props",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjcmVhY3QuY29tcG9uZW50LnByb3Bz",
  },
  "client:root:codeStandards(first:100):edges:89": {
    __id: "client:root:codeStandards(first:100):edges:89",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#storybook.story.documentation",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3Rvcnlib29rLnN0b3J5LmRvY3VtZW50YXRpb24=",
  },
  "client:root:codeStandards(first:100):edges:99": {
    __id: "client:root:codeStandards(first:100):edges:99",
    __typename: "CodeStandardEdge",
    node: {
      __ref:
        "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    },
    cursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
  },
  "client:root:codeStandards(first:100):pageInfo": {
    __id: "client:root:codeStandards(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor:
      "aHR0cDovL3ByYWdtYS5jYW5vbmljYWwuY29tL2NvZGVzdGFuZGFyZHMjc3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
    hasNextPage: true,
  },
  "http://pragma.canonical.com/codestandards#code": {
    __id: "http://pragma.canonical.com/codestandards#code",
    __typename: "Category",
    uri: "http://pragma.canonical.com/codestandards#code",
    slug: "code",
  },
  "http://pragma.canonical.com/codestandards#code.api.stability": {
    __id: "http://pragma.canonical.com/codestandards#code.api.stability",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.api.stability",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.api.stability:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.api.stability:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#code.array.safe_access": {
    __id: "http://pragma.canonical.com/codestandards#code.array.safe_access",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.array.safe_access",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.array.safe_access:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.array.safe_access:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#code.assertion.non_null": {
    __id: "http://pragma.canonical.com/codestandards#code.assertion.non_null",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#code.assertion.non_null",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#code.assertion.non_null:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#css": {
    __id: "http://pragma.canonical.com/codestandards#css",
    __typename: "Category",
    uri: "http://pragma.canonical.com/codestandards#css",
    slug: "css",
  },
  "http://pragma.canonical.com/codestandards#css.selectors.specificity": {
    __id: "http://pragma.canonical.com/codestandards#css.selectors.specificity",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#css.selectors.specificity",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#css.selectors.specificity:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#react": {
    __id: "http://pragma.canonical.com/codestandards#react",
    __typename: "Category",
    uri: "http://pragma.canonical.com/codestandards#react",
    slug: "react",
  },
  "http://pragma.canonical.com/codestandards#react.component.link_component": {
    __id: "http://pragma.canonical.com/codestandards#react.component.link_component",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#react.component.link_component",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#react.component.props": {
    __id: "http://pragma.canonical.com/codestandards#react.component.props",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#react.component.props",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.props:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.props:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#storybook": {
    __id: "http://pragma.canonical.com/codestandards#storybook",
    __typename: "Category",
    uri: "http://pragma.canonical.com/codestandards#storybook",
    slug: "storybook",
  },
  "http://pragma.canonical.com/codestandards#storybook.story.documentation": {
    __id: "http://pragma.canonical.com/codestandards#storybook.story.documentation",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#storybook.story.documentation",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#storybook.story.documentation:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#styling": {
    __id: "http://pragma.canonical.com/codestandards#styling",
    __typename: "Category",
    uri: "http://pragma.canonical.com/codestandards#styling",
    slug: "styling",
  },
  "http://pragma.canonical.com/codestandards#styling.tokens.creation": {
    __id: "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#styling.tokens.creation",
    name: null,
    "categories(first:1)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:categories(first:1)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#styling.tokens.creation:_meta",
    },
  },
} as unknown as RecordMap;

export default standardsIndexRecords;
