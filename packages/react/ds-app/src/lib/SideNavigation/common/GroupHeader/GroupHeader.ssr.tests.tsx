import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GroupHeader from "./GroupHeader.js";

describe("GroupHeader SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<GroupHeader>Hardware</GroupHeader>);
    expect(html).toContain("ds side-navigation-group-header");
    expect(html).toContain("Hardware");
  });
});
