import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Timeline from "./Timeline.js";

const dateTime = {
  format: (iso: string) => ({ display: iso, alternate: iso }),
  toggleable: false,
  tooltip: false,
  pressed: false,
  onToggle: () => {},
};

describe("Timeline SSR", () => {
  it("renders without errors on server", () => {
    const html = renderToString(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            dateTime={dateTime}
            item={{
              id: "e1",
              dateTime: "2024-01-15",
              actorName: "John",
              description: "Created document",
            }}
          />
          <Timeline.Event
            dateTime={dateTime}
            item={{
              id: "e2",
              dateTime: "2024-01-16",
              actorName: "Jane",
              description: "Approved document",
            }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(html).toContain("John");
    expect(html).toContain("Jane");
    expect(html).toContain("Created document");
    expect(html).toContain('class="ds timeline"');
  });

  it("renders subcomponents with correct classes on server", () => {
    const html = renderToString(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            item={{ id: "e1", dateTime: "2024-01-15", description: "Event" }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(html).toContain('class="ds timeline-content"');
    expect(html).toContain('class="ds timeline-event"');
  });

  it("renders Event with criticality on server", () => {
    const html = renderToString(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event
            item={{
              id: "e1",
              dateTime: "2024-01-15",
              description: "Error event",
              criticality: "error",
            }}
          />
        </Timeline.Content>
      </Timeline>,
    );
    expect(html).toContain("error");
  });
});
