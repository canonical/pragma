import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContextSwitcher from "./ContextSwitcher.js";
import type { ContextSwitcherItem } from "./types.js";

const contexts: ContextSwitcherItem[] = [{ key: "acme", name: "Acme Corp" }];

describe("ContextSwitcher SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <ContextSwitcher currentContext={contexts[0]} contexts={contexts} />,
    );
    expect(html).toContain("ds side-navigation-context-switcher");
    expect(html).toContain("Acme Corp");
  });
});
