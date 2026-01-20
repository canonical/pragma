import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Button.js";

describe("Button SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component>Hello world!</Component>);
    }).not.toThrow();
  });

  it("renders children", () => {
    const html = renderToString(<Component>Hello world!</Component>);
    expect(html).toContain("Hello world!");
  });

  it("applies base classes", () => {
    const html = renderToString(<Component>Test</Component>);
    expect(html).toContain('class="ds button"');
  });

  it("applies custom className", () => {
    const html = renderToString(
      <Component className="test-class">Hello world!</Component>,
    );
    expect(html).toContain("ds button");
    expect(html).toContain("test-class");
  });

  it("applies importance modifier", () => {
    const html = renderToString(
      <Component importance="primary">Primary</Component>,
    );
    expect(html).toContain("primary");
  });

  it("applies anticipation modifier", () => {
    const html = renderToString(
      <Component anticipation="destructive">Delete</Component>,
    );
    expect(html).toContain("destructive");
  });

  it("applies both importance and anticipation", () => {
    const html = renderToString(
      <Component importance="primary" anticipation="destructive">
        Delete Account
      </Component>,
    );
    expect(html).toContain("primary");
    expect(html).toContain("destructive");
  });

  it("applies variant modifier", () => {
    const html = renderToString(
      <Component variant="link">Learn more</Component>,
    );
    expect(html).toContain("link");
  });

  it("renders icon with icon class", () => {
    const html = renderToString(
      <Component icon={<span>+</span>}>Add</Component>,
    );
    expect(html).toContain('class="icon"');
    expect(html).toContain(">+<");
  });
});
