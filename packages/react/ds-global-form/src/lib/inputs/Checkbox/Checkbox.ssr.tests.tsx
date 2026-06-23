import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("Checkbox (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<Checkbox name="agree" />);
    expect(html).toContain("<input");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="agree"');
    expect(html).toContain("ds form-checkbox");
  });
});
