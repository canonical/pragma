import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ItemSwitch from "./ItemSwitch.js";

describe("ItemSwitch SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <ItemSwitch label="Dark mode" defaultChecked />,
    );
    expect(html).toContain("ds side-navigation-item-switch");
    expect(html).toContain("Dark mode");
    expect(html).toContain('role="switch"');
  });
});
