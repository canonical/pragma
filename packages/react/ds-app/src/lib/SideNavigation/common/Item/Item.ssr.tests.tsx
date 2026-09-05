import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Item from "./Item.js";

describe("Item SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Item url="/machines" label="Machines" />);
    expect(html).toContain("ds side-navigation-item");
    expect(html).toContain("Machines");
  });
});
