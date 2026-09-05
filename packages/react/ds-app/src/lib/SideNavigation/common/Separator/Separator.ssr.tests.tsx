import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Separator from "./Separator.js";

describe("Separator SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Separator />);
    expect(html).toContain("ds side-navigation-separator");
    expect(html).toContain("<hr");
  });
});
