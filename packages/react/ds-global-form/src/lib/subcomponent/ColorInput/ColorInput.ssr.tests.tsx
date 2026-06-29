import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ColorInput } from "./ColorInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("ColorInput (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<ColorInput value="#ff0000" />);
    expect(html).toContain("ds input color");
    expect(html).toContain("#ff0000");
  });

  it("renders the inline hex variant when there are no swatches", () => {
    const html = renderToString(<ColorInput value="#000000" swatches={[]} />);
    expect(html).toContain("ds input color inline");
    expect(html).toContain("<input");
  });
});
