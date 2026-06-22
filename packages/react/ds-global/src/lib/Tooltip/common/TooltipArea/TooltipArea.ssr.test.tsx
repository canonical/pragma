import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TooltipArea from "./TooltipArea.js";

describe("TooltipArea SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(
        <TooltipArea Message="Helpful message">
          <span>Target</span>
        </TooltipArea>,
      );
    }).not.toThrow();
  });

  it("renders the message inline so aria-describedby resolves in server HTML", () => {
    const html = renderToString(
      <TooltipArea Message="Helpful message">
        <span>Target</span>
      </TooltipArea>,
    );
    expect(html).toContain("Helpful message");
    expect(html).toContain("aria-describedby");
  });
});
