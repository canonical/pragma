import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Popover from "./Popover.js";

describe("Popover SSR", () => {
  it("renders a native details/summary on the server", () => {
    const html = renderToString(<Popover trigger="Open">Popover body</Popover>);

    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("Open");
    expect(html).toContain("Popover body");
  });

  it("renders closed (no open attribute) on the server", () => {
    const html = renderToString(<Popover trigger="Open">Popover body</Popover>);

    // The overlay renders closed on the server; the native <details> toggle is
    // the no-JS baseline, and the hook takes over only after hydration.
    expect(html).not.toContain("<details open");
    // Do not leave aria-hidden/inert on server HTML: without JavaScript the
    // native details toggle must expose the dialog when opened.
    expect(html).not.toContain('aria-hidden="true"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain("aria-labelledby=");
  });

  it("renders a styled trigger as a button, not inside summary", () => {
    const html = renderToString(
      <Popover
        trigger="Filter"
        triggerProps={{ importance: "secondary" }}
        label="Filters"
      >
        Search
      </Popover>,
    );
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-label="Filters"');
    expect(html).not.toContain("<summary");
  });
});
