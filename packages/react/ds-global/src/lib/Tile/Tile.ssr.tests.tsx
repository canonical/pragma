import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Tile from "./Tile.js";

describe("Tile SSR", () => {
  it("renders without errors on server", () => {
    const html = renderToString(
      <Tile>
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    expect(html).toContain("Header");
    expect(html).toContain("Content");
    expect(html).toContain('class="ds tile"');
  });

  it("renders subcomponents with correct classes on server", () => {
    const html = renderToString(
      <Tile>
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    expect(html).toContain('class="ds tile-header"');
    expect(html).toContain('class="ds tile-content"');
  });
});
