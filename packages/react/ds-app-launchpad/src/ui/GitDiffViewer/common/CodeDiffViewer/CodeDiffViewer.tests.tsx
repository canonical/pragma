/* @canonical/generator-canonical-ds 0.0.1 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as fixtures from "../../fixtures.js";
import Provider from "../../Provider.js";
import Component from "./CodeDiffViewer.js";

describe("CodeDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <Provider diff={fixtures.diffExample}>
        <Component />
      </Provider>,
    );
    expect(
      screen.getByText(fixtures.diffExample.hunks[0].header),
    ).toBeDefined();
  });

  it("applies className correctly", () => {
    const { container } = render(
      <Provider diff={fixtures.diffExample}>
        <Component className="test-class" />
      </Provider>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });

  it("renders annotated diff line correctly", () => {
    render(
      <Provider
        diff={fixtures.diffExample}
        lineDecorations={fixtures.commentExample}
      >
        <Component />
      </Provider>,
    );
    expect(screen.getByText("Test comment")).toBeDefined();
  });

  it("renders annotated diff line based on diff line number instead of hunk line number", () => {
    render(
      <Provider
        diff={fixtures.diffExample}
        lineDecorations={fixtures.commentExample}
      >
        <Component />
      </Provider>,
    );
    const tableRowBeforeComment = screen
      .getByText("Test comment")
      .closest("tr")?.previousSibling;
    const lineNumber = tableRowBeforeComment?.textContent;
    expect(lineNumber).toMatch(/^17.*$/);
  });

  it("calls onLineClick with the correct arguments", () => {
    const onLineClick = vi.fn();
    render(
      <Provider diff={fixtures.diffExample}>
        <Component onLineClick={onLineClick} />
      </Provider>,
    );

    const lineToClick = screen.getAllByText(/^17.*$/)[0].closest("td");
    expect(lineToClick).toBeDefined();
    if (!lineToClick) return;
    fireEvent.click(lineToClick);

    expect(onLineClick).toHaveBeenCalledWith({
      hunkLineNumber: 17,
      diffLineNumber: 6,
    });
  });
});
