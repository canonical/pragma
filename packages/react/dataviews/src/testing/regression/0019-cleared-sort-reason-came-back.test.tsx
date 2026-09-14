/**
 * Regression: a refusal's reason, once gone, stays gone.
 *
 * Before the fix, a change of ordering from outside the header only hid the
 * reason: the refusal was still held, so going back to the ordering it was
 * refused over — Forward, or another table setting it again — brought the
 * reason back and announced it, though nothing had been activated.
 */

import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import renderRefusingTable from "../../../testing/renderRefusingTable.js";

describe("regression 0019 — a cleared sort reason came back", () => {
  it("keeps the reason gone when the ordering it was refused over returns", () => {
    const { provider, status, findReason } = renderRefusingTable();
    fireEvent.click(status, { shiftKey: true });
    expect(findReason()).not.toBeEmptyDOMElement();
    act(() => {
      provider.setSort([]);
    });
    expect(findReason()).toBeEmptyDOMElement();
    act(() => {
      provider.setSort([{ field: "name", direction: "asc" }]);
    });
    expect(findReason()).toBeEmptyDOMElement();
  });

  it("keeps the reason gone when its column is hidden and shown again", () => {
    const { provider, status, findReason } = renderRefusingTable();
    fireEvent.click(status, { shiftKey: true });
    expect(findReason()).not.toBeEmptyDOMElement();
    act(() => {
      provider.presentation.arrange({ "table.hidden": ["status"] });
    });
    act(() => {
      provider.presentation.arrange({ "table.hidden": [] });
    });
    expect(findReason()).toBeEmptyDOMElement();
  });
});
