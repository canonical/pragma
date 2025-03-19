/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FileTree } from "../../index.js";

describe("TreeView component", () => {
  it("renders the files and folders", () => {
    render(
      <FileTree>
        <FileTree.TreeView
          tree={[
            {
              type: "folder",
              name: "folder1",
              children: [
                {
                  type: "file",
                  name: "file1",
                },
              ],
            },
            {
              type: "file",
              name: "file2",
            },
          ]}
        />
      </FileTree>,
    );

    const expectedTexts = ["folder1", "file1", "file2"];
    for (const text of expectedTexts) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
