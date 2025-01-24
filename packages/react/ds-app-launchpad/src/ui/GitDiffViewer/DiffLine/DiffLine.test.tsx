/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    render(<Component {...addLine} wrapLines />);

    expect(screen.getByText("add line")).toBeDefined();
  });

  it("applies basic props correctly", () => {
    const { container } = render(
      <Component
        {...addLine}
        wrapLines
        className="test-class"
        style={{ color: "#333" }}
      />,
    );
    expect(container.firstChild).toHaveClass("test-class");
    expect(container.firstChild).toHaveStyle({ color: "#333" });
  });

  it("renders hunk header correctly", () => {
    render(<Component {...hunkLine} wrapLines />);
    expect(screen.getByText(hunkLine.hunkHeader)).toBeDefined();
  });

  it("has no interactive gutter on hunks", () => {
    const { container } = render(
      <Component {...hunkLine} wrapLines onCommentOpen={() => {}} />,
    );
    const interactiveGutter = container.querySelector(
      ".diff-gutter[tabindex='0']",
    );
    expect(interactiveGutter).toBeNull();
  });

  it("has interactive gutter on content lines", () => {
    const onCommentOpen = vi.fn();
    const { container } = render(
      <Component {...addLine} wrapLines onCommentOpen={onCommentOpen} />,
    );
    const interactiveGutter = container.querySelector(
      ".diff-gutter[tabindex='0']",
    );
    expect(interactiveGutter).not.toBeNull();
    if (!interactiveGutter) return;
    fireEvent.click(interactiveGutter);
    expect(onCommentOpen).toHaveBeenCalled();
  });
});
