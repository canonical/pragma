import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Tab from "./Tab.js";

describe("Tabs.Tab SSR", () => {
  it("renders to static markup without throwing", () => {
    const html = renderToString(
      <ul>
        <Tab href="/a" active>
          A
        </Tab>
      </ul>,
    );
    expect(html).toContain("ds tabs-item");
    expect(html).toContain('href="/a"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("A");
  });
});
