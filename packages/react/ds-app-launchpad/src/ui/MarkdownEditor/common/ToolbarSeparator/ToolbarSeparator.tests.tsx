/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToolbarSeparator from "./ToolbarSeparator.js";

describe("ToolbarSeparator component", () => {
  it("applies className", () => {
    const { container } = render(<ToolbarSeparator className={"test-class"} />);
    expect(container.firstChild).toHaveClass("test-class");
  });
});
