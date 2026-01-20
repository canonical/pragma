import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Button.js";

describe("Button SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component>Hello world!</Component>);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component>Hello world!</Component>);
    expect(html).toMatch(/<button[^>]*>Hello world!<\/button>/);
  });

  it("applies className", () => {
    const html = renderToString(
      <Component className="test-class">Hello world!</Component>,
    );
    expect(html).toContain('class="ds button test-class"');
  });
});
