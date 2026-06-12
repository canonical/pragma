import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Button.js";

describe("Button component", () => {
  it("renders", () => {
    render(<Component>Hello world!</Component>);
    expect(screen.getByText("Hello world!")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className="test-class">Hello world!</Component>);
    expect(screen.getByText("Hello world!")).toHaveClass("test-class");
  });

  it("does not set aria-label for non-string children", () => {
    render(
      <Component>
        <span>Save</span>
      </Component>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("aria-label");
  });
});
