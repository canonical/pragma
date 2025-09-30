/* @canonical/generator-ds 0.10.0-experimental.2 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Image.js";

describe("Image SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component />);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component />);
    expect(html).toContain('<img class="ds card-image"/>');
  });

  it("applies className", () => {
    const html = renderToString(<Component className="test-class" />);
    expect(html).toContain('<img class="ds card-image test-class"/>');
  });
});
