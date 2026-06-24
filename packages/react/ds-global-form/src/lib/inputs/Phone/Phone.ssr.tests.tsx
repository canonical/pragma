import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Phone } from "./Phone.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("Phone (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<Phone defaultCountry="US" />);
    expect(html).toContain("<select");
    expect(html).toContain('type="tel"');
    expect(html).toContain('aria-label="Country code"');
    expect(html).toContain('aria-label="Phone number"');
    expect(html).toContain("ds input phone chrome");
  });
});
