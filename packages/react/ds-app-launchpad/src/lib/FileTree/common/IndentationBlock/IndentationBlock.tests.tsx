/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./IndentationBlock.js";

describe("IndentationBlock component", () => {
  it("renders", () => {
    const { container } = render(<Component depth={2} />);
    expect(container.querySelectorAll(".indent-block")).toHaveLength(2);
  });

  it("applies className and styles", () => {
    const { container } = render(
      <Component
        className={"test-class"}
        style={{ color: "#333" }}
        depth={1}
      />,
    );
    expect(container.querySelector(".ds.indentation-block")).toHaveClass(
      "test-class",
    );
    expect(container.querySelector(".ds.indentation-block")).toHaveStyle({
      color: "#333",
    });
  });
});
