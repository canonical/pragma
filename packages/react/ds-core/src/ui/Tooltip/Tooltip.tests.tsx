import { fireEvent, render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it, vi } from "vitest";
import Tooltip from "./Tooltip.js";

describe("Tooltip component", () => {
  it("renders with children", () => {
    render(<Tooltip>Tooltip Content</Tooltip>);
    expect(screen.getByText("Tooltip Content")).toBeInTheDocument();
  });

  it("applies the correct CSS class", async () => {
    render(<Tooltip isOpen={true}>Tooltip Content</Tooltip>);
    expect(await screen.findByRole("tooltip")).toHaveClass("ds tooltip");
  });

  it("applies additional className prop", async () => {
    render(
      <Tooltip className="test-class" isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toHaveClass(
      "ds tooltip test-class",
    );
  });

  it("applies style prop", async () => {
    render(
      <Tooltip style={{ backgroundColor: "red" }} isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toHaveStyle(
      "background-color: rgb(255, 0, 0)",
    );
  });

  it("applies id prop", async () => {
    const id = useId();
    render(
      <Tooltip id={id} isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toHaveAttribute("id", "test-id");
  });

  it("sets aria-hidden to true when isOpen is false", async () => {
    render(<Tooltip isOpen={false}>Tooltip Content</Tooltip>);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("sets aria-hidden to false when isOpen is true", async () => {
    render(<Tooltip isOpen={true}>Tooltip Content</Tooltip>);
    expect(await screen.findByRole("tooltip")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });

  it("is not visible when isOpen is false", () => {
    render(<Tooltip isOpen={false}>Tooltip Content</Tooltip>);
    expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
  });

  it("is visible when isOpen is true", async () => {
    render(<Tooltip isOpen={true}>Tooltip Content</Tooltip>);
    expect(await screen.findByRole("tooltip")).toBeVisible();
  });

  it("applies zIndex prop", async () => {
    render(
      <Tooltip zIndex={100} isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toHaveStyle("z-index: 100");
  });

  it("calls onPointerEnter when pointer enters", async () => {
    const onPointerEnter = vi.fn();
    render(
      <Tooltip onPointerEnter={onPointerEnter} isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    fireEvent.pointerEnter(await screen.findByRole("tooltip"));
    expect(onPointerEnter).toHaveBeenCalled();
  });

  it("calls onFocus when focused", async () => {
    const onFocus = vi.fn();
    render(
      <Tooltip onFocus={onFocus} isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    fireEvent.focus(await screen.findByRole("tooltip"));
    expect(onFocus).toHaveBeenCalled();
  });

  it("correctly handles multiple class names", async () => {
    render(
      <Tooltip className="class1 class2" isOpen={true}>
        Tooltip Content
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toHaveClass(
      "ds tooltip class1 class2",
    );
  });
});
