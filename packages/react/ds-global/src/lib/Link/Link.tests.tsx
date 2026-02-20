import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../Button/index.js";
import Component from "./Link.js";

describe("Link component", () => {
  it("renders", () => {
    render(<Component>Link</Component>);
    expect(screen.getByText("Link")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Link</Component>);
    expect(screen.getByText("Link")).toHaveClass("test-class");
  });

  describe("polymorphic as prop", () => {
    it("functions as a button", () => {
      const onClick = vi.fn();
      render(
        <Component as={Button} onClick={onClick}>
          Link button
        </Component>,
      );
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Link button");
      button.click();
      expect(onClick).toHaveBeenCalled();
    });
  });
});
