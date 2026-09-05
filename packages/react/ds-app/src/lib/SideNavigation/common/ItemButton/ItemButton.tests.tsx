import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ItemButton from "./ItemButton.js";

describe("ItemButton", () => {
  it("renders a button with the label", () => {
    render(<ItemButton label="Log out" />);
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("calls onClick when activated", () => {
    const onClick = vi.fn();
    render(<ItemButton label="Log out" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports the native disabled attribute", () => {
    render(<ItemButton label="Log out" disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders the trailing slot", () => {
    render(<ItemButton label="Notifications" slot={<span>3</span>} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("always renders a button type, not submit", () => {
    render(<ItemButton label="Log out" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
