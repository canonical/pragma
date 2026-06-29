import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HiddenInput } from "./HiddenInput.js";

describe("HiddenInput (SSR)", () => {
  it("renders a hidden input to static HTML", () => {
    const html = renderToString(
      <HiddenInput name="secret" value="v" readOnly />,
    );
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="secret"');
  });
});
