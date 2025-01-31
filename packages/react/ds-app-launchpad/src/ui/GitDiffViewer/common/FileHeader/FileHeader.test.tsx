/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { diffSample } from "ui/GitDiffViewer/GitDiffViewer.fixture.js";
import GitDiffViewer from "ui/GitDiffViewer/GitDiffViewer.js";
import { describe, expect, it } from "vitest";
import Component from "./FileHeader.js";

describe("FileHeader component", () => {
  it("applies className correctly", () => {
    const { container } = render(
      <GitDiffViewer diff={diffSample}>
        <Component className="test-class" />
      </GitDiffViewer>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });

  it("shows the file path", () => {
    render(
      <GitDiffViewer diff={diffSample}>
        <Component />
      </GitDiffViewer>,
    );
    expect(
      screen.getByText("src/components/FileTree/FileItem.module.scss"),
    ).toBeDefined();
  });

  it("shows the collapse button", () => {
    render(
      <GitDiffViewer diff={diffSample}>
        <Component showCollapse />
      </GitDiffViewer>,
    );
    expect(screen.getByLabelText("Collapse file")).toBeDefined();
  });
});
