import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Text } from "./Text.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("Text (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<Text name="username" inputType="email" />);
    expect(html).toContain("<input");
    expect(html).toContain('type="email"');
    expect(html).toContain('name="username"');
    expect(html).toContain("ds input text chrome");
  });

  it("includes prefix and suffix in the SSR output", () => {
    const html = renderToString(
      <Text name="domain" prefix="https://" suffix=".com" />,
    );
    expect(html).toContain("https://");
    expect(html).toContain(".com");
  });
});
