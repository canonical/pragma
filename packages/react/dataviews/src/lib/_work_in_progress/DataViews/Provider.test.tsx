/**
 * The DataViews root: a context mount that observes its provider for as
 * long as it is mounted and owns the filter records its children edit
 * through, so two roots over one provider share the query and never a
 * half-typed input.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, type ReactNode, StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { pageOf } from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  type MachineProvider,
  machine,
  machines,
} from "../../../../testing/machines.js";
import type { DataTableColumn } from "../DataTable/index.js";
import useDataViewsFilter from "./hooks/useDataViewsFilter.js";
import DataViews from "./Provider.js";

const Root = ({
  provider,
  children,
}: {
  readonly provider: MachineProvider;
  readonly children?: ReactNode;
}) => <DataViews provider={provider}>{children}</DataViews>;

/** The executions the source still holds. */
const live = (source: ReturnType<typeof createMachineProvider>["source"]) =>
  source.calls.filter((call) => call.releases === 0);

/** A control over the `cores` lower bound, as a child of one root. */
const CoresFilter = ({ name }: { name: string }): ReactElement => {
  const filter = useDataViewsFilter(machines, "cores", "gte");
  return (
    <div>
      <input
        aria-label={name}
        value={filter.input}
        onChange={(event) => filter.edit(event.target.value)}
      />
      <output data-testid={`${name}-feedback`}>{filter.feedback.status}</output>
      <output data-testid={`${name}-applied`}>
        {filter.applied.kind === "value" ? String(filter.applied.value) : ""}
      </output>
    </div>
  );
};

const columns: readonly DataTableColumn[] = [{ id: "name", header: "Name" }];

describe("DataViews root", () => {
  it("renders children inside the provider context", () => {
    const { provider } = createMachineProvider({ rows: [] });
    render(
      <Root provider={provider}>
        <span>inside the collection</span>
      </Root>,
    );
    expect(screen.getByText("inside the collection")).toBeInTheDocument();
  });

  it("throws when the provider is not a genuine DataViews provider", () => {
    expect(() =>
      render(
        <DataViews provider={{ ...createMachineProvider().provider }}>
          <span />
        </DataViews>,
      ),
    ).toThrow("createDataViewsProvider");
  });

  it("observes the provider while mounted, and releases it on unmount", () => {
    const { provider, source } = createMachineProvider();
    expect(source.calls).toHaveLength(0);
    const { unmount } = render(<Root provider={provider} />);
    // The first observer asked for the first page, and the source executes it.
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).releases).toBe(0);
    unmount();
    expect(source.callAt(0).releases).toBe(1);
    expect(source.calls).toHaveLength(1);
  });

  it("keeps one execution for two roots, until the last root unmounts", () => {
    const { provider, source } = createMachineProvider();
    const { rerender, unmount } = render(
      <>
        <Root provider={provider} />
        <Root provider={provider} />
      </>,
    );
    expect(source.calls).toHaveLength(1);
    rerender(<Root provider={provider} />);
    // One root left: the source is still live.
    expect(source.callAt(0).releases).toBe(0);
    unmount();
    expect(source.callAt(0).releases).toBe(1);
  });

  it("leaves one live execution after a StrictMode mount, and the rows render", () => {
    const { provider, source } = createMachineProvider();
    render(
      <StrictMode>
        <Root provider={provider}>
          <DataViews.DataTable columns={columns} label="Machines" />
        </Root>
      </StrictMode>,
    );
    // The rehearsal observed and released; the kept mount observes again.
    expect(live(source)).toHaveLength(1);
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m1", "alpha")]),
      });
    });
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
    expect(live(source)).toHaveLength(1);
  });

  it("releases the first provider and observes the next when the prop changes", () => {
    const first = createMachineProvider();
    const second = createMachineProvider();
    const { rerender, unmount } = render(
      <Root provider={first.provider}>
        <DataViews.DataTable columns={columns} label="Machines" />
      </Root>,
    );
    expect(live(first.source)).toHaveLength(1);
    rerender(
      <Root provider={second.provider}>
        <DataViews.DataTable columns={columns} label="Machines" />
      </Root>,
    );
    expect(live(first.source)).toHaveLength(0);
    expect(live(second.source)).toHaveLength(1);
    // The parts now read the new provider.
    act(() => {
      second.source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m1", "alpha")]),
      });
    });
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
    unmount();
    expect(live(second.source)).toHaveLength(0);
  });

  it("keeps the source live after a StrictMode mount over a source that answered at once", () => {
    // The rehearsal's request settled synchronously and its release stopped
    // the source; the kept mount must bring it back, or a later delivery of
    // the same query would never reach the rows.
    const { provider, source } = createMachineProvider({
      rows: [machine("m1", "alpha")],
    });
    render(
      <StrictMode>
        <Root provider={provider}>
          <DataViews.DataTable columns={columns} label="Machines" />
        </Root>
      </StrictMode>,
    );
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
    expect(live(source)).toHaveLength(1);
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m2", "beta")]),
      });
    });
    expect(screen.getByRole("cell", { name: "beta" })).toBeInTheDocument();
  });

  it("keeps the half-typed input to one root, and mirrors what applies to the other", () => {
    const { provider } = createMachineProvider();
    render(
      <>
        <Root provider={provider}>
          <CoresFilter name="left" />
        </Root>
        <Root provider={provider}>
          <CoresFilter name="right" />
        </Root>
      </>,
    );
    const left = screen.getByLabelText("left");
    const right = screen.getByLabelText("right");
    // An input the field cannot read stays with the root it was typed in.
    fireEvent.change(left, { target: { value: "1e" } });
    expect(left).toHaveValue("1e");
    expect(screen.getByTestId("left-feedback")).toHaveTextContent("invalid");
    expect(right).toHaveValue("");
    expect(screen.getByTestId("right-feedback")).toHaveTextContent("none");
    expect(provider.state.get().slice.filter).toEqual([]);

    // A valid edit applies to the shared query, and the other root mirrors
    // the applied predicate — as applied, not as its own edit.
    fireEvent.change(left, { target: { value: "8" } });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cores", operator: "gte", operands: [8] },
    ]);
    expect(screen.getByTestId("left-feedback")).toHaveTextContent("applied");
    expect(screen.getByTestId("left-applied")).toHaveTextContent("8");
    expect(right).toHaveValue("8");
    expect(screen.getByTestId("right-feedback")).toHaveTextContent("none");
    expect(screen.getByTestId("right-applied")).toHaveTextContent("8");
  });
});
