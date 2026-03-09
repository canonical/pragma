import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockTokens } from "../mockTokens.js";
import { TokenTable } from "./TokenTable.js";

describe("TokenTable SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <TokenTable tokens={mockTokens.slice(0, 1)} title="Test content" />,
    );
    expect(html).toContain("Test content");
    expect(html).toContain("token-table");
  });
});
