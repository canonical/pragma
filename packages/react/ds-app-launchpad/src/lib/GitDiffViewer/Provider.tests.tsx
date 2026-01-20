/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CodeDiffViewerAddComment } from "./common/CodeDiffViewer/types.js";
import * as fixtures from "./fixtures.js";
import { GitDiffViewer } from "./index.js";

describe("GitDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <GitDiffViewer diff={fixtures.diffExample}>
        <GitDiffViewer.FileHeader />
        <GitDiffViewer.CodeDiffViewer />
      </GitDiffViewer>,
    );
    expect(
      screen.getByText(fixtures.diffExample.hunks[0].header),
    ).toBeDefined();
  });

  it("applies basic props correctly", () => {
    const { container } = render(
      <GitDiffViewer
        diff={fixtures.diffExample}
        className="test-class"
        style={{ color: "#333" }}
      >
        <GitDiffViewer.FileHeader />
        <GitDiffViewer.CodeDiffViewer />
      </GitDiffViewer>,
    );
    expect(container.firstChild).toHaveClass("test-class");
    expect(container.firstChild).toHaveStyle({ color: "#333" });
  });

  it("renders line decorations correctly", () => {
    const lineDecorations = {
      17: <div>Test</div>,
    };
    render(
      <GitDiffViewer
        diff={fixtures.diffExample}
        lineDecorations={lineDecorations}
      >
        <GitDiffViewer.FileHeader />
        <GitDiffViewer.CodeDiffViewer />
      </GitDiffViewer>,
    );
    expect(screen.getByText("Test")).toBeDefined();
  });

  it("renders AddComment component correctly", async () => {
    const AddComment: CodeDiffViewerAddComment = ({ onClose }) => (
      <div>
        New comment
        <button onClick={onClose} type="button">
          Close
        </button>
      </div>
    );

    const { container } = render(
      <GitDiffViewer diff={fixtures.diffExample}>
        <GitDiffViewer.FileHeader />
        <GitDiffViewer.CodeDiffViewer AddComment={AddComment} />
      </GitDiffViewer>,
    );
    const gutter = container.querySelector(".diff-gutter[tabindex='0']");
    expect(gutter).toBeDefined();
    if (!gutter) return;
    fireEvent.click(gutter);
    screen.getByText("New comment");
  });
});
