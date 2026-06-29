import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateInput } from "./DateInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("DateInput (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<DateInput name="birthday" />);
    expect(html).toContain("<input");
    expect(html).toContain('type="date"');
    expect(html).toContain('name="birthday"');
    expect(html).toContain("ds input date chrome");
  });

  it("includes min and max in the SSR output", () => {
    const html = renderToString(
      <DateInput name="birthday" min="2024-01-01" max="2025-12-31" />,
    );
    expect(html).toContain('min="2024-01-01"');
    expect(html).toContain('max="2025-12-31"');
  });
});
