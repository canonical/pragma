/* @canonical/generator-ds 0.10.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./SkipLink.js";

describe("SkipLink component", () => {
  it("renders", () => {
    render(<Component>SkipLink</Component>);
    expect(screen.getByText("SkipLink")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>SkipLink</Component>);
    expect(screen.getByText("SkipLink")).toHaveClass("test-class");
  });
});
