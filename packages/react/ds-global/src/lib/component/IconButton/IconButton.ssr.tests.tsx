import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./IconButton.js";

describe("IconButton SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component icon="edit" aria-label="Edit" />);
    }).not.toThrow();
  });

  it("renders a button with Button's and its own classes", () => {
    const html = renderToString(<Component icon="edit" aria-label="Edit" />);
    expect(html).toContain("<button");
    expect(html).toContain("ds button primary icon-button");
    expect(html).toContain('aria-label="Edit"');
  });
});
