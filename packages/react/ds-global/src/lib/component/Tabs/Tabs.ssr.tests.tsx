import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Tabs from "./Tabs.js";

describe("Tabs SSR", () => {
  it("renders to static markup without throwing", () => {
    const html = renderToString(
      <Tabs aria-label="Sections">
        <Tabs.Tab href="#overview" active>
          Overview
        </Tabs.Tab>
        <Tabs.Tab href="#specs">Specs</Tabs.Tab>
      </Tabs>,
    );
    expect(html).toContain("ds tabs");
    expect(html).toContain("Overview");
    expect(html).toContain('href="#overview"');
    expect(html).toContain('aria-current="page"');
  });
});
