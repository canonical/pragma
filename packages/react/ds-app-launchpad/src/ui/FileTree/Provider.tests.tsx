/* @canonical/generator-ds 0.9.0-experimental.1 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FileTree } from "./index.js";

describe("FileTree component", () => {
  it("renders", () => {
    render(<FileTree>FileTree</FileTree>);
    expect(screen.getByText("FileTree")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <FileTree className={"test-class"}>FileTree</FileTree>,
    );
    expect(container.querySelector(".test-class")).toBeInTheDocument();
  });
});
