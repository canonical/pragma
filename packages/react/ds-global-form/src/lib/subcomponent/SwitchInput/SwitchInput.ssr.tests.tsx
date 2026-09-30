import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SwitchInput } from "./SwitchInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("SwitchInput (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<SwitchInput name="notify" />);
    expect(html).toContain("<input");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('name="notify"');
    expect(html).toContain("ds form-switch");
  });
});
