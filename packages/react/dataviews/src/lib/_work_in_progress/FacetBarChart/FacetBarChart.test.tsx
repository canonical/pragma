import {
  createPage,
  type DataViewsProvider,
  type Facet,
} from "@canonical/dataviews-core";
import { act, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  createFacetedFleet,
  createFacetedManual,
} from "../../../../testing/createFacetedProviders.js";
import deliverFacets from "../../../../testing/deliverFacets.js";
import expectNoAxeViolations from "../../../../testing/expectNoAxeViolations.js";
import {
  createMachineProvider,
  type Machine,
  type MachineFields,
  machine,
} from "../../../../testing/machines.js";
import silenceRenderErrors from "../../../../testing/silenceRenderErrors.js";
import FacetBarChart from "./FacetBarChart.js";

type Provider = DataViewsProvider<MachineFields, Machine>;

/** The accessible name the status chart is given. */
const NAME =
  "Machines by status: a bar chart of how many records hold each value";

/** The chart's data table, as value and count pairs. */
const readTable = (): readonly (readonly string[])[] =>
  within(screen.getByRole("table", { name: "Machines by status, as a table" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      [...row.querySelectorAll("th, td")].map((cell) => cell.textContent ?? ""),
    );

/** Each bar's drawn data end, as the `H` its path draws its top edge to. */
const readBarEnds = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll(".bar")].map(
    (bar) =>
      bar
        .getAttribute("d")
        ?.match(/H([\d.]+)/)
        ?.at(1) ?? "",
  );

describe("FacetBarChart", () => {
  it("counts each value over every matching record, not over the page on screen", () => {
    // Twelve machines, five to a page: every third failed.
    const provider = createFacetedFleet({ query: "page=1&size=5" });
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    // Five to a page, while the counts cover all twelve.
    expect(provider.state.get().window).toMatchObject({ size: 5 });
    expect(readTable()).toEqual([
      ["failed", "4"],
      ["running", "8"],
    ]);
    // Eight is the axis's end: 264 units of plot past the 136-unit label
    // column, less the 4-unit rounded end. Four is half of it.
    expect(readBarEnds(container)).toEqual(["264", "396"]);
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "2", "4", "6", "8"]);
  });

  it("keeps every value's count while a filter on the field keeps some", () => {
    const provider = createFacetedFleet({ href: "/machines?status=failed" });
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    // The filter is in force — four of the twelve match it …
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(provider.state.get().result.counts?.matched).toEqual({
      kind: "exact",
      value: 4,
    });
    // … and the bars still count every machine, failed or running, because a
    // facet lifts its own field's restriction.
    expect(readTable()).toEqual([
      ["failed", "4"],
      ["running", "8"],
    ]);
  });

  it("is an image named for what it shows, followed by a table of its numbers", () => {
    const provider = createFacetedFleet();
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    const image = screen.getByRole("img", { name: NAME });
    expect(image.tagName).toBe("svg");
    const table = screen.getByRole("table", {
      name: "Machines by status, as a table",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Value", "Count"]);
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual(["failed", "running"]);
  });

  it("says a lower bound as one, and draws no bar for a value the source did not count", () => {
    const { provider, source } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    deliverFacets(source, {
      status: {
        kind: "values",
        values: [
          { value: "failed", count: { kind: "at-least", value: 3 } },
          { value: "running", count: { kind: "unknown" } },
        ],
      },
      cores: { kind: "range", min: 1, max: 1 },
    });
    expect(readTable()).toEqual([
      ["failed", "at least 3"],
      ["running", "Not counted"],
    ]);
    expect(container.querySelectorAll(".bar")).toHaveLength(1);
    expect(
      [...container.querySelectorAll(".value")].map(
        (value) => value.textContent,
      ),
    ).toEqual(["at least 3", "Not counted"]);
  });

  it("draws no bar for a value no record holds", () => {
    const { provider, source } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    deliverFacets(source, {
      status: {
        kind: "values",
        values: [
          { value: "failed", count: { kind: "exact", value: 0 } },
          { value: "running", count: { kind: "exact", value: 2 } },
        ],
      },
      cores: { kind: "range", min: 1, max: 1 },
    });
    expect(container.querySelectorAll(".bar")).toHaveLength(1);
  });

  it("draws a bar shorter than its rounded end square", () => {
    const { provider, source } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    deliverFacets(source, {
      status: {
        kind: "values",
        values: [
          { value: "failed", count: { kind: "exact", value: 1 } },
          { value: "running", count: { kind: "exact", value: 100 } },
        ],
      },
      cores: { kind: "range", min: 1, max: 1 },
    });
    const bars = [...container.querySelectorAll(".bar")];
    expect(bars.at(0)?.getAttribute("d")).not.toContain("Q");
    expect(bars.at(1)?.getAttribute("d")).toContain("Q");
  });

  it("shows the loading status in place of bars until a result answers", () => {
    const { provider } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    expect(
      container.querySelector("[data-status='pending']"),
    ).toHaveTextContent("Loading…");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("never draws bars counted for an earlier query: the stale status stands in their place", () => {
    const { provider, source } = createFacetedManual();
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    deliverFacets(source, {
      status: {
        kind: "values",
        values: [{ value: "failed", count: { kind: "exact", value: 1 } }],
      },
      cores: { kind: "range", min: 1, max: 1 },
    });
    expect(screen.getByRole("img", { name: NAME })).toBeInTheDocument();
    act(() => {
      provider.setSearch("alp");
    });
    act(() => {
      source.latest().deliver({
        status: "failed",
        failure: { reason: "offline", cause: null, transient: null },
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: offline",
    );
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("says the collection holds nothing, and draws no bars", () => {
    const provider = createFacetedFleet({ count: 0 });
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
        renderStatus={(status) => `said ${status.status}`}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("said no-data");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("says a query matched nothing, apart from a collection holding nothing", () => {
    // A restriction the source runs, matching none of the fleet: its
    // machines hold one core apiece up to their number.
    const provider = createFacetedFleet({ href: "/machines?cores__gte=999" });
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
        renderStatus={(status) => `said ${status.status}`}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("said no-results");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("is a figure captioned by its label, spreading and merging the caller's props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <FacetBarChart
        provider={createFacetedFleet()}
        field="status"
        label="Machines by status"
        className="mine"
        data-testid="chart"
        ref={ref}
      />,
    );
    const root = screen.getByTestId("chart");
    expect(root.tagName).toBe("FIGURE");
    expect(root).toHaveAccessibleName("Machines by status");
    expect(root).toHaveClass("ds", "facet-bar-chart", "mine");
    expect(ref.current).toBe(root);
  });

  it("refuses a value that is not a provider", () => {
    silenceRenderErrors();
    expect(() =>
      render(
        <FacetBarChart
          provider={{} as Provider}
          field="status"
          label="Machines by status"
        />,
      ),
    ).toThrow(
      "FacetBarChart requires a provider created by createDataViewsProvider",
    );
  });

  it("refuses a field its source does not facet", () => {
    silenceRenderErrors();
    // The manual machine source declares no facets at all.
    const { provider } = createMachineProvider({ rows: [] });
    expect(() =>
      render(
        <FacetBarChart
          provider={provider}
          field="status"
          label="Machines by status"
        />,
      ),
    ).toThrow('FacetBarChart names "status", which the source does not facet');
    expect(() =>
      render(
        <FacetBarChart
          provider={createFacetedFleet()}
          field="name"
          label="Machines by name"
        />,
      ),
    ).toThrow('FacetBarChart names "name", which the source does not facet');
  });

  it("says the source counted nothing for a field whose facet is not asked for", () => {
    const provider = createFacetedFleet({ facets: ["cores"] });
    render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    expect(
      screen.getByText("The source answered no counts for this field."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("refuses a field faceted as a range", () => {
    silenceRenderErrors();
    const provider = createFacetedFleet();
    expect(() =>
      render(<FacetBarChart provider={provider} field="cores" label="Cores" />),
    ).toThrow('FacetBarChart draws values, and "cores" is a range');
  });

  it("has no axe violation", async () => {
    const { container } = render(
      <FacetBarChart
        provider={createFacetedFleet()}
        field="status"
        label="Machines by status"
      />,
    );
    await expectNoAxeViolations(container);
  });
});

describe("FacetBarChart hydrating what the server drew", () => {
  it("draws the bars the server drew from its facets, with no mismatch", async () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const build = () => {
      const provider = createFacetedFleet({ href: "/machines?status=failed" });
      provider.refresh();
      return (
        <FacetBarChart
          provider={provider}
          field="status"
          label="Machines by status"
        />
      );
    };
    const container = document.createElement("div");
    container.innerHTML = renderToString(build());
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const drawn = readBarEnds(container);
    expect(drawn).toEqual(["264", "396"]);
    const recovered = vi.fn();
    await act(async () => {
      const root = hydrateRoot(container, build(), {
        onRecoverableError: recovered,
      });
      onTestFinished(() => {
        act(() => {
          root.unmount();
        });
      });
    });
    expect(recovered).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(readBarEnds(container)).toEqual(drawn);
  });
});
