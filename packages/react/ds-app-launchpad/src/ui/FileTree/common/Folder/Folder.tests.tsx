/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FileTree } from "../../index.js";

describe("File component", () => {
  it("renders", () => {
    render(
      <FileTree>
        <FileTree.Folder name="assets" />
      </FileTree>,
    );
    expect(screen.getByText("assets")).toBeInTheDocument();
  });

  it("applies className and styles", () => {
    const { container } = render(
      <FileTree className={"test-class"}>File</FileTree>,
    );
    render(
      <FileTree>
        <FileTree.Folder
          name="assets"
          className={"test-class"}
          style={{ color: "#333" }}
        />
      </FileTree>,
    );
    waitFor(() => {
      expect(container.querySelector(".ds.node")).toHaveClass("test-class");
      expect(container.querySelector(".ds.node")).toHaveStyle({
        color: "#333",
      });
    });
  });
});
