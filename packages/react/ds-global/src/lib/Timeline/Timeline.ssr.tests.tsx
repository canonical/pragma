import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Timeline from "./Timeline.js";

describe("Timeline SSR", () => {
  it("renders without errors on server", () => {
    const html = renderToString(
      <Timeline>
        <Timeline.Content>
          <Timeline.Event actor="John" datetime="2024-01-15">
            Created document
          </Timeline.Event>
          <Timeline.Event actor="Jane" datetime="2024-01-16">
            Approved document
          </Timeline.Event>
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
          <Timeline.Event>Event</Timeline.Event>
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
          <Timeline.Event criticality="critical">Critical event</Timeline.Event>
        </Timeline.Content>
      </Timeline>,
    );
    expect(html).toContain("critical");
  });
});
