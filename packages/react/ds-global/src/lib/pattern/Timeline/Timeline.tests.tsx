import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Timeline from "./Timeline.js";

const dateTime = {
  format: (iso: string) => ({ display: iso, alternate: iso }),
  toggleable: false,
  tooltip: false,
  pressed: false,
  onToggle: () => {},
};

describe("Timeline", () => {
  it("renders children", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            item={{ id: "e1", dateTime: "2024-01-15", description: "Event 1" }}
          />
          <Timeline.Event
            item={{ id: "e2", dateTime: "2024-01-16", description: "Event 2" }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
  });

  it("applies ds timeline class", () => {
    render(
      <Timeline data-testid="timeline">
        <Timeline.Content>
          <Timeline.Event
            item={{ id: "e1", dateTime: "2024-01-15", description: "Event" }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("timeline")).toHaveClass("ds", "timeline");
  });

  it("applies custom className", () => {
    render(
      <Timeline className="custom" data-testid="timeline">
        <Timeline.Content>
          <Timeline.Event
            item={{ id: "e1", dateTime: "2024-01-15", description: "Event" }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("timeline")).toHaveClass(
      "ds",
      "timeline",
      "custom",
    );
  });

  it("renders Content with correct class", () => {
    render(
      <Timeline>
        <Timeline.Content data-testid="content">
          <Timeline.Event
            item={{ id: "e1", dateTime: "2024-01-15", description: "Event" }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("content")).toHaveClass("ds", "timeline-content");
  });

  it("renders Event with correct class", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            data-testid="event"
            item={{ id: "e1", dateTime: "2024-01-15", description: "Event" }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("event")).toHaveClass("ds", "timeline-event");
  });

  it("renders Event with actor", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            item={{
              id: "e1",
              dateTime: "2024-01-15",
              actorName: "John Doe",
              description: "Did something",
            }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders Event with datetime", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            data-testid="event"
            dateTime={dateTime}
            item={{
              id: "e1",
              dateTime: "2024-01-15",
              description: "Event",
            }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("renders Event with criticality modifier", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            data-testid="event"
            item={{
              id: "e1",
              dateTime: "2024-01-15",
              description: "Warning event",
              criticality: "warning",
            }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("event")).toHaveClass("warning");
  });

  it("maintains DOM order: actor, payload, trailing datetime", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            data-testid="event"
            dateTime={dateTime}
            item={{
              id: "e1",
              dateTime: "2024-01-01",
              actorName: "Actor",
              description: "Payload",
            }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    const row = screen.getByTestId("event").querySelector(".default-row");
    const children = row?.children;
    expect(children?.[0]).toHaveClass("actor");
    expect(children?.[1]).toHaveClass("payload");
    expect(children?.[2]).toHaveClass("ds", "timeline-datetime");
  });
});
