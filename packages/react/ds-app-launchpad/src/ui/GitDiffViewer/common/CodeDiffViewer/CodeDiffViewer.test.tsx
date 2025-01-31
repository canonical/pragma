/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { diffSample } from "ui/GitDiffViewer/GitDiffViewer.fixture.js";
import GitDiffViewer from "ui/GitDiffViewer/GitDiffViewer.js";
import { describe, expect, it } from "vitest";
import Component from "./CodeDiffViewer.js";

describe("CodeDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <GitDiffViewer diff={diffSample}>
        <Component />
      </GitDiffViewer>,
    );
    expect(screen.getByText("@@ -17,9 +17,13 @@")).toBeDefined();
  });

  it("applies className correctly", () => {
    const { container } = render(
      <GitDiffViewer diff={diffSample}>
        <Component className="test-class" />
      </GitDiffViewer>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });
});
