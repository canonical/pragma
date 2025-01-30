/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import GitDiffViewer from "ui/GitDiffViewer/GitDiffViewer.js";
import type { DiffFile } from "ui/GitDiffViewer/types.js";
import { describe, expect, it } from "vitest";
import Component from "./CodeDiffViewer.js";

const BASIC_DIFF: DiffFile = {
  newPath: "new",
  oldPath: "old",
  fileChangeState: "modified",
  hunks: [
    {
      header: "@@ -1,1 +1,1 @@",
      lines: [{ content: "line 1", type: "add" }],
      newLines: 1,
      newStart: 1,
      oldLines: 1,
      oldStart: 1,
    },
  ],
};

describe("CodeDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <GitDiffViewer diff={BASIC_DIFF}>
        <Component />
      </GitDiffViewer>,
    );
    expect(screen.getByText("@@ -1,1 +1,1 @@")).toBeDefined();
  });

  it("applies className correctly", () => {
    const { container } = render(
      <GitDiffViewer diff={BASIC_DIFF}>
        <Component className="test-class" />
      </GitDiffViewer>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });
});
