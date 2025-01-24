/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./GitDiffViewer.js";
import type { AddComponentType, ParsedFile } from "./types.js";

const diff: ParsedFile = {
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
};

describe("GitDiffViewer component", () => {
  it("renders without crashing", () => {
    render(<Component diff={diff} />);
    expect(screen.getByText(diff.hunks[0].header)).toBeDefined();
  });

  it("applies basic props correctly", () => {
    const { container } = render(
      <Component
        diff={diff}
        className="test-class"
        style={{ color: "#333" }}
      />,
    );
    expect(container.firstChild).toHaveClass("test-class");
    expect(container.firstChild).toHaveStyle({ color: "#333" });
  });

  it("renders line decorations correctly", () => {
    const lineDecorations = {
      1: <div>Test</div>,
    };
    render(<Component diff={diff} lineDecorations={lineDecorations} />);
    expect(screen.getByText("Test")).toBeDefined();
  });

  it("renders AddComment component correctly", async () => {
    const AddComment: AddComponentType = ({ lineNumber, onClose }) => (
      <div>
        New comment
        {/* biome-ignore lint/a11y/useButtonType: */}
        <button onClick={onClose}>Close</button>
      </div>
    );

    const { container } = render(
      <Component diff={diff} AddComment={AddComment} />,
    );
    const gutter = container.querySelector(".diff-gutter[tabindex='0']");
    expect(gutter).toBeDefined();
    if (!gutter) return;
    fireEvent.click(gutter);
    screen.getByText("New comment");
  });
});
