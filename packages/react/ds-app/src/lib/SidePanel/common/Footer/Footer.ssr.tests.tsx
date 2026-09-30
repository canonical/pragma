import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Footer from "./Footer.js";

describe("SidePanel.Footer SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Footer>Actions</Footer>);
    expect(html).toContain('class="ds side-panel-footer"');
    expect(html).toContain("Actions");
  });
});
