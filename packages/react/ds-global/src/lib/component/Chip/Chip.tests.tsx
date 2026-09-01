import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Component from "./Chip.js";

describe("Chip component", () => {
  it("renders", () => {
    render(<Component lead={"Cloud"} value={"AWS"} />);
    expect(screen.getByText("AWS")).toBeInTheDocument();
  });

  it("applies lead & value", () => {
    render(<Component lead={"Cloud"} value={"AWS"} />);
    const leadElement = screen.getByText("Cloud");
    const valueElement = screen.getByText("AWS");

    const chipElement = leadElement.closest(".ds.chip");
    expect(chipElement).toBeInTheDocument();
    expect(chipElement).toContainElement(leadElement);
    expect(chipElement).toContainElement(valueElement);
  });

  it("applies criticality modifier", () => {
    render(<Component lead="Cloud" value="AWS" criticality="success" />);

    const leadElement = screen.getByText("Cloud");
    const chipElement = leadElement.closest(".ds.chip");

    expect(chipElement).toHaveClass("success");
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<Component lead={"Cloud"} value={"AWS"} onClick={onClick} />);
    screen.getByText("AWS").click();
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onDismiss", () => {
    const onDismiss = vi.fn();
    render(<Component lead={"Cloud"} value={"AWS"} onDismiss={onDismiss} />);
    screen.getByLabelText("Dismiss").click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("forwards native props to the button root", () => {
    const onMouseEnter = vi.fn();
    render(
      <Component
        value={"AWS"}
        onClick={vi.fn()}
        onMouseEnter={onMouseEnter}
        title={"Cloud provider"}
        aria-describedby={"hint"}
      />,
    );
    const button = screen.getByRole("button", { name: "AWS" });

    expect(button).toHaveAttribute("title", "Cloud provider");
    expect(button).toHaveAttribute("aria-describedby", "hint");
    fireEvent.mouseEnter(button);
    expect(onMouseEnter).toHaveBeenCalled();
  });

  it("forwards native props to the span root", () => {
    const onMouseEnter = vi.fn();
    render(
      <Component
        value={"AWS"}
        data-testid={"chip"}
        onMouseEnter={onMouseEnter}
        title={"Cloud provider"}
      />,
    );
    const chip = screen.getByTestId("chip");

    expect(chip.tagName).toBe("SPAN");
    expect(chip).toHaveAttribute("title", "Cloud provider");
    fireEvent.mouseEnter(chip);
    expect(onMouseEnter).toHaveBeenCalled();
  });

  it("does not leak design-system props to the DOM from the span root", () => {
    render(
      <Component
        lead={"Cloud"}
        value={"AWS"}
        criticality={"success"}
        release={"beta"}
        onDismiss={vi.fn()}
        data-testid={"chip"}
      />,
    );
    const chip = screen.getByTestId("chip");

    expect(chip.tagName).toBe("SPAN");
    for (const leaked of [
      "criticality",
      "release",
      "lead",
      "value",
      "ondismiss",
    ]) {
      expect(chip).not.toHaveAttribute(leaked);
    }
  });

  it("does not leak design-system props to the DOM from the button root", () => {
    render(
      <Component
        lead={"Cloud"}
        value={"AWS"}
        criticality={"success"}
        release={"beta"}
        onClick={vi.fn()}
        onDismiss={vi.fn()}
        data-testid={"chip"}
      />,
    );
    const chip = screen.getByTestId("chip");

    expect(chip.tagName).toBe("BUTTON");
    for (const leaked of [
      "criticality",
      "release",
      "lead",
      "value",
      "ondismiss",
    ]) {
      expect(chip).not.toHaveAttribute(leaked);
    }
  });
});
