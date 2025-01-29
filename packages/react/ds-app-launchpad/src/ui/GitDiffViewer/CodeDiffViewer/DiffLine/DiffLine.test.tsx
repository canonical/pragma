/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen } from "@testing-library/react";
import { DiffViewerProvider } from "ui/GitDiffViewer/DiffViewerContext/DiffViewerContext.js";
import { describe, expect, it, vi } from "vitest";
import CodeDiffViewer from "../CodeDiffViewer.js";
import Component from "./DiffLine.js";
import type { DiffContentLine, DiffHunkLine } from "./types.js";

const addLine: DiffContentLine = {
  type: "add",
  lineNum1: "+",
  lineNum2: 2,
  content: "add line",
} as const;

const hunkLine: DiffHunkLine = {
  type: "hunk",
  hunkHeader: "@@ -17,9 +17,13 @@",
} as const;

describe("DiffLine component", () => {
  it("renders without crashing", () => {
    render(
      <DiffViewerProvider>
        <Component {...addLine} />
      </DiffViewerProvider>,
    );

    expect(screen.getByText("add line")).toBeDefined();
  });

  it("applies basic props correctly", () => {
    const { container } = render(
      <DiffViewerProvider>
        <Component
          {...addLine}
          className="test-class"
          style={{ color: "#333" }}
        />
      </DiffViewerProvider>,
    );
    expect(container.firstChild).toHaveClass("test-class");
    expect(container.firstChild).toHaveStyle({ color: "#333" });
  });

  it("renders hunk header correctly", () => {
    render(
      <DiffViewerProvider wrapLines>
        <Component {...hunkLine} />
      </DiffViewerProvider>,
    );
    expect(screen.getByText(hunkLine.hunkHeader)).toBeDefined();
  });

  it("has no interactive gutter on hunks", () => {
    const { container } = render(
      <DiffViewerProvider wrapLines>
        <CodeDiffViewer>
          {/* Having an add comment rendered here will result in having interactive mode enable */}
          {() => <></>}
        </CodeDiffViewer>
        <Component {...hunkLine} />
      </DiffViewerProvider>,
    );
    const interactiveGutter = container.querySelector(
      ".diff-gutter[tabindex='0']",
    );
    expect(interactiveGutter).toBeNull();
  });
});
