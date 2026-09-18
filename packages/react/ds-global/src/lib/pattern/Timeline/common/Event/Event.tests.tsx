import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Event from "./Event.js";
import type { EventDateTimeProps } from "./types.js";

const dateTime: EventDateTimeProps = {
  format: (iso) => ({ display: `ABS ${iso}`, alternate: "REL" }),
  toggleable: true,
  tooltip: false,
  pressed: false,
  onToggle: vi.fn(),
};

const item = {
  id: "1",
  dateTime: "2024-01-01T00:00:00Z",
  actorId: "jane",
  actorName: "Jane Doe",
  actorLink: "/profile/jane",
  description: "Created the document",
};

describe("Timeline.Event (data mode)", () => {
  it("derives the anatomy from the item", () => {
    const { container } = render(<Event item={item} dateTime={dateTime} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Created the document")).toBeInTheDocument();
    expect(screen.getByText(/ABS /)).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Jane Doe" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/profile/jane");
    }
    expect(container.querySelector(".ds.timeline-marker")).not.toBeNull();
  });

  it("falls back to actorId when actorName is missing", () => {
    const { actorName: _actorName, ...bare } = item;
    render(<Event item={bare} dateTime={dateTime} />);
    expect(screen.getByText("jane")).toBeInTheDocument();
  });

  it("merges the derived marker size under an explicit one", () => {
    const { container } = render(
      <Event
        item={{ ...item, marker: { initials: "JD", size: "small" } }}
        markerSize="large"
      />,
    );
    expect(container.querySelector(".ds.timeline-marker")).toHaveClass("small");
  });

  it("uses the derived marker size when the marker omits one", () => {
    const { container } = render(
      <Event
        item={{ ...item, marker: { initials: "JD" } }}
        markerSize="large"
      />,
    );
    expect(container.querySelector(".ds.timeline-marker")).toHaveClass("large");
    expect(container.querySelector(".ds.timeline-marker")).toHaveTextContent(
      "JD",
    );
  });

  it("hides the name, description, and datetime per the show flags", () => {
    render(
      <Event
        item={{
          ...item,
          showName: false,
          showDescription: false,
          showDateTime: false,
        }}
        dateTime={dateTime}
      />,
    );
    expect(screen.queryByText("Jane Doe")).toBeNull();
    expect(screen.queryByText("Created the document")).toBeNull();
    expect(screen.queryByText(/ABS /)).toBeNull();
  });

  it("omits the datetime without dateTime format state", () => {
    render(<Event item={item} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/ABS /)).toBeNull();
  });

  it("toggles the shared datetime format", () => {
    render(<Event item={item} dateTime={dateTime} />);
    screen.getByRole("button").click();
    expect(dateTime.onToggle).toHaveBeenCalledOnce();
  });

  it("renders fully custom items without the default block", () => {
    const { container } = render(
      <Event
        item={{
          ...item,
          fullyCustom: true,
          customContent: <strong>Deployed</strong>,
        }}
      />,
    );
    expect(screen.getByText("Deployed")).toBeInTheDocument();
    expect(container.querySelector(".content")).toBeNull();
  });
});
