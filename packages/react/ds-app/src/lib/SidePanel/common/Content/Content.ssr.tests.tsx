import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Content from "./Content.js";

describe("SidePanel.Content SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Content>Test content</Content>);
    expect(html).toContain('class="ds side-panel-content"');
    expect(html).toContain("Test content");
  });
});
