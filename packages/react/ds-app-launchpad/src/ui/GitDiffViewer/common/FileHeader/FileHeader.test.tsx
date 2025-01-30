/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import GitDiffViewer from "ui/GitDiffViewer/GitDiffViewer.js";
import { describe, expect, it } from "vitest";
import type { DiffFile } from "../../types.js";
import Component from "./FileHeader.js";

const SIMPLE_DIFF: DiffFile = {
  newPath: "src/components/FileTree/FileItem.module.scss",
  fileChangeState: "modified",
  oldPath: "old-path",
  hunks: [],
} as const;

describe("FileHeader component", () => {
  it("applies className correctly", () => {
    const { container } = render(
      <GitDiffViewer diff={SIMPLE_DIFF}>
        <Component className="test-class" />
      </GitDiffViewer>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });

  it("shows the file path", () => {
    render(
      <GitDiffViewer diff={SIMPLE_DIFF}>
        <Component />
      </GitDiffViewer>,
    );
    expect(
      screen.getByText("src/components/FileTree/FileItem.module.scss"),
    ).toBeDefined();
  });

  it("shows the collapse button", () => {
    render(
      <GitDiffViewer diff={SIMPLE_DIFF}>
        <Component showCollapse />
      </GitDiffViewer>,
    );
    expect(screen.getByLabelText("Collapse file")).toBeDefined();
  });
});
