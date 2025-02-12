import { render, screen } from "@testing-library/react";
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

  it("applies positive appearance", () => {
    render(<Component lead="Cloud" value="AWS" appearance="positive" />);

    const leadElement = screen.getByText("Cloud");
    const chipElement = leadElement.closest(".ds.chip");

    expect(chipElement).toHaveClass("positive");
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
});
