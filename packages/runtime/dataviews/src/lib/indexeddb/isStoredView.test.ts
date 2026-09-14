import { describe, expect, it } from "vitest";
import { buildStoredView } from "../../../testing/fixtures.js";
import isStoredView from "./isStoredView.js";

const { pinned: _pin, ...fields } = buildStoredView();
/** The stored form of the fixture view: versioned, in this store's scope. */
const view = { ...fields, v: 1, scope: "machines" };

describe("isStoredView", () => {
  it("reads a record in this store's format, which carries its arrangement", () => {
    expect(isStoredView(view)).toBe(true);
    expect(isStoredView({ ...view, presentation: { width: 1 } })).toBe(true);
    expect(isStoredView({ ...view, presentation: [1] })).toBe(false);
    // Every record this store writes carries one: none is not its format.
    const { presentation: _missing, ...withoutArrangement } = view;
    expect(isStoredView(withoutArrangement)).toBe(false);
    expect(isStoredView({ ...view, presentation: null })).toBe(false);
    expect(isStoredView({ ...view, revision: 0 })).toBe(false);
    expect(isStoredView({ ...view, v: 2 })).toBe(false);
  });

  it("reads nothing that is not an object", () => {
    expect(isStoredView("view")).toBe(false);
    expect(isStoredView(null)).toBe(false);
    expect(isStoredView(undefined)).toBe(false);
  });
});
