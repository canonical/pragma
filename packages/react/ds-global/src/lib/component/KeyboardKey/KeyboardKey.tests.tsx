import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KeyboardKey from "./KeyboardKey.js";

describe("KeyboardKey", () => {
  it("renders the label for a key", () => {
    render(<KeyboardKey keyValue="enter" />);
    expect(screen.getByText("↵")).toBeInTheDocument();
  });

  it("passes through additional props", () => {
    render(<KeyboardKey keyValue="ctrl" data-testid="test-component" />);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
