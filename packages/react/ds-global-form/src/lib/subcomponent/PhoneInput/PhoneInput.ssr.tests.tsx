import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhoneInput } from "./PhoneInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("PhoneInput (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<PhoneInput defaultCountry="US" />);
    expect(html).toContain("<select");
    expect(html).toContain('type="tel"');
    expect(html).toContain('aria-label="Country code"');
    expect(html).toContain('aria-label="Phone number"');
    expect(html).toContain("ds input phone chrome");
  });
});
