import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ItemExpandable from "./ItemExpandable.js";

describe("ItemExpandable SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <ItemExpandable heading="Hardware" defaultExpanded>
        <li>Machines</li>
      </ItemExpandable>,
    );
    expect(html).toContain("ds side-navigation-item-expandable");
    expect(html).toContain("Hardware");
    expect(html).toContain("Machines");
  });
});
