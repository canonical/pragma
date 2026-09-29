import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Group from "./Group.js";

describe("Group SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <Group label="Hardware">
        <li>Machines</li>
      </Group>,
    );
    expect(html).toContain("ds side-navigation-group");
    expect(html).toContain("Hardware");
    expect(html).toContain("Machines");
  });
});
