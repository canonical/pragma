import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import KeyboardKeys from "./KeyboardKeys.js";

describe("KeyboardKeys SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<KeyboardKeys>Test content</KeyboardKeys>);
    expect(html).toContain("Test content");
    expect(html).toContain("ds keyboard-keys");
  });
});
