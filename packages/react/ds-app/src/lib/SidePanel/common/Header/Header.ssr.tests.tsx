import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Header from "./Header.js";

describe("SidePanel.Header SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Header>Panel title</Header>);
    expect(html).toContain('class="ds side-panel-header"');
    expect(html).toContain("Panel title");
  });
});
