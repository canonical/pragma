import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Range } from "./Range.js";

describe("Range (SSR)", () => {
  it("renders the slider and output to static HTML", () => {
    const html = renderToString(
      <Range name="volume" min={0} max={100} value={50} readOnly />,
    );
    expect(html).toContain('type="range"');
    expect(html).toContain("<output");
    expect(html).toContain("50");
  });
});
