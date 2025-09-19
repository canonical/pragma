/* @canonical/generator-ds 0.10.0-experimental.2 */

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
    expect(html).toContain(
      '<link rel="preload" as="image" href="/assets/icons/user.svg"/><img src="/assets/icons/user.svg" class="ds icon size-md"/>',
    );
  });

  it("applies className", () => {
    const html = renderToString(
      <Component className="test-class" icon={"user"} />,
    );
    expect(html).toContain(
      '<link rel="preload" as="image" href="/assets/icons/user.svg"/><img src="/assets/icons/user.svg" class="ds icon test-class size-md"/>',
    );
  });
});
