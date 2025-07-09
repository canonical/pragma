/* @canonical/generator-ds 0.9.0-experimental.4 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Toolbar from "./Toolbar.js";

describe("Toolbar", () => {
  // ... existing tests ...

  it("handles ArrowLeft key navigation", () => {
    render(
      <Toolbar label="Test Toolbar">
        <button type="button">Button 1</button>
        <button type="button" data-testid="middle-button">
          Button 2
        </button>
        <button type="button">Button 3</button>
      </Toolbar>,
    );

    const middleButton = screen.getByTestId("middle-button");
    middleButton.focus();
    fireEvent.keyDown(middleButton, { key: "ArrowLeft" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveFocus();
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(middleButton).toHaveAttribute("tabindex", "-1");
  });

  it("handles ArrowRight key navigation", () => {
    render(
      <Toolbar label="Test Toolbar">
        <button type="button">Button 1</button>
        <button type="button" data-testid="middle-button">
          Button 2
        </button>
        <button type="button">Button 3</button>
      </Toolbar>,
    );

    const middleButton = screen.getByTestId("middle-button");
    middleButton.focus();
    fireEvent.keyDown(middleButton, { key: "ArrowRight" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[2]).toHaveFocus();
    expect(buttons[2]).toHaveAttribute("tabindex", "0");
    expect(middleButton).toHaveAttribute("tabindex", "-1");
  });

  it("wraps focus when at boundaries", () => {
    render(
      <Toolbar label="Test Toolbar">
        <button type="button">Button 1</button>
        <button type="button">Button 2</button>
      </Toolbar>,
    );

    const buttons = screen.getAllByRole("button");

    // Test right boundary
    buttons[1].focus();
    fireEvent.keyDown(buttons[1], { key: "ArrowRight" });
    expect(buttons[0]).toHaveFocus();

    // Test left boundary
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowLeft" });
    expect(buttons[1]).toHaveFocus();
  });

  it("skips non-button elements during navigation", () => {
    render(
      <Toolbar label="Test Toolbar">
        <button type="button">Button 1</button>
        <div data-testid="not-a-button">Not a button</div>
        <button type="button">Button 2</button>
      </Toolbar>,
    );

    const button1 = screen.getByText("Button 1");
    button1.focus();
    fireEvent.keyDown(button1, { key: "ArrowRight" });

    const button2 = screen.getByText("Button 2");
    expect(button2).toHaveFocus();
  });

  it("does nothing when arrow keys pressed on non-button elements", () => {
    render(
      <Toolbar label="Test Toolbar">
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: For testing purposes, we need to set tabindex on a non-interactive element
         */}
        <div data-testid="not-a-button" tabIndex={0}>
          Div element
        </div>
        <button type="button">Button 1</button>
      </Toolbar>,
    );

    const divElement = screen.getByTestId("not-a-button");
    divElement.focus();
    fireEvent.keyDown(divElement, { key: "ArrowRight" });

    expect(divElement).toHaveFocus();
  });
});
