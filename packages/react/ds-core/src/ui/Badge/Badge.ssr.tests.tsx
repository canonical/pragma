/* @canonical/generator-ds 0.10.0-experimental.2 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Badge.js";

describe("Badge SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component value={5} />);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component value={5} />);
    expect(html).toContain("<span");
    expect(html).toContain("</span>");
  });

  it("applies className", () => {
    const html = renderToString(<Component value={5} className="test-class" />);
    expect(html).toContain('class="ds badge test-class"');
  });
});
