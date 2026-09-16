import {
  createArraySource,
  createCollection,
  createDataViewsProvider,
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
import FacetRangeChart from "./FacetRangeChart.js";

type Provider = DataViewsProvider<MachineFields, Machine>;

/** The chart's data table, as heading and value pairs. */
const readTable = (): readonly (readonly string[])[] =>
  within(screen.getByRole("table", { name: "Cores, as a table" }))
    .getAllByRole("row")
    .map((row) =>
      [...row.querySelectorAll("th, td")].map((cell) => cell.textContent ?? ""),
    );

/** Where each marker is drawn along the axis, in the drawing's units. */
const readMarkers = (container: HTMLElement): readonly number[] =>
  [...container.querySelectorAll(".marker")].map((marker) =>
    Number(marker.getAttribute("cx")),
  );

describe("FacetRangeChart", () => {
  it("draws the lowest and highest values over every matching record, on a round axis from the field's bound", () => {
    // Twelve machines holding 1 to 12 cores, five to a page.
    const provider = createFacetedFleet({ query: "page=1&size=5" });
    const { container } = render(
      <FacetRangeChart provider={provider} field="cores" label="Cores" />,
    );
    // Five on the page, while the range covers all twelve.
    expect(provider.state.get().window).toMatchObject({ size: 5 });
    expect(readTable()).toEqual([
      ["Lowest", "1"],
      ["Highest", "12"],
    ]);
    // The schema says cores start at 0, so the axis does, in steps of five.
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "5", "10", "15"]);
    // 432 units of axis from an inset of 24, over 0 to 15.
    const [lowest, highest] = readMarkers(container);
    expect(lowest).toBeCloseTo(24 + (1 / 15) * 432);
    expect(highest).toBeCloseTo(24 + (12 / 15) * 432);
    const band = container.querySelector(".band");
    expect(Number(band?.getAttribute("width"))).toBeCloseTo((11 / 15) * 432);
  });

  it("is an image named with its range, followed by a table of both values", () => {
    render(
      <FacetRangeChart
        provider={createFacetedFleet()}
        field="cores"
        label="Cores"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Cores: a range chart from 1 to 12" })
        .tagName,
    ).toBe("svg");
    expect(
      within(screen.getByRole("table", { name: "Cores, as a table" }))
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual(["Lowest", "Highest"]);
  });

  it("says no record holds a value when the range has no ends", () => {
    const { provider, source } = createFacetedManual();
    render(<FacetRangeChart provider={provider} field="cores" label="Cores" />);
    deliverFacets(source, {
      status: { kind: "values", values: [] },
      cores: { kind: "range", min: null, max: null },
    });
    expect(
      screen.getByText("No matching record holds a value."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("widens its axis past a range beyond the field's declared bound", () => {
    const { provider, source } = createFacetedManual();
    const { container } = render(
      <FacetRangeChart provider={provider} field="cores" label="Cores" />,
    );
    deliverFacets(source, {
      status: { kind: "values", values: [] },
      cores: { kind: "range", min: -4, max: 7 },
    });
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["-5", "0", "5", "10"]);
  });

  it("reaches the field's declared upper bound past the range, and starts from the range where no lower bound is declared", () => {
    type Host = { readonly id: string; readonly memory: number };
    const hosts = createCollection({
      identify: (host: Host) => host.id,
      // An upper bound only: the axis starts from the range itself.
      fields: [{ field: "memory", kind: "number", max: 64 }],
    });
    const provider = createDataViewsProvider({
      collection: hosts,
      source: createArraySource({
        rows: [
          { id: "h-1", memory: 4 },
          { id: "h-2", memory: 12 },
        ],
        collection: hosts,
      }),
      facets: ["memory"],
    });
    const { container } = render(
      <FacetRangeChart provider={provider} field="memory" label="Memory" />,
    );
    expect(
      screen.getByRole("img", { name: "Memory: a range chart from 4 to 12" }),
    ).toBeInTheDocument();
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "20", "40", "60", "80"]);
  });

  it("shows the loading status in place of the range until a result answers", () => {
    const { provider } = createFacetedManual();
    const { container } = render(
      <FacetRangeChart provider={provider} field="cores" label="Cores" />,
    );
    expect(
      container.querySelector("[data-status='pending']"),
    ).toHaveTextContent("Loading…");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("No matching record holds a value.")).toBeNull();
  });

  it("is a figure captioned by its label, spreading and merging the caller's props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <FacetRangeChart
        provider={createFacetedFleet()}
        field="cores"
        label="Cores"
        className="mine"
        data-testid="chart"
        ref={ref}
      />,
    );
    const root = screen.getByTestId("chart");
    expect(root.tagName).toBe("FIGURE");
    expect(root).toHaveAccessibleName("Cores");
    expect(root).toHaveClass("ds", "facet-range-chart", "mine");
    expect(ref.current).toBe(root);
  });

  it("refuses a value that is not a provider", () => {
    silenceRenderErrors();
    expect(() =>
      render(
        <FacetRangeChart
          provider={{} as Provider}
          field="cores"
          label="Cores"
        />,
      ),
    ).toThrow(
      "FacetRangeChart requires a provider created by createDataViewsProvider",
    );
  });

  it("refuses a field that is not a number", () => {
    silenceRenderErrors();
    expect(() =>
      render(
        <FacetRangeChart
          provider={createFacetedFleet()}
          field="status"
          label="Status"
        />,
      ),
    ).toThrow('FacetRangeChart draws a number field, and "status" is not one');
  });

  it("refuses a number field its source does not facet", () => {
    silenceRenderErrors();
    // The manual machine source declares no facets at all.
    const { provider } = createMachineProvider({ rows: [] });
    expect(() =>
      render(
        <FacetRangeChart provider={provider} field="cores" label="Cores" />,
      ),
    ).toThrow('FacetRangeChart names "cores", which the source does not facet');
  });

  it("says the source measured nothing for a field whose facet is not asked for", () => {
    render(
      <FacetRangeChart
        provider={createFacetedFleet({ facets: ["status"] })}
        field="cores"
        label="Cores"
      />,
    );
    expect(
      screen.getByText("The source answered no range for this field."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("has no axe violation", async () => {
    const { container } = render(
      <FacetRangeChart
        provider={createFacetedFleet()}
        field="cores"
        label="Cores"
      />,
    );
    await expectNoAxeViolations(container);
  });
});

describe("FacetRangeChart hydrating what the server drew", () => {
  it("draws the range the server drew from its facets, with no mismatch", async () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const build = () => {
      const provider = createFacetedFleet({ href: "/machines?status=failed" });
      provider.refresh();
      return (
        <FacetRangeChart provider={provider} field="cores" label="Cores" />
      );
    };
    const container = document.createElement("div");
    container.innerHTML = renderToString(build());
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const drawn = readMarkers(container);
    expect(drawn).toHaveLength(2);
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
    expect(readMarkers(container)).toEqual(drawn);
  });
});
