import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { withTooltip } from "./index.js";

const Trigger = () => <span>Target</span>;

/**
 * The server-rendered floor. The portalled message is deferred until after
 * mount, so the server HTML carries the target and its `aria-describedby`
 * association but not the message itself — the same output the first client
 * render produces, which is what keeps hydration free of mismatches.
 */
describe("withTooltip (SSR)", () => {
  it("renders to static HTML without throwing", () => {
    const Tooltipped = withTooltip(Trigger, "Helpful message");
    expect(() => renderToString(<Tooltipped />)).not.toThrow();
  });

  it("emits the target with aria-describedby but not the deferred message", () => {
    const Tooltipped = withTooltip(Trigger, "Helpful message");
    const html = renderToString(<Tooltipped />);

    expect(html).toContain("ds tooltip-area");
    expect(html).toContain("Target");
    expect(html).toContain("aria-describedby");
    // The message is portalled only after mount, so it must be absent on the
    // server — emitting it here would mismatch the first client render.
    expect(html).not.toContain("Helpful message");
  });
});
