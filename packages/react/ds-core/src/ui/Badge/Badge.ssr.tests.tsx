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
    const html = renderToString(<Component value={5} role={"status"} />);
    expect(html).toBe(
      '<span class="ds badge" role="status" aria-label="5 items exist">5</span>',
    );
  });
});
