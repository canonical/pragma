import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("Textarea (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<Textarea name="content" rows={5} />);
    expect(html).toContain("<textarea");
    expect(html).toContain('name="content"');
    expect(html).toContain("ds input textarea chrome");
  });
});
