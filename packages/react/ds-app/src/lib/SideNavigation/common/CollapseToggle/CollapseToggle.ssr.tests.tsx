import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CollapseToggle from "./CollapseToggle.js";

describe("CollapseToggle SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<CollapseToggle expanded />);
    expect(html).toContain("ds collapse-toggle");
    expect(html).toContain('aria-expanded="true"');
  });
});
