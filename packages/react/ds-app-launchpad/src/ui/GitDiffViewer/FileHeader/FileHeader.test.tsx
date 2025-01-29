/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffViewerProvider } from "../DiffViewerContext/DiffViewerContext.js";
import type { DiffFile } from "../types.js";
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
      <DiffViewerProvider diff={SIMPLE_DIFF}>
        <Component className="test-class" />
      </DiffViewerProvider>,
    );
    expect(container.firstChild).toHaveClass("test-class");
  });

  it("shows the file path", () => {
    render(
      <DiffViewerProvider diff={SIMPLE_DIFF}>
        <Component />
      </DiffViewerProvider>,
    );
    expect(
      screen.getByText("src/components/FileTree/FileItem.module.scss"),
    ).toBeDefined();
  });

  it("shows the collapse button", () => {
    render(
      <DiffViewerProvider diff={SIMPLE_DIFF}>
        <Component showCollapse />
      </DiffViewerProvider>,
    );
    expect(screen.getByLabelText("Collapse file")).toBeDefined();
  });
});
