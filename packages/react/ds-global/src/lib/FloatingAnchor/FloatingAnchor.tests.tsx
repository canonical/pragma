import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FloatingAnchor from "./FloatingAnchor.js";

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, createPortal: vi.fn((children) => children) };
});

describe("FloatingAnchor", () => {
  it("renders children", () => {
    render(
      <FloatingAnchor content="floating">
        <span>Anchor</span>
      </FloatingAnchor>,
    );
    expect(screen.getByText("Anchor")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <FloatingAnchor content="floating" className="custom">
        <span>Anchor</span>
      </FloatingAnchor>,
    );
    const root = container.querySelector(".ds.floating-anchor");
    expect(root?.className).toContain("custom");
  });

  describe("hover trigger (default)", () => {
    it("shows content on pointer enter", async () => {
      render(
        <FloatingAnchor content="Tooltip text" trigger="hover">
          <span>Hover me</span>
        </FloatingAnchor>,
      );
      fireEvent.pointerEnter(screen.getByText("Hover me"));
      expect(await screen.findByText("Tooltip text")).toBeInTheDocument();
    });

    it("hides content on pointer leave", async () => {
      render(
        <FloatingAnchor content="Tooltip text" trigger="hover">
          <span>Hover me</span>
        </FloatingAnchor>,
      );
      fireEvent.pointerEnter(screen.getByText("Hover me"));
      await screen.findByText("Tooltip text");
      fireEvent.pointerLeave(screen.getByText("Hover me"));
      await waitFor(() =>
        expect(screen.queryByText("Tooltip text")).not.toBeVisible(),
      );
    });

    it("sets aria-describedby by default", () => {
      render(
        <FloatingAnchor content="Tooltip text">
          <span>Hover me</span>
        </FloatingAnchor>,
      );
      const target = screen.getByText("Hover me").closest(".target");
      expect(target).toHaveAttribute("aria-describedby");
    });
  });

  describe("click trigger", () => {
    it("toggles content on click", async () => {
      render(
        <FloatingAnchor
          content="Popover text"
          trigger="click"
          activateDelay={0}
          deactivateDelay={0}
        >
          <button type="button">Click me</button>
        </FloatingAnchor>,
      );
      const wrapper = screen
        .getByText("Click me")
        .closest(".ds.floating-anchor");
      if (!wrapper) throw new Error("wrapper not found");
      fireEvent.click(wrapper);
      await waitFor(() =>
        expect(screen.getByText("Popover text")).toBeVisible(),
      );
    });

    it("closes on Escape", async () => {
      render(
        <FloatingAnchor
          content="Popover text"
          trigger="click"
          activateDelay={0}
          deactivateDelay={0}
        >
          <button type="button">Click me</button>
        </FloatingAnchor>,
      );
      const wrapper = screen
        .getByText("Click me")
        .closest(".ds.floating-anchor");
      if (!wrapper) throw new Error("wrapper not found");
      fireEvent.click(wrapper);
      await waitFor(() =>
        expect(screen.getByText("Popover text")).toBeVisible(),
      );
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() =>
        expect(screen.queryByText("Popover text")).not.toBeVisible(),
      );
    });
  });

  describe("aria-controls relationship", () => {
    it("sets aria-controls and aria-expanded", () => {
      render(
        <FloatingAnchor
          content="Menu"
          trigger="click"
          ariaRelationship="controls"
        >
          <button type="button">Toggle</button>
        </FloatingAnchor>,
      );
      const target = screen.getByText("Toggle").closest(".target");
      expect(target).toHaveAttribute("aria-controls");
      expect(target).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("renderContent", () => {
    it("uses render prop when provided", () => {
      render(
        <FloatingAnchor
          trigger="hover"
          renderContent={({ ref, id, isOpen, style }) => (
            <div ref={ref} id={id} style={style} data-testid="custom">
              {isOpen ? "open" : "closed"}
            </div>
          )}
        >
          <span>Anchor</span>
        </FloatingAnchor>,
      );
      expect(screen.getByTestId("custom")).toBeInTheDocument();
    });
  });
});
