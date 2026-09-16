/**
 * Without scripting there is nothing to choose a renderer with, so the server
 * draws every renderer in turn, each in a region named for it, and offers no
 * choice that would do nothing.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RendererSwitch from "./RendererSwitch.js";
import type { RendererChoice } from "./types.js";

const renderers: readonly RendererChoice[] = [
  { id: "table", label: "Table", content: <p>the table</p> },
  { id: "cards", label: "Cards", content: <p>the cards</p> },
];

const tree = <RendererSwitch label="Show machines as" renderers={renderers} />;

describe("RendererSwitch on the server", () => {
  it("draws every renderer in turn, each named, and offers no choice", () => {
    const markup = renderToString(tree);
    expect(markup).toContain('aria-label="Table"');
    expect(markup).toContain('aria-label="Cards"');
    expect(markup.indexOf("the table")).toBeLessThan(
      markup.indexOf("the cards"),
    );
    expect(markup).not.toContain("<select");
  });
});
