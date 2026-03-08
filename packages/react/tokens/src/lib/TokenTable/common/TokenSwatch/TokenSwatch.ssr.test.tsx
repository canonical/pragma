import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockTokens } from "../../../mockTokens.js";
import { TokenSwatch } from "./TokenSwatch.js";

describe("TokenSwatch SSR", () => {
  it("renders without hydration errors", () => {
    const token = mockTokens.find(
      (t) => t.type === "number",
    ) as (typeof mockTokens)[number];
    const html = renderToString(<TokenSwatch token={token} />);
    expect(html).toContain("token-swatch");
  });
});
