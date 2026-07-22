/**
 * PropertiesSection through the real page fan-out: the captured property
 * rows render as a plain-text table (ruling R8 — no markdown), and a
 * component with zero properties gets the honest empty state.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** A schema-legal minimal component with an empty properties list. */
const BARE_URI = "ds:global.component.bare";
const bareRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'component(uri:"ds:global.component.bare")': {
      __ref: BARE_URI,
    },
  },
  [BARE_URI]: {
    __id: BARE_URI,
    __typename: "Component",
    id: BARE_URI,
    name: "Bare",
    uri: BARE_URI,
    summary: null,
    tier: null,
    version: null,
    properties: { __refs: [] },
    _meta: { __ref: "client:bare:meta" },
    "subcomponents(first:24)": {
      __ref: "client:bare:subcomponents",
    },
    "modifierFamilies(first:24)": {
      __ref: "client:bare:modifierFamilies",
    },
    "variants(first:24)": { __ref: "client:bare:variants" },
    "variantOfs(first:24)": { __ref: "client:bare:variantOfs" },
    "inheritsFroms(first:24)": { __ref: "client:bare:inheritsFroms" },
    "specializedBies(first:24)": { __ref: "client:bare:specializedBies" },
  },
  "client:bare:meta": {
    __id: "client:bare:meta",
    __typename: "EntityMeta",
    type: { __ref: "client:bare:meta:type" },
  },
  "client:bare:meta:type": {
    __id: "client:bare:meta:type",
    __typename: "OntologyClass",
    uri: "https://ds.canonical.com/Component",
    label: "Component",
    namespace: "ds",
  },
  ...Object.fromEntries(
    (
      [
        ["subcomponents", "SubcomponentConnection"],
        ["modifierFamilies", "ModifierFamilyConnection"],
        ["variants", "UIBlockConnection"],
        ["variantOfs", "UIBlockConnection"],
        ["inheritsFroms", "UIBlockConnection"],
        ["specializedBies", "UIBlockConnection"],
      ] as const
    ).flatMap(([field, typename]) => [
      [
        `client:bare:${field}`,
        {
          __id: `client:bare:${field}`,
          __typename: typename,
          edges: { __refs: [] },
          pageInfo: { __ref: `client:bare:${field}:pageInfo` },
        },
      ],
      [
        `client:bare:${field}:pageInfo`,
        {
          __id: `client:bare:${field}:pageInfo`,
          __typename: "PageInfo",
          hasNextPage: false,
        },
      ],
    ]),
  ),
} as unknown as RecordMap;

describe("PropertiesSection", () => {
  it("tables the captured properties as plain text, no fetch", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn));

    expect(
      screen.getByRole("heading", { level: 2, name: "Properties" }),
    ).toBeInTheDocument();
    // One row per captured property (plus the header row).
    expect(screen.getAllByRole("row")).toHaveLength(6);
    // Cells render the graph's values verbatim — plain text, R8.
    const variantRow = screen
      .getByRole("rowheader", { name: "variantSpecial" })
      .closest("tr");
    expect(variantRow?.textContent).toContain("choice");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("renders the empty state when the component records no properties", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(BARE_URI, bareRecords, fetchFn));

    expect(screen.getByText("No properties recorded.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
