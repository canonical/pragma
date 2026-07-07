import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipArea } from "./common/TooltipArea/index.js";

describe("TooltipArea SSR", () => {
  it("renders the trigger on the server without throwing", () => {
    const html = renderToString(
      <TooltipArea Message="Tooltip message">Trigger</TooltipArea>,
    );

    expect(html).toContain("ds tooltip-area");
    expect(html).toContain("Trigger");
  });

  it("renders the tooltip closed (aria-hidden) on the server", () => {
    const html = renderToString(
      <TooltipArea Message="Tooltip message">Trigger</TooltipArea>,
    );

    // The overlay renders closed on the server: positioning and open state are
    // strictly post-hydration, so the tooltip is inert until the client runs.
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Tooltip message");
  });
});
