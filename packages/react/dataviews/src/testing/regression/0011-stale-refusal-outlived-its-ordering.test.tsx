/**
 * Regression: a refusal's reason goes when the ordering changes elsewhere.
 *
 * Before the fix, a reason stood until the same table accepted another
 * activation, so a sort from the panel, the URL, Back or another table left
 * a header saying the sort was unchanged over rows sorted otherwise.
 */

import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import renderRefusingTable from "../../../testing/renderRefusingTable.js";

describe("regression 0011 — a stale refusal outlived its ordering", () => {
  it("drops the reason once the ordering moves from outside the header", () => {
    const { provider, status, findReason } = renderRefusingTable();
    fireEvent.click(status, { shiftKey: true });
    expect(findReason()).not.toBeEmptyDOMElement();
    act(() => {
      provider.setSort([{ field: "status", direction: "desc" }]);
    });
    expect(findReason()).toBeEmptyDOMElement();
  });
});
