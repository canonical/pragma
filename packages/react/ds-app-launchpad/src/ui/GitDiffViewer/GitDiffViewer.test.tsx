/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CodeDiffViewerChildrenRender } from "./CodeDiffViewer/types.js";
import Component from "./GitDiffViewer.js";
import type { DiffFile } from "./types.js";

const diff: DiffFile = {
  hunks: [
    {
      header: "@@ -17,9 +17,13 @@",
      lines: [
        {
          content: "background-color: transparent;",
          type: "context",
        },
      ],
      newLines: 1,
      oldLines: 1,
      newStart: 1,
      oldStart: 1,
    },
  ],
  newPath: "b/src/components/FileTree/FileItem.module.scss",
  oldPath: "a/src/components/FileTree/FileItem.module.scss",
  fileChangeState: "modified",
};

describe("GitDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <Component diff={diff}>
        <Component.FileHeader />
        <Component.CodeDiff />
      </Component>,
    );
    expect(screen.getByText(diff.hunks[0].header)).toBeDefined();
  });

  it("applies basic props correctly", () => {
    const { container } = render(
      <Component diff={diff} className="test-class" style={{ color: "#333" }}>
        <Component.FileHeader />
        <Component.CodeDiff />
      </Component>,
    );
    expect(container.firstChild).toHaveClass("test-class");
    expect(container.firstChild).toHaveStyle({ color: "#333" });
  });

  it("renders line decorations correctly", () => {
    const lineDecorations = {
      1: <div>Test</div>,
    };
    render(
      <Component diff={diff} lineDecorations={lineDecorations}>
        <Component.FileHeader />
        <Component.CodeDiff />
      </Component>,
    );
    expect(screen.getByText("Test")).toBeDefined();
  });

  it("renders AddComment component correctly", async () => {
    const addComment: CodeDiffViewerChildrenRender = (lineNumber, onClose) => (
      <div>
        New comment
        {/* biome-ignore lint/a11y/useButtonType: */}
        <button onClick={onClose}>Close</button>
      </div>
    );

    const { container } = render(
      <Component diff={diff}>
        <Component.FileHeader />
        <Component.CodeDiff>{addComment}</Component.CodeDiff>
      </Component>,
    );
    const gutter = container.querySelector(".diff-gutter[tabindex='0']");
    expect(gutter).toBeDefined();
    if (!gutter) return;
    fireEvent.click(gutter);
    screen.getByText("New comment");
  });
});
