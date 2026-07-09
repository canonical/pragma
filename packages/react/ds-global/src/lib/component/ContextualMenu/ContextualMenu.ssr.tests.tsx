import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuItem } from "./types.js";

const groups: MenuItem[] = [
  {
    key: "g",
    label: "Edit",
    items: [{ key: "cut", label: "Cut", url: "#cut" }],
  },
];

describe("ContextualMenu SSR", () => {
  it("renders the trigger button on the server without throwing", () => {
    const html = renderToString(
      <ContextualMenu trigger="Actions" groups={groups} />,
    );

    expect(html).toContain("ds contextual-menu");
    expect(html).toContain("Actions");
    expect(html).toContain('aria-haspopup="menu"');
  });

  it("renders the menu closed and inert on the server", () => {
    const html = renderToString(
      <ContextualMenu trigger="Actions" groups={groups} />,
    );

    // The full APG menu is JS-required; on the server it renders a closed,
    // inert trigger with an aria-hidden menu, never a half-wired keyboard trap.
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-hidden="true"');
  });
});
