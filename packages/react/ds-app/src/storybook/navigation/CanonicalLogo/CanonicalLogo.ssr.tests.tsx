import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CanonicalLogo from "./CanonicalLogo.js";

describe("CanonicalLogo SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<CanonicalLogo />);
    expect(html).toContain("ds canonical-logo");
    expect(html).toContain("Canonical");
  });
});
