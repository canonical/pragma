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

  it("server-renders the native constraints, so the floor needs no scripting", () => {
    const html = renderToString(
      <PhoneInput defaultCountry="US" name="mobile" />,
    );
    expect(html).toContain('name="mobile"');
    // Matched case-insensitively: HTML attribute names are, and which casing
    // React emits for these is its business, not this component's contract.
    expect(html).toMatch(/autocomplete="tel-national"/i);
    expect(html).toMatch(/autocomplete="tel-country-code"/i);
    expect(html).toMatch(/inputmode="tel"/i);
    expect(html).toContain("pattern=");
  });
});
