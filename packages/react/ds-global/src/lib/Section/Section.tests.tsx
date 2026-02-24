import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Section.js";

describe("Section component", () => {
  it("renders", () => {
    render(<Component>Section</Component>);
    expect(screen.getByText("Section")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Section</Component>);
    expect(screen.getByText("Section")).toHaveClass("test-class");
  });
});
