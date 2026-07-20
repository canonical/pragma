import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GraphLegend from "./GraphLegend.js";

describe("GraphLegend SSR", () => {
  it("renders to static markup without a browser", () => {
    const html = renderToString(<GraphLegend />);

    expect(html).toContain("ds graph-legend");
    expect(html).toContain("Component");
    expect(html).toContain("is a");
  });
});
