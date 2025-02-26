/* @canonical/generator-ds 0.9.0-experimental.4 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Toolbar from "./Toolbar.js";

describe("Toolbar", () => {
  it("renders correctly with basic props", () => {
    render(
      <Toolbar
        id="test-toolbar"
        className="custom-class"
        style={{ width: "500px" }}
        label="Test Toolbar"
      >
        <button type="button">Button 1</button>
      </Toolbar>,
    );

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute("id", "test-toolbar");
    expect(toolbar).toHaveClass("ds");
    expect(toolbar).toHaveClass("toolbar");
    expect(toolbar).toHaveClass("custom-class");
    expect(toolbar).toHaveStyle({ width: "500px" });
    expect(toolbar).toHaveAttribute("aria-label", "Test Toolbar");
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("renders children correctly", () => {
    render(
      <Toolbar label="Test Toolbar">
        <button type="button">Button 1</button>
        <button type="button">Button 2</button>
      </Toolbar>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Button 1");
    expect(buttons[1]).toHaveTextContent("Button 2");
  });

  it("sets correct tabindex values on buttons", () => {
    render(
      <Toolbar label="Test Toolbar">
        <button type="button">Button 1</button>
        <button type="button">Button 2</button>
        <button type="button">Button 3</button>
      </Toolbar>,
    );

    const buttons = screen.getAllByRole("button");

    // First button should have tabindex="0"
    expect(buttons[0]).toHaveAttribute("tabindex", "0");

    // All other buttons should have tabindex="-1"
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");
    expect(buttons[2]).toHaveAttribute("tabindex", "-1");
  });

  it("handles non-button children correctly", () => {
    render(
      <Toolbar label="Mixed Children">
        <button type="button">Button 1</button>
        <div>Not a button</div>
        <button type="button">Button 2</button>
      </Toolbar>,
    );

    const toolbar = screen.getByRole("toolbar");
    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");
    expect(toolbar.textContent).toContain("Not a button");
  });

  it("updates tabindex if children change", async () => {
    // First render with initial children
    const { rerender } = render(
      <Toolbar label="Dynamic Toolbar">
        <button type="button">Button 1</button>
        <button type="button">Button 2</button>
      </Toolbar>,
    );

    let buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");

    // Rerender with different children
    rerender(
      <Toolbar label="Dynamic Toolbar">
        <button type="button">New Button 1</button>
        <button type="button">New Button 2</button>
        <button type="button">New Button 3</button>
      </Toolbar>,
    );

    buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");
    expect(buttons[2]).toHaveAttribute("tabindex", "-1");
  });
});
