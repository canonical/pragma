import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Item from "./Item.js";

describe("Tabs Item SSR", () => {
  it("renders to static markup without throwing", () => {
    const html = renderToString(
      <ul>
        <Item item={{ url: "/a", label: "A" }} active LinkComponent="a" />
      </ul>,
    );
    expect(html).toContain("ds tabs-item");
    expect(html).toContain('href="/a"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("A");
  });
});
