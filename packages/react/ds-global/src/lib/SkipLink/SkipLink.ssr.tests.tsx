/* @canonical/generator-ds 0.10.0-experimental.4 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./SkipLink.js";

describe("SkipLink SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component />);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component />);
    expect(html).toContain("<a");
    expect(html).toContain("</a>");
  });

  it("applies className", () => {
    const html = renderToString(<Component className="test-class" />);
    expect(html).toContain('class="ds skip-link test-class"');
  });
});
