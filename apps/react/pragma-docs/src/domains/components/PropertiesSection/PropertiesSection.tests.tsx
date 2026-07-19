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
    "subcomponents(first:24)": {
      __ref: "client:bare:subcomponents",
    },
    "modifierFamilies(first:24)": {
      __ref: "client:bare:modifierFamilies",
    },
  },
  "client:bare:subcomponents": {
    __id: "client:bare:subcomponents",
    __typename: "SubcomponentConnection",
    edges: { __refs: [] },
  },
  "client:bare:modifierFamilies": {
    __id: "client:bare:modifierFamilies",
    __typename: "ModifierFamilyConnection",
    edges: { __refs: [] },
  },
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
