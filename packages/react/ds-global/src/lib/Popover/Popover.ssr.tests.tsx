import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import Popover from "./Popover.js";

describe("Popover SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <Popover content="Panel">
        <button type="button">Click me</button>
      </Popover>,
    );
    expect(html).toContain("Click me");
    expect(html).toContain("ds floating-anchor");
    expect(html).toContain("ds popover");
  });
});
