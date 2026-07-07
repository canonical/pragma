import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Spinner.js";

describe("Spinner SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component />);
    }).not.toThrow();
  });

  it("renders the spinner icon", () => {
    const html = renderToString(<Component />);
    expect(html).toContain("<svg");
    expect(html).toContain('href="/icons/spinner.svg#spinner"');
  });

  it("applies className", () => {
    const html = renderToString(<Component className="test-class" />);
    expect(html).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" class="ds spinner test-class" aria-hidden="true"><use href="/icons/spinner.svg#spinner"></use></svg>',
    );
  });

  it("renders a named image when aria-label is provided", () => {
    const html = renderToString(<Component aria-label="Loading" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Loading"');
    expect(html).not.toContain("aria-hidden");
  });
});
