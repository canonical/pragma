import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Timeline from "./Timeline.js";

const items = [
  {
    id: "1",
    dateTime: "2024-01-01T10:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "comment",
    description: "Created the document",
  },
  {
    id: "2",
    dateTime: "2024-01-02T10:00:00Z",
    actorId: "john",
    actorName: "John Doe",
    eventType: "approval",
    description: "Approved the document",
  },
  {
    id: "3",
    dateTime: "2024-01-03T10:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "comment",
    description: "Updated the document",
  },
];

describe("Timeline (data mode)", () => {
  it("renders items oldest first by default", () => {
    render(<Timeline items={items} />);
    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Created the document");
    expect(rows[2]).toHaveTextContent("Updated the document");
  });

  it("announces the visible count in a live region", () => {
    render(<Timeline items={items} />);
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
  });

  it("renders events as an ordered list", () => {
    render(<Timeline items={items} />);
    expect(screen.getByRole("list").tagName).toBe("OL");
  });

  it("filters by actor through the header menu", async () => {
    render(<Timeline items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(within(menu).getByText("John Doe"));
    expect(screen.getByText("Showing 1 of 1 events")).toBeInTheDocument();
    expect(screen.queryByText("Created the document")).toBeNull();
  });

  it("shows the reset button when a filter is active and clears it", async () => {
    render(<Timeline items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(within(menu).getByText("John Doe"));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
  });

  it("toggles sort order latest/earliest", () => {
    render(<Timeline items={items} />);
    fireEvent.click(screen.getByRole("button", { name: /earliest/i }));
    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Updated the document");
    expect(screen.getByRole("button", { name: /latest/i })).toBeInTheDocument();
  });

  it("hides events beyond initialVisible behind the expansion indicator", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      dateTime: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      description: `Event ${index}`,
    }));
    render(
      <Timeline items={many} expansion={{ initialVisible: 3, step: 2 }} />,
    );
    expect(screen.getByText("7 hidden")).toBeInTheDocument();
    // The bottom method puts the indicator after the visible events.
    const before = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(before[before.length - 1]).toHaveTextContent("7 hidden");
    // The visible slice anchors to the list's start: the first events.
    expect(before[0]).toHaveTextContent("Event 0");
    expect(before[1]).toHaveTextContent("Event 1");
    expect(before[2]).toHaveTextContent("Event 2");
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(screen.getByText("5 hidden")).toBeInTheDocument();
    // "Show more" reveals the NEXT events in order, from the top down.
    const after = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(after[3]).toHaveTextContent("Event 3");
    expect(after[4]).toHaveTextContent("Event 4");
    expect(screen.queryByText("Event 5")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(screen.queryByText(/hidden/)).toBeNull();
    expect(
      within(screen.getByRole("list")).getAllByRole("listitem"),
    ).toHaveLength(10);
  });

  it("supports the middle collapsing method", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      dateTime: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      description: `Event ${index}`,
    }));
    render(
      <Timeline
        items={many}
        expansion={{ method: "middle", initialVisible: 4, step: 2 }}
      />,
    );
    expect(screen.getByText("6 hidden")).toBeInTheDocument();
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Event 0");
    expect(rows[1]).toHaveTextContent("Event 1");
    expect(rows[2]).toHaveTextContent("6 hidden");
    expect(rows[3]).toHaveTextContent("Event 8");
    expect(rows[4]).toHaveTextContent("Event 9");
  });

  it("renders the trailing component after the expansion indicator", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      dateTime: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      description: `Event ${index}`,
    }));
    render(
      <Timeline
        items={many}
        expansion={{ initialVisible: 2, step: 2 }}
        trailing={<footer data-testid="trailing">End of timeline</footer>}
      />,
    );
    const container = screen.getByTestId("trailing")
      .parentElement as HTMLElement;
    const timeline = container.parentElement as HTMLElement;
    expect(container).toHaveClass("ds", "timeline-trailing");
    expect(timeline.lastElementChild).toBe(container);
    // The expansion indicator stays inside the list, before the trailing node
    expect(
      within(container.parentElement as HTMLElement).getByText(/hidden/),
    ).toBeInTheDocument();
    // The trailing node is not an event: no marker, no listitem
    expect(container.querySelector(".marker")).toBeNull();
    expect(within(container).queryByRole("listitem")).toBeNull();
  });

  it("keeps the trailing component through filters and sorts", async () => {
    const items = [
      {
        id: "1",
        dateTime: "2024-01-01T00:00:00Z",
        actorId: "jane",
        actorName: "Jane Doe",
        description: "Jane's event",
      },
      {
        id: "2",
        dateTime: "2024-01-02T00:00:00Z",
        actorId: "john",
        actorName: "John Doe",
        description: "John's event",
      },
    ];
    render(
      <Timeline
        items={items}
        filters={{ actorId: "john" }}
        trailing={<footer data-testid="trailing">End of timeline</footer>}
      />,
    );
    // The trailing node survives a filter that hides other events
    expect(screen.getByTestId("trailing")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 1 events")).toBeInTheDocument();
  });

  it("renders fully custom items without the default content block", () => {
    const { container } = render(
      <Timeline
        items={[
          {
            id: "1",
            dateTime: "2024-01-01T00:00:00Z",
            actorId: "jane",
            actorName: "Jane Doe",
            description: "Hidden description",
            fullyCustom: true,
            customContent: (
              <strong data-testid="custom">Deployed to production</strong>
            ),
          },
        ]}
      />,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(container.querySelector(".ds.timeline-event .content")).toBeNull();
    expect(
      container.querySelector(".ds.timeline-event .custom.full"),
    ).toHaveTextContent("Deployed to production");
  });

  it("renders custom markers", () => {
    const { container } = render(
      <Timeline
        items={[
          {
            id: "1",
            dateTime: "2024-01-01T00:00:00Z",
            actorId: "jane",
            marker: { initials: "JD" },
          },
        ]}
      />,
    );
    const marker = container.querySelector(".ds.timeline-marker");
    // A marker without an explicit size inherits the derived size from
    // markerCombination (first actor run of the all-sizes progression).
    expect(marker).toHaveClass("large");
    expect(marker).toHaveTextContent("JD");
  });

  it("lets an explicit marker size win over the derived size", () => {
    const { container } = render(
      <Timeline
        items={[
          {
            id: "1",
            dateTime: "2024-01-01T00:00:00Z",
            actorId: "jane",
            marker: { initials: "JD", size: "small" },
          },
        ]}
      />,
    );
    expect(container.querySelector(".ds.timeline-marker")).toHaveClass("small");
  });

  it("renders actor links on the actor name and marker", () => {
    render(
      <Timeline
        items={[
          {
            id: "1",
            dateTime: "2024-01-01T00:00:00Z",
            actorId: "jane",
            actorName: "Jane Doe",
            actorLink: "/profile/jane",
          },
        ]}
      />,
    );
    const links = screen.getAllByRole("link", { name: "Jane Doe" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/profile/jane");
    }
  });

  it("renders the leading dateTime in a column left of the marker", () => {
    render(<Timeline items={[items[0]]} dateTimePosition="leading" />);
    const event = screen
      .getByRole("listitem")
      .querySelector(".ds.timeline-event");
    const rootChildren = event?.children;
    expect(rootChildren?.[0]).toHaveClass("ds", "timeline-datetime");
    expect(rootChildren?.[1]).toHaveClass("marker");
    const defaultRow = event?.querySelector(".default-row");
    expect(defaultRow?.children).toHaveLength(2);
    expect(defaultRow?.children[0]).toHaveClass("actor");
    expect(defaultRow?.children[1]).toHaveClass("payload");
  });

  it("toggles all datetime formats together", () => {
    render(
      <Timeline
        items={items}
        dateTimeFormats={{
          formatAbsolute: (iso) => `ABS ${iso}`,
          formatRelative: () => "REL",
        }}
      />,
    );
    expect(screen.getAllByText(/^ABS /)).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("button", { name: /^ABS / })[0]);
    expect(screen.getAllByText("REL")).toHaveLength(3);
  });

  it("respects showControls=false", () => {
    render(<Timeline items={items} showControls={false} />);
    expect(screen.queryByRole("button", { name: "Actor" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Event" })).toBeNull();
    expect(screen.queryByRole("button", { name: /first/i })).toBeNull();
  });

  it("respects showSorting=false", () => {
    render(<Timeline items={items} showSorting={false} />);
    expect(screen.queryByRole("button", { name: /first/i })).toBeNull();
  });

  it("calls onVisibleItemsChange with the rendered items", () => {
    const onVisibleItemsChange = vi.fn();
    render(
      <Timeline items={items} onVisibleItemsChange={onVisibleItemsChange} />,
    );
    expect(onVisibleItemsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
        expect.objectContaining({ id: "3" }),
      ]),
    );
  });

  it("syncs filters to the URL when syncUrlParams is set", async () => {
    window.history.replaceState(null, "", "/");
    render(<Timeline items={items} syncUrlParams />);
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(within(menu).getByText("John Doe"));
    const search = new URLSearchParams(window.location.search);
    expect(search.get("tl.actor")).toBe("john");
    expect(search.get("tl.sort")).toBe("oldest");
  });

  it("clears filters when navigating back to a param-less URL", async () => {
    window.history.replaceState(null, "", "/");
    render(<Timeline items={items} syncUrlParams />);
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(within(menu).getByText("John Doe"));
    expect(screen.getByText("Showing 1 of 1 events")).toBeInTheDocument();
    // Simulate back-navigation to the param-less URL.
    window.history.replaceState(null, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
    expect(screen.getByText("Created the document")).toBeInTheDocument();
  });

  it("indexes items within the visible list for renderItem", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      dateTime: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      description: `Event ${index}`,
    }));
    const indexes = new Map<string, number>();
    render(
      <Timeline
        items={many}
        expansion={{ method: "middle", initialVisible: 4, step: 2 }}
        renderItem={(item, context) => {
          indexes.set(item.id, context.index);
          return <span>{item.description}</span>;
        }}
      />,
    );
    // Top slice: 0..1. The bottom slice anchors to the list's end, so
    // its items carry their index within `visible`, not topCount+.
    expect(indexes.get("0")).toBe(0);
    expect(indexes.get("1")).toBe(1);
    expect(indexes.get("8")).toBe(8);
    expect(indexes.get("9")).toBe(9);
  });

  it("renders an empty item when renderItem returns null", () => {
    const { container } = render(
      <Timeline
        items={[{ id: "1", dateTime: "2024-01-01T00:00:00Z" }]}
        renderItem={() => null}
      />,
    );
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(container.querySelector(".ds.timeline-event")).toBeNull();
  });

  it("keeps URL params when the controlled filters ignore the change", () => {
    window.history.replaceState(null, "", "/?tl.actor=jane");
    render(
      <Timeline
        items={items}
        filters={{}}
        onFiltersChange={() => undefined}
        syncUrlParams
      />,
    );
    expect(new URLSearchParams(window.location.search).get("tl.actor")).toBe(
      "jane",
    );
  });

  it("applies URL params on mount without clobbering them", () => {
    window.history.replaceState(null, "", "/?tl.actor=jane&tl.sort=newest");
    render(<Timeline items={items} syncUrlParams />);
    expect(screen.getByText("Showing 2 of 2 events")).toBeInTheDocument();
    const search = new URLSearchParams(window.location.search);
    expect(search.get("tl.actor")).toBe("jane");
    expect(search.get("tl.sort")).toBe("newest");
  });

  it("pushes a history entry per filter change when urlHistory is push", async () => {
    window.history.replaceState(null, "", "/");
    render(<Timeline items={items} syncUrlParams urlHistory="push" />);
    const before = window.history.length;
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(within(menu).getByText("John Doe"));
    expect(window.history.length).toBe(before + 1);
  });

  it("does not push a duplicate when popstate adopts URL state", async () => {
    window.history.replaceState(null, "", "/");
    render(<Timeline items={items} syncUrlParams urlHistory="push" />);
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(within(menu).getByText("John Doe"));
    const afterPush = window.history.length;
    // Back to the param-less entry, as popstate reports it.
    window.history.replaceState(null, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
    // Adoption is a read, not a navigation: it adds no history entry.
    expect(window.history.length).toBe(afterPush);
  });

  it("reports popstate to a controlled parent and keeps the URL untouched", () => {
    window.history.replaceState(null, "", "/");
    const onFiltersChange = vi.fn();
    render(
      <Timeline
        items={items}
        filters={{}}
        onFiltersChange={onFiltersChange}
        syncUrlParams
      />,
    );
    // Back into an entry carrying filters, as popstate reports it.
    window.history.replaceState(null, "", "/?tl.actor=jane");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    // The hook reported the URL state; the controlled parent ignored it,
    // so the view keeps the parent's filters while the URL keeps its own.
    expect(onFiltersChange).toHaveBeenCalledWith({
      actorId: "jane",
      eventType: undefined,
    });
    expect(screen.getByText("Showing 3 of 3 events")).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("tl.actor")).toBe(
      "jane",
    );
  });
});
