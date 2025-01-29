/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffViewerProvider } from "../DiffViewerContext/DiffViewerContext.js";
import Component from "./CodeDiffViewer.js";

describe("CodeDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <DiffViewerProvider>
        <Component />
      </DiffViewerProvider>,
    );
    expect(screen.getByText("No diff available")).toBeDefined();
  });

  it("applies className correctly", () => {
    const { container } = render(
      <DiffViewerProvider>
        <Component className="test-class" />
      </DiffViewerProvider>,
    );
    expect(container.firstChild).toHaveClass("test-class");
  });
});
