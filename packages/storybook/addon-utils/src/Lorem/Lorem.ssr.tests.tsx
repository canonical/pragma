import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Lorem from "./Lorem.js";

describe("Lorem SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Lorem paragraphs={2} />);
    expect(html).toContain("ds lorem");
    expect(html).toContain("Lorem ipsum");
  });
});
