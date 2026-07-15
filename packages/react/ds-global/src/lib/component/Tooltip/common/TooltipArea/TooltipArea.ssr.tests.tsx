import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TooltipArea from "./TooltipArea.js";

/**
 * The server-rendered floor. The portalled message is deferred until after
 * mount, so the server HTML carries the target and its `aria-describedby`
 * association but not the message itself — the same output the first client
 * render produces, which is what keeps hydration free of mismatches.
 */
describe("TooltipArea (SSR)", () => {
  it("renders to static HTML without throwing", () => {
    expect(() =>
      renderToString(
        <TooltipArea Message="Helpful message">
          <span>Target</span>
        </TooltipArea>,
      ),
    ).not.toThrow();
  });

  it("emits the target with aria-describedby but not the deferred message", () => {
    const html = renderToString(
      <TooltipArea Message="Helpful message">
        <span>Target</span>
      </TooltipArea>,
    );

    expect(html).toContain("ds tooltip-area");
    expect(html).toContain("Target");
    expect(html).toContain("aria-describedby");
    // The message is portalled only after mount, so it must be absent on the
    // server — emitting it here would mismatch the first client render.
    expect(html).not.toContain("Helpful message");
  });
});
