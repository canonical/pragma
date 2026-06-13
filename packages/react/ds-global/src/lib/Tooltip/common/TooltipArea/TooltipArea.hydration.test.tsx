import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import TooltipArea from "./TooltipArea.js";

/**
 * Unlike TooltipArea.tests.tsx, this file deliberately does NOT mock
 * `createPortal` — it verifies the real server/client rendering contract.
 */
describe("TooltipArea hydration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates server HTML without mismatches and portals the message after mount", () => {
    const ui = (
      <TooltipArea Message="Helpful message">
        <button type="button">Trigger</button>
      </TooltipArea>
    );

    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(ui, { container, hydrate: true });

    const hydrationErrors = errorSpy.mock.calls.filter((call) =>
      call.some((arg) => /hydrat|did not match/i.test(String(arg))),
    );
    expect(hydrationErrors).toEqual([]);

    // After mount the message relocates out of the inline position into the
    // document.body portal.
    const message = screen.getByText("Helpful message");
    expect(message.closest(".ds.tooltip-area")).toBeNull();
    expect(document.body.contains(message)).toBe(true);
  });
});
