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

  it("defers the tooltip message to the client (no SSR message markup)", () => {
    const html = renderToString(
      <TooltipArea Message="Tooltip message">Trigger</TooltipArea>,
    );

    // The message is portalled and mounted client-only, so the server and the
    // first client render agree (nothing at the call site) — no hydration
    // mismatch, no forced re-mount. The trigger still carries its stable
    // aria-describedby, and the message appears once the tooltip mounts.
    expect(html).not.toContain("Tooltip message");
    expect(html).toContain("aria-describedby");
  });
});
