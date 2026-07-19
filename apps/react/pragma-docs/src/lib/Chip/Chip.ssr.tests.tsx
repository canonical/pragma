import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Chip from "./Chip.js";
import ChipLegend from "./Legend.js";

describe("Chip SSR", () => {
  it("server-renders the text form as a span", () => {
    const html = renderToString(
      <Chip kind="component" label="Button" uri="ds:global.component.button" />,
    );
    expect(html).toContain("Button");
    expect(html).toContain("<span");
    expect(html).not.toContain("<a");
  });

  it("server-renders the linked form as an anchor", () => {
    const html = renderToString(
      <Chip
        href="/components/button"
        kind="component"
        label="Button"
        uri="ds:global.component.button"
      />,
    );
    expect(html).toContain('href="/components/button"');
    expect(html).toContain("<a");
  });

  it("server-renders the legend without browser APIs", () => {
    const html = renderToString(<ChipLegend />);
    expect(html).toContain("chip-legend");
  });
});
