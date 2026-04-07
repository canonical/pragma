import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FloatingAnchor from "./FloatingAnchor.js";

describe("FloatingAnchor SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <FloatingAnchor content="Tooltip text">
        <span>Anchor</span>
      </FloatingAnchor>,
    );
    expect(html).toContain("Anchor");
    expect(html).toContain("ds floating-anchor");
  });

  it("renders with click trigger without errors", () => {
    const html = renderToString(
      <FloatingAnchor content="Popover text" trigger="click">
        <button type="button">Click me</button>
      </FloatingAnchor>,
    );
    expect(html).toContain("Click me");
  });
});
