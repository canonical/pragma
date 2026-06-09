import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SideNavigation from "./SideNavigation.js";
import type { NavItem } from "./types.js";

// Level-1 group (unlabelled) holding a level-2 navigable link.
const root: NavItem = {
  key: "root",
  items: [{ key: "main", items: [{ url: "/machines", label: "Machines" }] }],
};

describe("SideNavigation SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<SideNavigation root={root} />);
    expect(html).toContain("Machines");
    expect(html).toContain("ds side-navigation");
  });
});
