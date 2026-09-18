import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DateTime from "./DateTime.js";
import type { DateTimeProps } from "./types.js";

describe("Timeline.DateTime", () => {
  it("renders a time element with the ISO dateTime attribute", () => {
    render(
      <DateTime iso="2024-06-01T10:00:00Z" alternate="alt">
        Jun 1, 2024, 10:00 AM
      </DateTime>,
    );
    const time = screen.getByText("Jun 1, 2024, 10:00 AM");
    expect(time.closest("time")).toHaveAttribute(
      "datetime",
      "2024-06-01T10:00:00Z",
    );
  });

  it("renders a toggle button when toggleable", () => {
    const onToggle = vi.fn();
    render(
      <DateTime
        iso="2024-06-01T10:00:00Z"
        alternate="alt"
        toggleable
        onToggle={onToggle}
      >
        Jun 1, 2024
      </DateTime>,
    );
    const button = screen.getByRole("button");
    expect(button).toContainElement(screen.getByText("Jun 1, 2024"));
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("exposes the toggled state through aria-pressed", () => {
    render(
      <DateTime
        iso="2024-06-01T10:00:00Z"
        alternate="alt"
        toggleable
        pressed
        onToggle={() => undefined}
      >
        Jun 1, 2024
      </DateTime>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("applies the base class", () => {
    render(
      <DateTime
        iso="2024-06-01T10:00:00Z"
        alternate="alt"
        data-testid="datetime"
      >
        Jun 1
      </DateTime>,
    );
    expect(screen.getByTestId("datetime")).toHaveClass(
      "ds",
      "timeline-datetime",
    );
  });

  it("applies a custom className", () => {
    render(
      <DateTime
        iso="2024-06-01T10:00:00Z"
        alternate="alt"
        className="custom"
        data-testid="datetime"
      >
        Jun 1
      </DateTime>,
    );
    expect(screen.getByTestId("datetime")).toHaveClass("custom");
  });

  it("keeps the variant props off the toggle button", () => {
    render(
      <DateTime
        iso="2024-06-01T10:00:00Z"
        alternate="alt"
        toggleable
        onToggle={() => undefined}
      >
        Jun 1
      </DateTime>,
    );
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("toggleable");
    expect(button).not.toHaveAttribute("onToggle");
  });

  it("strips the toggle props off the static time element", () => {
    // Simulate the Event's data wiring, which passes the toggle props
    // unconditionally even when the static variant renders.
    const props = {
      iso: "2024-06-01T10:00:00Z",
      alternate: "alt",
      children: "Jun 1",
      toggleable: false,
      onToggle: () => undefined,
      pressed: false,
    } as unknown as DateTimeProps;
    const { container } = render(<DateTime {...props} />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).not.toHaveAttribute("toggleable");
    expect(time).not.toHaveAttribute("onToggle");
    expect(time).not.toHaveAttribute("pressed");
  });
});
