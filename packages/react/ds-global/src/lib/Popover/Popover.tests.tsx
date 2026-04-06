import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Popover from "./Popover.js";

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, createPortal: vi.fn((children) => children) };
});

describe("Popover", () => {
  it("renders anchor children", () => {
    render(
      <Popover content="Panel">
        <button type="button">Trigger</button>
      </Popover>,
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });

  it("renders popover content in a dialog role", () => {
    render(
      <Popover content="Panel">
        <button type="button">Trigger</button>
      </Popover>,
    );
    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
  });

  it("applies contentClassName to the popover panel", () => {
    render(
      <Popover content="Panel" contentClassName="custom">
        <button type="button">Trigger</button>
      </Popover>,
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog.className).toContain("ds popover");
    expect(dialog.className).toContain("custom");
  });

  it("is hidden by default", () => {
    render(
      <Popover content="Panel">
        <button type="button">Trigger</button>
      </Popover>,
    );
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("opens popover on click", async () => {
    render(
      <Popover content="Panel" activateDelay={0} deactivateDelay={0}>
        <button type="button">Trigger</button>
      </Popover>,
    );
    const wrapper = screen.getByText("Trigger").closest(".ds.floating-anchor");
    fireEvent.click(wrapper!);
    await waitFor(() => expect(screen.getByText("Panel")).toBeVisible());
  });

  it("closes on Escape", async () => {
    render(
      <Popover content="Panel" activateDelay={0} deactivateDelay={0}>
        <button type="button">Trigger</button>
      </Popover>,
    );
    const wrapper = screen.getByText("Trigger").closest(".ds.floating-anchor");
    fireEvent.click(wrapper!);
    await waitFor(() => expect(screen.getByText("Panel")).toBeVisible());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText("Panel")).not.toBeVisible(),
    );
  });

  it("sets aria-controls and aria-expanded on the target", () => {
    render(
      <Popover content="Panel">
        <button type="button">Trigger</button>
      </Popover>,
    );
    const target = screen.getByText("Trigger").closest(".target");
    expect(target).toHaveAttribute("aria-controls");
    expect(target).toHaveAttribute("aria-expanded", "false");
  });
});
