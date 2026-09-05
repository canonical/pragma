import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SecondaryNavRoot } from "../../types.js";
import Secondary from "./Secondary.js";

const root: SecondaryNavRoot = {
  key: "root",
  items: [
    { key: "group", items: [{ url: "/settings/profile", label: "Profile" }] },
  ],
};

describe("Secondary SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <Secondary title="Account settings" root={root} />,
    );
    expect(html).toContain("ds side-navigation-secondary");
    expect(html).toContain("Account settings");
    expect(html).toContain("Profile");
  });
});
