import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Timeline from "./Timeline.js";

const items = [
  {
    id: "1",
    dateTime: "2024-01-01T10:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "comment",
    description: "Created document",
  },
  {
    id: "2",
    dateTime: "2024-01-02T10:00:00Z",
    actorId: "john",
    actorName: "John Doe",
    eventType: "approval",
    description: "Approved document",
  },
];

describe("Timeline SSR", () => {
  it("renders without errors on server", () => {
    const html = renderToString(<Timeline items={items} />);
    expect(html).toContain("Jane Doe");
    expect(html).toContain("John Doe");
    expect(html).toContain("Created document");
    expect(html).toContain('class="ds timeline"');
  });

  it("renders the event list as an ordered list with the content class", () => {
    const html = renderToString(<Timeline items={items} />);
    expect(html).toContain('<ol class="ds timeline-content">');
    expect(html).toContain('class="ds timeline-event"');
  });

  it("renders the criticality modifier class from the item", () => {
    const html = renderToString(
      <Timeline items={[{ ...items[0], criticality: "error" as const }]} />,
    );
    expect(html).toContain("error");
  });

  it("renders the data-driven timeline on server", () => {
    const html = renderToString(<Timeline items={items} label="History" />);
    expect(html).toContain('class="ds timeline"');
    expect(html).toContain("Created document");
    expect(html).toContain("Approved document");
    expect(html).toContain("Showing 2 of 2 events");
    expect(html).toMatch(/datetime="2024-01-01T10:00:00Z"/i);
  });

  it("renders the data-driven timeline without window access", () => {
    expect(() =>
      renderToString(
        <Timeline
          items={items}
          syncUrlParams
          trailing={<footer>End</footer>}
        />,
      ),
    ).not.toThrow();
  });

  it("renders fully custom items on server", () => {
    const html = renderToString(
      <Timeline
        items={[
          {
            id: "1",
            dateTime: "2024-01-01T00:00:00Z",
            fullyCustom: true,
            customContent: <strong>Custom</strong>,
          },
        ]}
      />,
    );
    expect(html).toContain("<strong");
    expect(html).toContain("Custom");
    expect(html).not.toContain('class="content"');
  });
});
