/**
 * The legend's contract: it explains the encodings the well ACTUALLY
 * draws, it is static (so it costs the hydration argument nothing), and it
 * is furniture — floating over the canvas, never in the graph's flow.
 */

import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WellLegend from "./WellLegend.js";

describe("WellLegend", () => {
  it("names every encoding the graph uses", () => {
    render(<WellLegend />);
    const legend = screen.getByLabelText("Graph legend");
    expect(legend.textContent).toContain("abstract class");
    expect(legend.textContent).toContain("concrete class");
    // The edge direction is stated in words, not left to the arrowhead.
    expect(legend.textContent).toContain("superclass");
  });

  it("is canvas furniture — floats over the well, out of the pointer's way", () => {
    render(<WellLegend />);
    const legend = screen.getByLabelText("Graph legend");
    // The furniture class is what positions it absolutely against the
    // well and raises it to --z-plate.
    expect(legend).toHaveClass("hierarchy-furniture");
    expect(legend).toHaveClass("hierarchy-legend");
  });

  it("server-renders whole (it is static, so it holds no client state)", () => {
    const html = renderToString(<WellLegend />);
    expect(html).toContain("abstract class");
    expect(html).toContain("superclass");
  });
});
