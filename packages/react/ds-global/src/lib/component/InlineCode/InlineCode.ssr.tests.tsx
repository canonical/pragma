import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InlineCode from "./InlineCode.js";

describe("InlineCode SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<InlineCode>Test content</InlineCode>);
    expect(html).toContain("Test content");
    expect(html).toContain("ds inline-code");
  });
});
