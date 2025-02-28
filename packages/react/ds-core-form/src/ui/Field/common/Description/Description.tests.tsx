/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Description.js";

describe("Description component", () => {
  it("renders", () => {
    render(<Component>Description</Component>);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Description</Component>);
    expect(screen.getByText("Description")).toHaveClass("test-class");
  });
});