/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useContext, useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import parseGitDiff from "../utils/git-diff-parser.js";
import { DiffViewerContext, DiffViewerProvider } from "./DiffViewerContext.js";
import type { DiffViewerContextType } from "./types.js";

const TEST_DIFF_STRING = `diff --git a/file.txt b/file.txt
@@ -1,3 +1,3 @@
 line1
-line2
+updated line2
 line3`;
const TEST_DIFF_FILE = parseGitDiff(TEST_DIFF_STRING)[0];

const TestConsumer = ({ testLine }: { testLine?: number }) => {
  const context = useContext(DiffViewerContext) as DiffViewerContextType;
  const [inputValue, setInputValue] = useState("");

  const handleParse = () => {
    const parsed = parseGitDiff(inputValue);
    context.setDiff(parsed[0]);
  };

  return (
    <div>
      <div data-testid="isCollapsed">{context.isCollapsed.toString()}</div>
      <button
        data-testid="addComment"
        type="button"
        onClick={() => context.toggleAddCommentLocation(testLine || 0)}
      >
        Toggle Comment
      </button>

      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        data-testid="diff-input"
      />

      <button onClick={handleParse} type="button">
        Parse Diff
      </button>
      <div data-testid="diff-output">
        {context.diff?.hunks.map((hunk) =>
          hunk.lines.map((line) => line.content).join("\n"),
        )}
      </div>
    </div>
  );
};

describe("DiffViewerProvider", () => {
  it("should initialize with default collapsed state", () => {
    render(
      <DiffViewerProvider>
        <TestConsumer />
      </DiffViewerProvider>,
    );

    expect(screen.getByTestId("isCollapsed").textContent).toBe("false");
  });

  it("should respect defaultCollapsed prop", () => {
    render(
      <DiffViewerProvider collapsed>
        <TestConsumer />
      </DiffViewerProvider>,
    );

    expect(screen.getByTestId("isCollapsed").textContent).toBe("true");
  });

  it("should handle multiple comment locations", async () => {
    const TestMultiConsumer = () => {
      const context = useContext(DiffViewerContext) as DiffViewerContextType;
      // biome-ignore lint/correctness/useExhaustiveDependencies:
      useEffect(() => {
        context.setLineDecorations({
          1: <div>Comment 1</div>,
          2: <div>Comment 2</div>,
        });
      }, []);
      return (
        <div>
          {/* biome-ignore lint/a11y/useButtonType: */}
          <button onClick={() => context.toggleAddCommentLocation(1)}>
            Line 1
          </button>
          {/* biome-ignore lint/a11y/useButtonType: */}
          <button onClick={() => context.toggleAddCommentLocation(2)}>
            Line 2
          </button>
        </div>
      );
    };

    render(
      <DiffViewerProvider>
        <TestMultiConsumer />
      </DiffViewerProvider>,
    );

    fireEvent.click(screen.getByText("Line 1"));
    fireEvent.click(screen.getByText("Line 2"));
    waitFor(() => {
      expect(screen.getByText("Comment 1")).toBeDefined();
      expect(screen.getByText("Comment 2")).toBeDefined();
    });
  });

  it("should update diff content", async () => {
    render(
      <DiffViewerProvider>
        <TestConsumer />
      </DiffViewerProvider>,
    );

    const input = screen.getByTestId("diff-input");
    const parseButton = screen.getByText("Parse Diff");

    fireEvent.change(input, { target: { value: TEST_DIFF_STRING } });
    fireEvent.click(parseButton);

    const output = screen.getByTestId("diff-output").textContent;
    expect(output).toContain("line1");
    expect(output).toContain("updated line2");
    expect(output).toContain("line3");
  });
});
