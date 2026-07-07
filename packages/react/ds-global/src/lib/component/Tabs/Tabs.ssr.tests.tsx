import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Tabs from "./Tabs.js";
import type { TabItem } from "./types.js";

const root: TabItem = {
  key: "root",
  items: [
    { url: "/overview", label: "Overview" },
    { url: "/specs", label: "Specs" },
  ],
};

describe("Tabs SSR", () => {
  it("renders to static markup without throwing", () => {
    const html = renderToString(
      <Tabs
        aria-label="Sections"
        navigationRoot={root}
        currentUrl="/overview"
      />,
    );
    expect(html).toContain("ds tabs");
    expect(html).toContain("Overview");
    expect(html).toContain('href="/overview"');
    expect(html).toContain('aria-current="page"');
  });
});
