/* @canonical/generator-ds 0.10.0-experimental.2 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Section.js";

describe("Section SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component>contents</Component>);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component>contents</Component>);
    expect(html).toContain("<section");
    expect(html).toContain("</section>");
  });

  it("applies className", () => {
    const html = renderToString(
      <Component className="test-class">contents</Component>,
    );
    expect(html).toContain('class="ds section test-class"');
  });
});
