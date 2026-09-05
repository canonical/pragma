import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ItemSwitch from "./ItemSwitch.js";

describe("ItemSwitch", () => {
  it("renders a switch with the label as its accessible name", () => {
    render(<ItemSwitch>Dark mode</ItemSwitch>);
    expect(
      screen.getByRole("switch", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  it("reflects the checked state", () => {
    render(
      <ItemSwitch checked onCheckedChange={() => {}}>
        Dark mode
      </ItemSwitch>,
    );
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls onCheckedChange with the next value", () => {
    const onCheckedChange = vi.fn();
    render(
      <ItemSwitch checked={false} onCheckedChange={onCheckedChange}>
        Dark mode
      </ItemSwitch>,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports the disabled state", () => {
    render(<ItemSwitch disabled>Dark mode</ItemSwitch>);
    expect(screen.getByRole("switch")).toBeDisabled();
    const { container } = render(<ItemSwitch disabled>Dark mode</ItemSwitch>);
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("supports being uncontrolled via defaultChecked", () => {
    render(<ItemSwitch defaultChecked>Dark mode</ItemSwitch>);
    expect(screen.getByRole("switch")).toBeChecked();
  });
});
