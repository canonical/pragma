import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import KeyboardKey from "./KeyboardKey.js";

describe("KeyboardKey SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<KeyboardKey keyValue="enter" />);
    expect(html).toContain("↵");
    expect(html).toContain("ds keyboard-key");
  });
});
