import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ItemSwitch from "./ItemSwitch.js";

describe("ItemSwitch", () => {
  it("renders a switch with the label as its accessible name", () => {
    render(<ItemSwitch label="Dark mode" />);
    expect(
      screen.getByRole("switch", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  it("reflects the checked state", () => {
    render(<ItemSwitch label="Dark mode" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls onCheckedChange with the next value", () => {
    const onCheckedChange = vi.fn();
    render(
      <ItemSwitch
        label="Dark mode"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports the disabled state", () => {
    render(<ItemSwitch label="Dark mode" disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
    const { container } = render(<ItemSwitch label="Dark mode" disabled />);
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("supports being uncontrolled via defaultChecked", () => {
    render(<ItemSwitch label="Dark mode" defaultChecked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });
});
