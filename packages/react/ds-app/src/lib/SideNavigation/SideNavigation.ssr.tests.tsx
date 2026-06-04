import type { Item } from "@canonical/ds-types";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SideNavigation from "./SideNavigation.js";

const root: Item = {
  key: "root",
  items: [{ url: "/machines", label: "Machines" }],
};

describe("SideNavigation SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<SideNavigation root={root} />);
    expect(html).toContain("Machines");
    expect(html).toContain("ds side-navigation");
  });
});
