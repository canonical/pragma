import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Icon.js";

describe("Icon SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<Component icon={"user"} />);
    }).not.toThrow();
  });

  it("renders", () => {
    const html = renderToString(<Component icon={"user"} />);
    expect(html).toContain("<svg");
    expect(html).toContain("</svg>");
  });

  it("applies className", () => {
    const html = renderToString(
      <Component className="test-class" icon={"user"} />,
    );
    expect(html).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" class="ds icon test-class" role="img"><use href="/icons/user.svg#user"></use></svg>',
    );
  });
});
