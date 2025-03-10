/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Separator.js";

describe("ToolbarSeparator component", () => {
  it("applies className", () => {
    const { container } = render(<Component className={"test-class"} />);
    expect(container.firstChild).toHaveClass("test-class");
  });
});
