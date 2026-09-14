/**
 * The connected filters part: controls derived from the schema and the
 * source's declared capabilities, edits that land on the applied query, and
 * invalid input that keeps the restriction already in force. Each case is
 * mutation-tested against that contract.
 */
import {
  createCollection,
  createDataViewsProvider,
  createMemoryLocation,
  type DataViewsProvider,
  DEFAULT_WINDOW,
  declareCapabilities,
  type Query,
  type Slice,
  type SourceCapabilities,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import createManualSource from "../../../../../../testing/createManualSource.js";
import { COUNTED_EXACTLY } from "../../../../../../testing/fixtures.js";
import DataViews from "../../Provider.js";
import Filters from "./Filters.js";

/** One record of the collection; the controls never read a row. */
type Row = { readonly id: string };

/** A collection with a field of every kind, so every control is exercised. */
const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [
    {
      field: "status",
      kind: "choices",
      options: ["failed", "cancelled", "ready"],
    },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "updated", kind: "date" },
    { field: "owner", kind: "flag" },
    { field: "name", kind: "text" },
  ],
});

type Fields = typeof collection.schema.fields;

/** A source declaring every operator the schema allows, and nothing else. */
const everything = declareCapabilities(collection, {
  filter: { status: true, cpu: true, updated: true, owner: true },
  counts: COUNTED_EXACTLY,
});

/**
 * A provider over a source declaring `capabilities`, which no case ever
 * answers: the controls edit the query, and what the source delivers for
 * it is the table's concern.
 */
const makeProvider = (
  capabilities: SourceCapabilities = everything,
): DataViewsProvider<Fields, Row> =>
  createDataViewsProvider({
    collection,
    source: createManualSource<Row>({ capabilities }).source,
  });

const mount = (
  provider: DataViewsProvider<Fields, Row>,
  props: Parameters<typeof Filters>[0] = {},
) =>
  render(
    <DataViews provider={provider}>
      <Filters {...props} />
    </DataViews>,
  );

/** Move the query under the root, as a location or a saved view would. */
const adopt = (
  provider: DataViewsProvider<Fields, Row>,
  filter: Slice["filter"],
): void => {
  const query: Query = {
    slice: { filter, search: null, sort: [], group: [] },
    window: DEFAULT_WINDOW,
  };
  act(() => {
    readProviderHost(provider).adopt(query, "adopt", null);
  });
};

describe("DataViews.Filters", () => {
  it("is reachable as the composition's Filters part", () => {
    expect(DataViews.Filters).toBe(Filters);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<Filters />)).toThrow(
      "DataViews.Filters must be used inside a DataViews root",
    );
  });

  it("offers one control per field and legal operator, and no others", () => {
    mount(makeProvider());
    // Three options and the flag; two bounds on each of two fields.
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
    expect(screen.queryByLabelText("owner from")).toBeNull();
    expect(screen.getByRole("group", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "status" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "failed" }),
    ).toBeInTheDocument();
    // A number is a native number input carrying the schema's bounds, so
    // the browser validates it before any script runs.
    expect(screen.getByLabelText("cpu from")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("cpu from")).toHaveAttribute("min", "0");
    expect(screen.getByLabelText("cpu from")).toHaveAttribute("max", "64");
    expect(screen.getByLabelText("cpu from")).toHaveAttribute("step", "any");
    expect(screen.getByLabelText("cpu to")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("cpu to")).not.toHaveAttribute("readonly");
    expect(screen.getByRole("checkbox", { name: "failed" })).toBeEnabled();
    expect(screen.getByLabelText("updated from")).toHaveAttribute(
      "type",
      "date",
    );
    expect(screen.getByRole("checkbox", { name: "owner" })).toBeInTheDocument();
    // A choices field has one operator, so it gets no bounds.
    expect(screen.queryByLabelText("status from")).toBeNull();
    // A text field has no operator at all, so it gets no control: it is
    // ordered instead.
    expect(screen.queryByLabelText("name")).toBeNull();
    expect(screen.queryByLabelText("name from")).toBeNull();
  });

  it("names the group and its fields from the supplied labels", () => {
    mount(makeProvider(), {
      label: "Narrow the machines",
      labels: { status: "Status", cpu: "Cores" },
    });
    expect(
      screen.getByRole("group", { name: "Narrow the machines" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cores from")).toBeInTheDocument();
    // A field with no entry keeps its own name.
    expect(screen.getByLabelText("updated to")).toBeInTheDocument();
  });

  it("edits the applied query through the equality set", () => {
    const provider = makeProvider();
    mount(provider);
    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "ready" }));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "ready"] },
    ]);
    expect(screen.getByRole("checkbox", { name: "failed" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "cancelled" }),
    ).not.toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["ready"] },
    ]);
  });

  it("removes the predicate when the last option is cleared", () => {
    const provider = makeProvider();
    mount(provider);
    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    // Not an empty restriction matching nothing: no restriction.
    expect(provider.state.get().slice.filter).toEqual([]);
  });

  it("applies and removes a presence predicate", () => {
    const provider = makeProvider();
    mount(provider);
    const owner = screen.getByRole("checkbox", { name: "owner" });
    fireEvent.click(owner);
    expect(provider.state.get().slice.filter).toEqual([
      { field: "owner", operator: "isSet", operands: [] },
    ]);
    expect(owner).toBeChecked();
    fireEvent.click(owner);
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(owner).not.toBeChecked();
  });

  it("applies a bound and offers to clear it only once it applies", () => {
    const provider = makeProvider();
    mount(provider);
    expect(screen.queryByRole("button", { name: "Clear cpu from" })).toBeNull();
    fireEvent.change(screen.getByLabelText("cpu from"), {
      target: { value: "4" },
    });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Clear cpu from" }));
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(screen.queryByRole("button", { name: "Clear cpu from" })).toBeNull();
  });

  it("keeps the applied bound on an invalid edit and says so", () => {
    const provider = makeProvider();
    mount(provider);
    const input = screen.getByLabelText("cpu from");
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.change(input, { target: { value: "99" } });

    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    expect(input).toHaveAttribute("aria-invalid", "true");
    const feedback = screen.getByText(
      "99 is above the maximum of 64. The previous restriction still applies.",
    );
    expect(input).toHaveAttribute("aria-describedby", feedback.id);
    expect(feedback).toHaveAttribute("role", "status");
  });

  it("keeps the applied bound on an edit the source refuses and says why", () => {
    // The declaration allows every bound; the source itself refuses one
    // range — the check a declaration cannot express.
    const source = createManualSource<Row>({
      capabilities: everything,
      refusals: (query) =>
        query.slice.filter.some(
          (predicate) =>
            predicate.field === "cpu" && Number(predicate.operands[0]) > 32,
        )
          ? [
              {
                part: "filter",
                code: "unsupported-combination",
                field: "cpu",
                operator: "gte",
                reason: "this source counts cores up to 32",
              },
            ]
          : [],
    });
    const provider = createDataViewsProvider({
      collection,
      source: source.source,
    });
    mount(provider);
    const input = screen.getByLabelText("cpu from");
    fireEvent.change(input, { target: { value: "48" } });
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("This source counts cores up to 32."),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.change(input, { target: { value: "48" } });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    expect(
      screen.getByText(
        "This source counts cores up to 32. The previous restriction still applies.",
      ),
    ).toBeInTheDocument();
  });

  it("does not claim a restriction still applies when none does", () => {
    const provider = makeProvider();
    mount(provider);
    fireEvent.change(screen.getByLabelText("cpu from"), {
      target: { value: "99" },
    });
    expect(
      screen.getByText("99 is above the maximum of 64."),
    ).toBeInTheDocument();
    expect(provider.state.get().slice.filter).toEqual([]);
  });

  it("shows the value typed, and reads one outside the schema's bounds as invalid natively and by the schema", () => {
    const provider = makeProvider();
    mount(provider);
    const input = screen.getByLabelText<HTMLInputElement>("cpu from");
    fireEvent.change(input, { target: { value: "99" } });
    expect(input).toHaveValue(99);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("99 is above the maximum of 64.")).toBeVisible();
    // The same bound, natively: the browser refuses it before any script.
    expect(input.validity.rangeOverflow).toBe(true);
    expect(input.checkValidity()).toBe(false);
  });

  it("edits nothing while a number input's text is not yet a number", () => {
    // "-" or "1e" on the way to a value: the browser hands over an empty
    // value. Nothing is edited, so the applied bound and its message stand
    // until the text is a number.
    const provider = makeProvider();
    mount(provider);
    const input = screen.getByLabelText<HTMLInputElement>("cpu from");
    fireEvent.change(input, { target: { value: "4" } });
    // jsdom never reports bad input; the browser's state is stood in for.
    const validity = vi.spyOn(input, "validity", "get");
    validity.mockReturnValue({ ...input.validity, badInput: true });
    fireEvent.change(input, { target: { value: "" } });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(input).not.toHaveAttribute("aria-describedby");
    validity.mockRestore();
    // Emptied for real, the edit is incomplete and says so.
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveAttribute("aria-describedby");
  });

  it("is a GET form whose controls are named as the wire spells their clauses", () => {
    const location = createMemoryLocation({
      href: "/machines?tab=overview&q=yak&sort=updated__desc&page=3&size=10",
    });
    // A source that also searches and orders, so the location's clauses
    // are the query's rather than refused.
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({
        capabilities: declareCapabilities(collection, {
          filter: { status: true, cpu: true, updated: true, owner: true },
          search: ["name"],
          sort: { fields: ["updated"], terms: 1 },
          counts: COUNTED_EXACTLY,
        }),
      }).source,
      location,
    });
    const { container } = mount(provider);
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveClass("ds", "data-views-filters");
    expect(screen.getByRole("checkbox", { name: "failed" })).toHaveAttribute(
      "name",
      "status",
    );
    expect(screen.getByRole("checkbox", { name: "failed" })).toHaveAttribute(
      "value",
      "failed",
    );
    expect(screen.getByRole("checkbox", { name: "owner" })).toHaveAttribute(
      "name",
      "owner__isSet",
    );
    expect(screen.getByRole("checkbox", { name: "owner" })).toHaveAttribute(
      "value",
      "1",
    );
    expect(screen.getByLabelText("cpu from")).toHaveAttribute(
      "name",
      "cpu__gte",
    );
    expect(screen.getByLabelText("updated to")).toHaveAttribute(
      "name",
      "updated__lte",
    );
    // The rest of the query rides hidden — the host's own parameter, the
    // search, the ordering, the size — from the first page; every filter is
    // a visible control's.
    const hidden = [
      ...container.querySelectorAll<HTMLInputElement>("input[type=hidden]"),
    ].map((input) => [input.name, input.value]);
    expect(hidden).toEqual([
      ["tab", "overview"],
      ["q", "yak"],
      ["sort", "updated__desc"],
      ["page", "1"],
      ["size", "10"],
    ]);
    expect(
      screen.getByRole("button", { name: "Apply filters" }),
    ).toHaveAttribute("type", "submit");
  });

  it("intercepts a submission, which has nothing left to apply", () => {
    const { container } = mount(makeProvider());
    const form = container.querySelector("form");
    if (form === null) {
      throw new Error("expected the form");
    }
    expect(fireEvent.submit(form)).toBe(false);
  });

  it("points at no description while there is nothing to say", () => {
    const provider = makeProvider();
    mount(provider);
    const input = screen.getByLabelText("cpu from");
    expect(input).not.toHaveAttribute("aria-describedby");
    // The status region is mounted before it has anything to say, so the
    // first message is announced.
    expect(document.getElementById(`${input.id}-feedback`)).toHaveAttribute(
      "role",
      "status",
    );
    fireEvent.change(input, { target: { value: "4" } });
    expect(input).not.toHaveAttribute("aria-describedby");
    fireEvent.click(screen.getByRole("button", { name: "Clear cpu from" }));
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("reads an emptied bound as incomplete, never as a removal", () => {
    const provider = makeProvider();
    mount(provider);
    const input = screen.getByLabelText("cpu from");
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    expect(input).toHaveAttribute("aria-invalid", "false");
    // The restriction still applies, and the message says so.
    const feedback = screen.getByText(
      "Enter a value to change this restriction. The previous restriction still applies.",
    );
    expect(input).toHaveAttribute("aria-describedby", feedback.id);
  });

  it("asks for a value when an empty bound applies nothing", () => {
    mount(makeProvider());
    const input = screen.getByLabelText("cpu from");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(
      screen.getByText("Enter a value to apply this restriction."),
    ).toBeInTheDocument();
  });

  it("offers only what the source declares it can execute", () => {
    mount(
      makeProvider({
        ...everything,
        filter: { status: ["eq"], cpu: ["gte"] },
      }),
    );
    expect(screen.getByRole("group", { name: "status" })).toBeInTheDocument();
    expect(screen.getByLabelText("cpu from")).toBeInTheDocument();
    expect(screen.queryByLabelText("cpu to")).toBeNull();
    expect(screen.queryByLabelText("updated from")).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "owner" })).toBeNull();
  });

  it("keeps an undeclared restriction that stands clearable, then withdraws it", () => {
    const provider = makeProvider({ ...everything, filter: {} });
    mount(provider);
    expect(screen.queryByRole("checkbox")).toBeNull();
    adopt(provider, [
      { field: "status", operator: "eq", operands: ["failed"] },
      { field: "cpu", operator: "lte", operands: [8] },
      { field: "owner", operator: "isSet", operands: [] },
    ]);
    // Nothing else removes it, so each stays offered while it stands — for
    // removal only: nothing can be added the source never declared.
    expect(screen.getByRole("checkbox", { name: "cancelled" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "failed" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "owner" })).toBeEnabled();
    expect(screen.getByLabelText("cpu to")).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", { name: "Clear cpu to" }),
    ).toBeInTheDocument();
    // The query moving on withdraws what no longer stands.
    adopt(provider, [{ field: "cpu", operator: "lte", operands: [8] }]);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByLabelText("cpu to")).toHaveValue(8);
    // The last undeclared restriction is removed through its own control.
    fireEvent.click(screen.getByRole("button", { name: "Clear cpu to" }));
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(screen.queryByLabelText("cpu to")).toBeNull();
  });

  it("shows the query the provider adopted from elsewhere", () => {
    const provider = makeProvider();
    mount(provider);
    adopt(provider, [
      { field: "status", operator: "eq", operands: ["cancelled"] },
      { field: "cpu", operator: "gte", operands: [8] },
    ]);
    expect(screen.getByRole("checkbox", { name: "cancelled" })).toBeChecked();
    expect(screen.getByLabelText("cpu from")).toHaveValue(8);
  });

  it("edits and follows the provider under StrictMode", () => {
    const provider = makeProvider();
    render(
      <StrictMode>
        <DataViews provider={provider}>
          <Filters />
        </DataViews>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    fireEvent.change(screen.getByLabelText("cpu from"), {
      target: { value: "4" },
    });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    adopt(provider, [{ field: "status", operator: "eq", operands: ["ready"] }]);
    expect(screen.getByRole("checkbox", { name: "ready" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "failed" })).not.toBeChecked();
    expect(screen.getByLabelText("cpu from")).toHaveValue(null);
  });

  it("passes native form props through and merges the class name", () => {
    const { container } = mount(makeProvider(), {
      className: "compact",
      action: "/machines",
      id: "machine-filters",
    });
    const form = container.querySelector("form");
    expect(form).toHaveClass("ds", "data-views-filters", "compact");
    expect(form).toHaveAttribute("action", "/machines");
    expect(form).toHaveAttribute("id", "machine-filters");
    // What the part sets, the caller cannot override through the spread.
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByRole("group", { name: "Filters" })).toBeInTheDocument();
  });
});
