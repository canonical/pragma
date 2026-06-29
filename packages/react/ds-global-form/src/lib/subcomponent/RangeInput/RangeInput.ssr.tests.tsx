import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RangeInput } from "./RangeInput.js";

describe("RangeInput (SSR)", () => {
  it("renders the slider and output to static HTML", () => {
    const html = renderToString(
      <RangeInput name="volume" min={0} max={100} value={50} readOnly />,
    );
    expect(html).toContain('type="range"');
    expect(html).toContain("<output");
    expect(html).toContain("50");
  });
});
