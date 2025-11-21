/* @canonical/generator-ds 0.10.0-experimental.5 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./AnatomyDemo.js";

describe("AnatomyDemo component", () => {
  it("renders", () => {
    render(<Component>AnatomyDemo</Component>);
    expect(screen.getByText("AnatomyDemo")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>AnatomyDemo</Component>);
    expect(screen.getByText("AnatomyDemo")).toHaveClass("test-class");
  });
});
