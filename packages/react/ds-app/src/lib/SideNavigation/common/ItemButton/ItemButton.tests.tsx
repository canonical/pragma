import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ItemButton from "./ItemButton.js";

describe("ItemButton", () => {
  it("renders a button with the label", () => {
    render(<ItemButton>Log out</ItemButton>);
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("calls onClick when activated", () => {
    const onClick = vi.fn();
    render(<ItemButton onClick={onClick}>Log out</ItemButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports the native disabled attribute", () => {
    render(<ItemButton disabled>Log out</ItemButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders the trailing slot", () => {
    render(<ItemButton slot={<span>3</span>}>Notifications</ItemButton>);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("always renders a button type, not submit", () => {
    render(<ItemButton>Log out</ItemButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
