/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { diffSample } from "ui/GitDiffViewer/GitDiffViewer.fixture.js";
import GitDiffViewer from "ui/GitDiffViewer/GitDiffViewer.js";
import { describe, expect, it } from "vitest";
import Component from "./DiffLine.js";
import type { DiffContentLine, DiffHunkLine } from "./types.js";

const ADD_LINE: DiffContentLine = {
  type: "add",
  lineNum1: "+",
  lineNum2: 2,
  content: "add line",
} as const;

const HUNK_LINE: DiffHunkLine = {
  type: "hunk",
  hunkHeader: "@@ -17,9 +17,13 @@",
} as const;

describe("DiffLine component", () => {
  it("renders without crashing", () => {
    render(
      <GitDiffViewer diff={diffSample}>
        <table>
          <tbody>
            <Component {...ADD_LINE} />
          </tbody>
        </table>
      </GitDiffViewer>,
    );

    expect(screen.getByText("add line")).toBeDefined();
  });

  it("applies basic props correctly", () => {
    const { container } = render(
      <GitDiffViewer diff={diffSample}>
        <table>
          <tbody data-testid="diff-line">
            <Component
              {...ADD_LINE}
              className="test-class"
              style={{ color: "#333" }}
            />
          </tbody>
        </table>
      </GitDiffViewer>,
    );
    expect(container.querySelector("[data-testid=diff-line] > tr")).toHaveClass(
      "test-class",
    );
    expect(container.querySelector("[data-testid=diff-line] > tr")).toHaveStyle(
      { color: "#333" },
    );
  });

  it("renders hunk header correctly", () => {
    render(
      <GitDiffViewer diff={diffSample} wrapLines>
        <table>
          <tbody>
            <Component {...HUNK_LINE} />
          </tbody>
        </table>
      </GitDiffViewer>,
    );
    expect(screen.getByText(HUNK_LINE.hunkHeader)).toBeDefined();
  });

  it("has no interactive gutter on hunks", () => {
    const { container } = render(
      <GitDiffViewer diff={diffSample} wrapLines>
        <GitDiffViewer.CodeDiff>
          {/* Having an add comment rendered here will result in having interactive mode enable */}
          {() => <></>}
        </GitDiffViewer.CodeDiff>
        <table>
          <tbody>
            <Component {...HUNK_LINE} />
          </tbody>
        </table>
      </GitDiffViewer>,
    );
    const interactiveGutter = container.querySelector(".diff-gutter.hunk");
    expect(interactiveGutter).toBeDefined();
    if (!interactiveGutter) return;
    expect(interactiveGutter.getAttribute("tabindex")).toBeNull();
  });
});
