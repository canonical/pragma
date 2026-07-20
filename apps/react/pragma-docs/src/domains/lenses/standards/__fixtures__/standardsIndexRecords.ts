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
  "client:root:codeStandards(first:100):edges:0": {
    __id: "client:root:codeStandards(first:100):edges:0",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:code.api.stability",
    },
    cursor: "Y3M6Y29kZS5hcGkuc3RhYmlsaXR5",
  },
  "client:root:codeStandards(first:100):edges:1": {
    __id: "client:root:codeStandards(first:100):edges:1",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:code.array.safe_access",
    },
    cursor: "Y3M6Y29kZS5hcnJheS5zYWZlX2FjY2Vzcw==",
  },
  "client:root:codeStandards(first:100):edges:2": {
    __id: "client:root:codeStandards(first:100):edges:2",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:code.assertion.non_null",
    },
    cursor: "Y3M6Y29kZS5hc3NlcnRpb24ubm9uX251bGw=",
  },
  "client:root:codeStandards(first:100):edges:17": {
    __id: "client:root:codeStandards(first:100):edges:17",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:css.selectors.specificity",
    },
    cursor: "Y3M6Y3NzLnNlbGVjdG9ycy5zcGVjaWZpY2l0eQ==",
  },
  "client:root:codeStandards(first:100):edges:58": {
    __id: "client:root:codeStandards(first:100):edges:58",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:react.component.link_component",
    },
    cursor: "Y3M6cmVhY3QuY29tcG9uZW50LmxpbmtfY29tcG9uZW50",
  },
  "client:root:codeStandards(first:100):edges:60": {
    __id: "client:root:codeStandards(first:100):edges:60",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:react.component.props",
    },
    cursor: "Y3M6cmVhY3QuY29tcG9uZW50LnByb3Bz",
  },
  "client:root:codeStandards(first:100):edges:83": {
    __id: "client:root:codeStandards(first:100):edges:83",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:storybook.story.documentation",
    },
    cursor: "Y3M6c3Rvcnlib29rLnN0b3J5LmRvY3VtZW50YXRpb24=",
  },
  "client:root:codeStandards(first:100):edges:93": {
    __id: "client:root:codeStandards(first:100):edges:93",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:styling.tokens.creation",
    },
    cursor: "Y3M6c3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
  },
  "client:root:codeStandards(first:100)": {
    __id: "client:root:codeStandards(first:100)",
    __typename: "CodeStandardConnection",
    edges: {
      __refs: [
        "client:root:codeStandards(first:100):edges:0",
        "client:root:codeStandards(first:100):edges:1",
        "client:root:codeStandards(first:100):edges:2",
        "client:root:codeStandards(first:100):edges:17",
        "client:root:codeStandards(first:100):edges:58",
        "client:root:codeStandards(first:100):edges:60",
        "client:root:codeStandards(first:100):edges:83",
        "client:root:codeStandards(first:100):edges:93",
      ],
    },
    pageInfo: {
      __ref: "client:root:codeStandards(first:100):pageInfo",
    },
  },
  "client:root:codeStandards(first:100):pageInfo": {
    __id: "client:root:codeStandards(first:100):pageInfo",
    __typename: "PageInfo",
    endCursor: "Y3M6c3ZlbHRlLmNvbXBvbmVudC51c2UtY2FsbC1zaXRlcw==",
    hasNextPage: true,
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:0": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:0",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:code.api.stability",
    },
    cursor: "Y3M6Y29kZS5hcGkuc3RhYmlsaXR5",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:1": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:1",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:code.array.safe_access",
    },
    cursor: "Y3M6Y29kZS5hcnJheS5zYWZlX2FjY2Vzcw==",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:2": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:2",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:code.assertion.non_null",
    },
    cursor: "Y3M6Y29kZS5hc3NlcnRpb24ubm9uX251bGw=",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:17": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:17",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:css.selectors.specificity",
    },
    cursor: "Y3M6Y3NzLnNlbGVjdG9ycy5zcGVjaWZpY2l0eQ==",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:58": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:58",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:react.component.link_component",
    },
    cursor: "Y3M6cmVhY3QuY29tcG9uZW50LmxpbmtfY29tcG9uZW50",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:60": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:60",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:react.component.props",
    },
    cursor: "Y3M6cmVhY3QuY29tcG9uZW50LnByb3Bz",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:83": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:83",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:storybook.story.documentation",
    },
    cursor: "Y3M6c3Rvcnlib29rLnN0b3J5LmRvY3VtZW50YXRpb24=",
  },
  "client:root:__StandardsIndex_codeStandards_connection:edges:93": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:edges:93",
    __typename: "CodeStandardEdge",
    node: {
      __ref: "cs:styling.tokens.creation",
    },
    cursor: "Y3M6c3R5bGluZy50b2tlbnMuY3JlYXRpb24=",
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
        "client:root:__StandardsIndex_codeStandards_connection:edges:17",
        "client:root:__StandardsIndex_codeStandards_connection:edges:58",
        "client:root:__StandardsIndex_codeStandards_connection:edges:60",
        "client:root:__StandardsIndex_codeStandards_connection:edges:83",
        "client:root:__StandardsIndex_codeStandards_connection:edges:93",
      ],
    },
    pageInfo: {
      __ref: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    },
  },
  "client:root:__StandardsIndex_codeStandards_connection:pageInfo": {
    __id: "client:root:__StandardsIndex_codeStandards_connection:pageInfo",
    __typename: "PageInfo",
    hasNextPage: true,
    hasPreviousPage: false,
    endCursor: "Y3M6c3ZlbHRlLmNvbXBvbmVudC51c2UtY2FsbC1zaXRlcw==",
    startCursor: null,
  },
  "cs:code.api.stability": {
    __id: "cs:code.api.stability",
    __typename: "CodeStandard",
    id: "cs:code.api.stability",
    uri: "cs:code.api.stability",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:code.api.stability:categories(first:1)",
    },
  },
  "client:cs:code.api.stability:categories(first:1)": {
    __id: "client:cs:code.api.stability:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: ["client:cs:code.api.stability:categories(first:1):edges:0"],
    },
  },
  "client:cs:code.api.stability:categories(first:1):edges:0": {
    __id: "client:cs:code.api.stability:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:code",
    },
  },
  "cs:code": {
    __id: "cs:code",
    __typename: "Category",
    id: "cs:code",
    slug: "code",
  },
  "cs:code.array.safe_access": {
    __id: "cs:code.array.safe_access",
    __typename: "CodeStandard",
    id: "cs:code.array.safe_access",
    uri: "cs:code.array.safe_access",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:code.array.safe_access:categories(first:1)",
    },
  },
  "client:cs:code.array.safe_access:categories(first:1)": {
    __id: "client:cs:code.array.safe_access:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: ["client:cs:code.array.safe_access:categories(first:1):edges:0"],
    },
  },
  "client:cs:code.array.safe_access:categories(first:1):edges:0": {
    __id: "client:cs:code.array.safe_access:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:code",
    },
  },
  "cs:code.assertion.non_null": {
    __id: "cs:code.assertion.non_null",
    __typename: "CodeStandard",
    id: "cs:code.assertion.non_null",
    uri: "cs:code.assertion.non_null",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:code.assertion.non_null:categories(first:1)",
    },
  },
  "client:cs:code.assertion.non_null:categories(first:1)": {
    __id: "client:cs:code.assertion.non_null:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: ["client:cs:code.assertion.non_null:categories(first:1):edges:0"],
    },
  },
  "client:cs:code.assertion.non_null:categories(first:1):edges:0": {
    __id: "client:cs:code.assertion.non_null:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:code",
    },
  },
  "cs:css.selectors.specificity": {
    __id: "cs:css.selectors.specificity",
    __typename: "CodeStandard",
    id: "cs:css.selectors.specificity",
    uri: "cs:css.selectors.specificity",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:css.selectors.specificity:categories(first:1)",
    },
  },
  "client:cs:css.selectors.specificity:categories(first:1)": {
    __id: "client:cs:css.selectors.specificity:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: [
        "client:cs:css.selectors.specificity:categories(first:1):edges:0",
      ],
    },
  },
  "client:cs:css.selectors.specificity:categories(first:1):edges:0": {
    __id: "client:cs:css.selectors.specificity:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:css",
    },
  },
  "cs:css": {
    __id: "cs:css",
    __typename: "Category",
    id: "cs:css",
    slug: "css",
  },
  "cs:react.component.link_component": {
    __id: "cs:react.component.link_component",
    __typename: "CodeStandard",
    id: "cs:react.component.link_component",
    uri: "cs:react.component.link_component",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:react.component.link_component:categories(first:1)",
    },
  },
  "client:cs:react.component.link_component:categories(first:1)": {
    __id: "client:cs:react.component.link_component:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: [
        "client:cs:react.component.link_component:categories(first:1):edges:0",
      ],
    },
  },
  "client:cs:react.component.link_component:categories(first:1):edges:0": {
    __id: "client:cs:react.component.link_component:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:react",
    },
  },
  "cs:react": {
    __id: "cs:react",
    __typename: "Category",
    id: "cs:react",
    slug: "react",
  },
  "cs:react.component.props": {
    __id: "cs:react.component.props",
    __typename: "CodeStandard",
    id: "cs:react.component.props",
    uri: "cs:react.component.props",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:react.component.props:categories(first:1)",
    },
  },
  "client:cs:react.component.props:categories(first:1)": {
    __id: "client:cs:react.component.props:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: ["client:cs:react.component.props:categories(first:1):edges:0"],
    },
  },
  "client:cs:react.component.props:categories(first:1):edges:0": {
    __id: "client:cs:react.component.props:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:react",
    },
  },
  "cs:storybook.story.documentation": {
    __id: "cs:storybook.story.documentation",
    __typename: "CodeStandard",
    id: "cs:storybook.story.documentation",
    uri: "cs:storybook.story.documentation",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:storybook.story.documentation:categories(first:1)",
    },
  },
  "client:cs:storybook.story.documentation:categories(first:1)": {
    __id: "client:cs:storybook.story.documentation:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: [
        "client:cs:storybook.story.documentation:categories(first:1):edges:0",
      ],
    },
  },
  "client:cs:storybook.story.documentation:categories(first:1):edges:0": {
    __id: "client:cs:storybook.story.documentation:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:storybook",
    },
  },
  "cs:storybook": {
    __id: "cs:storybook",
    __typename: "Category",
    id: "cs:storybook",
    slug: "storybook",
  },
  "cs:styling.tokens.creation": {
    __id: "cs:styling.tokens.creation",
    __typename: "CodeStandard",
    id: "cs:styling.tokens.creation",
    uri: "cs:styling.tokens.creation",
    name: null,
    "categories(first:1)": {
      __ref: "client:cs:styling.tokens.creation:categories(first:1)",
    },
  },
  "client:cs:styling.tokens.creation:categories(first:1)": {
    __id: "client:cs:styling.tokens.creation:categories(first:1)",
    __typename: "CategoryConnection",
    edges: {
      __refs: ["client:cs:styling.tokens.creation:categories(first:1):edges:0"],
    },
  },
  "client:cs:styling.tokens.creation:categories(first:1):edges:0": {
    __id: "client:cs:styling.tokens.creation:categories(first:1):edges:0",
    __typename: "CategoryEdge",
    node: {
      __ref: "cs:styling",
    },
  },
  "cs:styling": {
    __id: "cs:styling",
    __typename: "Category",
    id: "cs:styling",
    slug: "styling",
  },
} as unknown as RecordMap;

export default standardsIndexRecords;
