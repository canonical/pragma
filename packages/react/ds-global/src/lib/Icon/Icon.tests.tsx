import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Icon.js";

describe("Icon component", () => {
  it("renders", () => {
    render(<Component icon={"user"} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component icon={"user"} className={"test-class"} />);
    expect(screen.getByRole("img")).toHaveClass("test-class");
  });
});
