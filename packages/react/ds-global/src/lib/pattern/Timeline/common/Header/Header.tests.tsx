import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header.js";

const actorOptions = [
  { value: "jane", label: "Jane Doe" },
  { value: "john", label: "John Doe" },
];
const eventOptions = [
  { value: "comment", label: "Comment" },
  { value: "approval", label: "Approval" },
];

describe("Timeline.Header", () => {
  it("renders the actor and event filter triggers with the filter label", () => {
    render(<Header actorOptions={actorOptions} eventOptions={eventOptions} />);
    expect(screen.getByText("Filter by:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actor" })).toHaveTextContent(
      "Actor",
    );
    expect(screen.getByRole("button", { name: "Event" })).toHaveTextContent(
      "Event",
    );
  });

  it("emits the selected actor filter", async () => {
    const onFiltersChange = vi.fn();
    render(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        onFiltersChange={onFiltersChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    fireEvent.click(withinMenu(menu, "Jane Doe"));
    expect(onFiltersChange).toHaveBeenCalledWith({ actorId: "jane" });
  });

  it("marks the active option in the menu", async () => {
    render(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        filters={{ actorId: "jane" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Actor" }));
    const menu = await screen.findByRole("menu", { name: "Filter by actor" });
    expect(menu).toHaveTextContent("Jane Doe");
  });

  it("shows the reset button only when a filter is active", () => {
    const { rerender } = render(
      <Header actorOptions={actorOptions} eventOptions={eventOptions} />,
    );
    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();

    rerender(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        filters={{ actorId: "jane" }}
        onFiltersChange={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("clears the filters on reset", () => {
    const onFiltersChange = vi.fn();
    render(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        filters={{ actorId: "jane", eventType: "comment" }}
        onFiltersChange={onFiltersChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(onFiltersChange).toHaveBeenCalledWith({});
  });

  it("renders the sort button labelled with the current order", () => {
    const onSortOrderChange = vi.fn();
    render(<Header sortOrder="oldest" onSortOrderChange={onSortOrderChange} />);
    const sort = screen.getByRole("button", { name: /earliest/i });
    fireEvent.click(sort);
    expect(onSortOrderChange).toHaveBeenCalledWith("newest");
  });

  it("labels the newest order as Latest", () => {
    render(<Header sortOrder="newest" onSortOrderChange={() => undefined} />);
    expect(screen.getByRole("button", { name: /latest/i })).toBeInTheDocument();
  });

  it("hides controls individually", () => {
    render(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        sortOrder="oldest"
        onSortOrderChange={() => undefined}
        showActorFilter={false}
        showEventFilter={false}
        showSorting={false}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Filter by:")).toBeNull();
  });

  it("keeps the sort and reset labels in collapsible spans", () => {
    render(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        filters={{ actorId: "jane" }}
        sortOrder="oldest"
        onSortOrderChange={() => undefined}
        onFiltersChange={() => undefined}
      />,
    );
    const sort = screen.getByRole("button", { name: /earliest/i });
    expect(sort.querySelector(".label")).toHaveTextContent("Earliest");
    const reset = screen.getByRole("button", { name: /reset/i });
    expect(reset.querySelector(".label")).toHaveTextContent("Reset");
  });

  it("uses custom filter labels", () => {
    render(
      <Header
        actorOptions={actorOptions}
        eventOptions={eventOptions}
        actorFilterLabel="Proposer"
      />,
    );
    expect(screen.getByRole("button", { name: "Proposer" })).toHaveTextContent(
      "Proposer",
    );
  });
});

function withinMenu(menu: HTMLElement, text: string): HTMLElement {
  const option = [...menu.querySelectorAll("*")].find(
    (element) => element.textContent === text,
  );
  if (!option) {
    throw new Error(`Option not found in menu: ${text}`);
  }
  return option as HTMLElement;
}
