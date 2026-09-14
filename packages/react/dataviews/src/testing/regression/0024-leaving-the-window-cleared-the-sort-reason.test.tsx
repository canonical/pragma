/**
 * Regression: a refusal's reason survives the window losing focus.
 *
 * Before the fix, switching to another window or tab blurred the header's
 * control with nowhere in the page to go, which read as focus leaving the
 * column, so a reader who came back to the same control found the reason
 * gone.
 */

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import renderRefusingTable from "../../../testing/renderRefusingTable.js";

describe("regression 0024 — leaving the window cleared the sort reason", () => {
  it("keeps the reason when the blur is the window's, not the column's", () => {
    const { status, findReason } = renderRefusingTable();
    fireEvent.click(status, { shiftKey: true });
    expect(findReason()).not.toBeEmptyDOMElement();
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    onTestFinished(() => {
      hasFocus.mockRestore();
    });
    fireEvent.blur(status);
    expect(findReason()).not.toBeEmptyDOMElement();
  });
});
