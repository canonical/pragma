import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ItemButton from "./ItemButton.js";

describe("ItemButton SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<ItemButton>Log out</ItemButton>);
    expect(html).toContain("ds side-navigation-item-button");
    expect(html).toContain("Log out");
    expect(html).toContain('type="button"');
  });
});
