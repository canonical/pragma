import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hidden } from "./Hidden.js";

describe("Hidden (SSR)", () => {
  it("renders a hidden input to static HTML", () => {
    const html = renderToString(<Hidden name="secret" value="v" readOnly />);
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="secret"');
  });
});
