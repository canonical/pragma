import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Timeline from "./Timeline.js";

describe("Timeline", () => {
  it("renders children", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event>Event 1</Timeline.Event>
          <Timeline.Event>Event 2</Timeline.Event>
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
          <Timeline.Event>Event</Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("timeline")).toHaveClass("ds", "timeline");
  });

  it("applies custom className", () => {
    render(
      <Timeline className="custom" data-testid="timeline">
        <Timeline.Content>
          <Timeline.Event>Event</Timeline.Event>
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
          <Timeline.Event>Event</Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("content")).toHaveClass("ds", "timeline-content");
  });

  it("renders Event with correct class", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event data-testid="event">Event</Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("event")).toHaveClass("ds", "timeline-event");
  });

  it("renders Event with actor", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event actor="John Doe">Did something</Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders Event with datetime", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event datetime="2024-01-15">Event</Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("renders Event with criticality modifier", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event data-testid="event" criticality="warning">
            Warning event
          </Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(screen.getByTestId("event")).toHaveClass("warning");
  });

  it("maintains DOM order: actor, datetime, payload", () => {
    render(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            data-testid="event"
            actor="Actor"
            datetime="2024-01-01"
          >
            Payload
          </Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    const event = screen.getByTestId("event");
    const content = event.querySelector(".content");
    const children = content?.children;
    expect(children?.[0]).toHaveClass("actor");
    expect(children?.[1]).toHaveClass("datetime");
    expect(children?.[2]).toHaveClass("payload");
  });
});
