import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuEntry } from "./types.js";

const items: MenuEntry[] = [
  { key: "cut", label: "Cut", url: "#cut" },
  { type: "separator" },
  { key: "zoom", label: "Zoom", url: "#zoom" },
];

describe("ContextualMenu SSR", () => {
  it("renders the trigger button on the server without throwing", () => {
    const html = renderToString(
      <ContextualMenu trigger="Actions" items={items} />,
    );

    expect(html).toContain("ds contextual-menu");
    expect(html).toContain("Actions");
    expect(html).toContain('aria-haspopup="menu"');
    // The separator renders as a plain <hr> divider on the server too.
    expect(html).toContain('<hr class="separator"');
  });

  it("renders the menu closed and inert on the server", () => {
    const html = renderToString(
      <ContextualMenu trigger="Actions" items={items} />,
    );

    // The full APG menu is JS-required; on the server it renders a closed,
    // inert trigger with an aria-hidden menu, never a half-wired keyboard trap.
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-hidden="true"');
  });
});
