/**
 * The connected filters part: controls derived from the schema and the
 * source's declared capabilities, edits that land on the applied query, and
 * invalid input that keeps the restriction already in force. Each case is
 * mutation-tested against that contract.
 */
import {
  createArraySource,
  createCollection,
  createDataViewsProvider,
  createMemoryLocation,
  createPage,
  type DataViewsProvider,
  DEFAULT_WINDOW,
  declareCapabilities,
  decodeQuery,
  type Query,
  type Slice,
  type Source,
  type SourceCapabilities,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import createManualSource from "../../../../../../testing/createManualSource.js";
import createRecordingLocation from "../../../../../../testing/createRecordingLocation.js";
import expectNoAxeViolations from "../../../../../../testing/expectNoAxeViolations.js";
import { COUNTED_EXACTLY } from "../../../../../../testing/fixtures.js";
import toggleDisclosure from "../../../../../../testing/toggleDisclosure.js";
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

/** Every operator the schema allows, the text field's included. */
const withText = declareCapabilities(collection, {
  filter: { status: true, cpu: true, updated: true, owner: true, name: true },
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
    expect(
      screen.getByRole("group", { name: "status is any of" }),
    ).toBeInTheDocument();
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
    // The source declares nothing over the text field, so it gets no control.
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
    expect(
      screen.getByRole("group", { name: "Status is any of" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cores from")).toBeInTheDocument();
    // A field with no entry keeps its own name.
    expect(screen.getByLabelText("updated to")).toBeInTheDocument();
  });

  it("edits the applied query through the any-of set", () => {
    const provider = makeProvider();
    mount(provider);
    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "ready" }));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed", "ready"] },
    ]);
    expect(screen.getByRole("checkbox", { name: "failed" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "cancelled" }),
    ).not.toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["ready"] },
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

  it("has no axe violations as a server draws a standing set and its move link", async () => {
    const html = renderToString(
      <DataViews
        provider={createDataViewsProvider({
          collection,
          source: createManualSource<Row>({ capabilities: everything }).source,
          location: createMemoryLocation({ href: "/machines?status=failed" }),
        })}
      >
        <Filters />
      </DataViews>,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    expect(container.querySelector("a.switch")).not.toBeNull();
    await expectNoAxeViolations(container);
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
        filter: { status: ["isAny"], cpu: ["gte"] },
      }),
    );
    expect(
      screen.getByRole("group", { name: "status is any of" }),
    ).toBeInTheDocument();
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
      { field: "status", operator: "isAny", operands: ["failed"] },
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
      { field: "status", operator: "isAny", operands: ["cancelled"] },
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
      { field: "status", operator: "isAny", operands: ["failed"] },
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    adopt(provider, [
      { field: "status", operator: "isAny", operands: ["ready"] },
    ]);
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

  describe("text", () => {
    // The no-JS case writes the server's markup into the page; nothing is left
    // for the next case, whatever the outcome.
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("offers a labelled text input named as the wire spells contains", () => {
      mount(makeProvider(withText), { labels: { name: "Host" } });
      const input = screen.getByRole("textbox", { name: "Host contains" });
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("name", "name__contains");
      expect(input).not.toHaveAttribute("readonly");
    });

    it("edits the applied query with the text as it is typed, and clears it", () => {
      const provider = makeProvider(withText);
      mount(provider);
      fireEvent.change(screen.getByLabelText("name contains"), {
        target: { value: "web" },
      });
      expect(provider.state.get().slice.filter).toEqual([
        { field: "name", operator: "contains", operands: ["web"] },
      ]);
      fireEvent.click(
        screen.getByRole("button", { name: "Clear name contains" }),
      );
      expect(provider.state.get().slice.filter).toEqual([]);
      expect(screen.getByLabelText("name contains")).toHaveValue("");
    });

    it("keeps the text applied while the input is emptied, and says so", () => {
      const provider = makeProvider(withText);
      mount(provider);
      const input = screen.getByLabelText("name contains");
      fireEvent.change(input, { target: { value: "web" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(provider.state.get().slice.filter).toEqual([
        { field: "name", operator: "contains", operands: ["web"] },
      ]);
      expect(input).toHaveAccessibleDescription(
        "Enter a value to change this restriction. The previous restriction still applies.",
      );
    });

    it("says beside the input why the source refused the text", () => {
      const provider = createDataViewsProvider({
        collection,
        source: createManualSource<Row>({
          capabilities: withText,
          refusals: ({ slice }) =>
            slice.filter.some(({ operator }) => operator === "contains")
              ? [
                  {
                    part: "filter",
                    code: "unsupported-combination",
                    field: "name",
                    operator: "contains",
                    reason:
                      "this endpoint looks for text in one field at a time",
                  },
                ]
              : [],
        }).source,
      });
      mount(provider);
      const input = screen.getByLabelText("name contains");
      fireEvent.change(input, { target: { value: "web" } });
      expect(provider.state.get().slice.filter).toEqual([]);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(
        "This endpoint looks for text in one field at a time.",
      );
    });

    it("offers text the source does not declare only while it stands, and only to clear", () => {
      const provider = makeProvider(everything);
      mount(provider);
      expect(screen.queryByLabelText("name contains")).toBeNull();
      adopt(provider, [
        { field: "name", operator: "contains", operands: ["web"] },
      ]);
      const input = screen.getByLabelText("name contains");
      expect(input).toHaveValue("web");
      expect(input).toHaveAttribute("readonly");
      fireEvent.click(
        screen.getByRole("button", { name: "Clear name contains" }),
      );
      expect(screen.queryByLabelText("name contains")).toBeNull();
    });

    // Beside the other text cases rather than in the SSR file: the submission
    // needs a DOM to build the form's data, which that file's environment lacks.
    it("submits, before any script runs, a query the decoder reads back", () => {
      const provider = makeProvider(withText);
      // The server's markup, never hydrated: no handler runs, so what the
      // browser submits is the form's own controls.
      document.body.innerHTML = renderToString(
        <DataViews provider={provider}>
          <Filters />
        </DataViews>,
      );
      const form = document.querySelector("form");
      const input = document.querySelector<HTMLInputElement>(
        'input[name="name__contains"]',
      );
      if (form === null || input === null) {
        throw new Error("the server renders the form and its text input");
      }
      input.value = "50% a+b é";
      // Spelled from the form's own data as a GET submission spells it, then
      // read back as a server reads it: `%`, `+`, a space and a non-ASCII
      // letter all survive.
      const spelled = new URLSearchParams(
        [...new FormData(form)].map(([key, value]) => [key, String(value)]),
      ).toString();
      expect(
        decodeQuery({
          schema: collection.schema,
          params: new URLSearchParams(spelled),
          capabilities: withText,
        }).slice.filter,
      ).toEqual([
        { field: "name", operator: "contains", operands: ["50% a+b é"] },
      ]);
    });

    it("submits applied text back unchanged, before any script runs", () => {
      const provider = createDataViewsProvider({
        collection,
        source: createManualSource<Row>({ capabilities: withText }).source,
        snapshot: { query: "name__contains=web", presentation: {} },
      });
      document.body.innerHTML = renderToString(
        <DataViews provider={provider}>
          <Filters />
        </DataViews>,
      );
      const form = document.querySelector("form");
      if (form === null) {
        throw new Error("the server renders the form");
      }
      const params = new URLSearchParams(
        [...new FormData(form)].map(([key, value]) => [key, String(value)]),
      );
      expect(
        decodeQuery({
          schema: collection.schema,
          params,
          capabilities: withText,
        }).slice.filter,
      ).toEqual([{ field: "name", operator: "contains", operands: ["web"] }]);
    });

    it("describes the input only while there is something to say", () => {
      mount(makeProvider(withText));
      const input = screen.getByLabelText("name contains");
      expect(input).not.toHaveAttribute("aria-describedby");
      fireEvent.change(input, { target: { value: "web" } });
      expect(input).not.toHaveAttribute("aria-describedby");
      fireEvent.change(input, { target: { value: "" } });
      expect(input).toHaveAttribute("aria-describedby");
    });

    it("has no axe violations with text applied", async () => {
      const { container } = mount(makeProvider(withText));
      fireEvent.change(screen.getByLabelText("name contains"), {
        target: { value: "web" },
      });
      await expectNoAxeViolations(container);
    });

    it("has no axe violations with text refused beside its input", async () => {
      const provider = createDataViewsProvider({
        collection,
        source: createManualSource<Row>({
          capabilities: withText,
          refusals: ({ slice }) =>
            slice.filter.some(({ operator }) => operator === "contains")
              ? [
                  {
                    part: "filter",
                    code: "unsupported-combination",
                    field: "name",
                    operator: "contains",
                    reason:
                      "this endpoint looks for text in one field at a time",
                  },
                ]
              : [],
        }).source,
      });
      const { container } = mount(provider);
      fireEvent.change(screen.getByLabelText("name contains"), {
        target: { value: "web" },
      });
      expect(screen.getByLabelText("name contains")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expectNoAxeViolations(container);
    });

    it("has no axe violations with undeclared text shown for removal", async () => {
      const provider = makeProvider(everything);
      const { container } = mount(provider);
      adopt(provider, [
        { field: "name", operator: "contains", operands: ["web"] },
      ]);
      expect(screen.getByLabelText("name contains")).toHaveAttribute(
        "readonly",
      );
      await expectNoAxeViolations(container);
    });
  });

  describe("facets and set operators", () => {
    /** A machine carrying the fields its facets are computed from. */
    type Machine = Row & {
      readonly status: string;
      readonly cpu: number;
      readonly name: string;
    };

    /** Three machines, answered by a source computing every facet. */
    const records: readonly Machine[] = [
      { id: "a", status: "failed", cpu: 4, name: "web-01" },
      { id: "b", status: "failed", cpu: 16, name: "web-02" },
      { id: "c", status: "ready", cpu: 8, name: "api" },
    ];

    /** A provider over the array source, asking for the status and cpu facets. */
    const createFacetedProvider = (): DataViewsProvider<Fields, Row> =>
      createDataViewsProvider({
        collection,
        source: createArraySource<Row>({ rows: records, collection }),
        facets: ["status", "cpu"],
      });

    it("shows beside each option how many matching records hold it, without renaming it", () => {
      const provider = createFacetedProvider();
      mount(provider);
      expect(
        screen.getByRole("checkbox", { name: "failed" }),
      ).toHaveAccessibleDescription("2");
      expect(
        screen.getByRole("checkbox", { name: "ready" }),
      ).toHaveAccessibleDescription("1");
      // Listed by the schema and held by none: counted as none.
      expect(
        screen.getByRole("checkbox", { name: "cancelled" }),
      ).toHaveAccessibleDescription("0");
      // The field's own restriction never narrows its counts: ready would read
      // none were status not lifted from its own facet.
      fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
      expect(
        screen.getByRole("checkbox", { name: "ready" }),
      ).toHaveAccessibleDescription("1");
      fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
      // Another field's restriction narrows the counts...
      fireEvent.change(screen.getByLabelText("cpu from"), {
        target: { value: "10" },
      });
      expect(
        screen.getByRole("checkbox", { name: "ready" }),
      ).toHaveAccessibleDescription("0");
      // ...the field's own never does: the other options keep theirs.
      fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
      expect(
        screen.getByRole("checkbox", { name: "ready" }),
      ).toHaveAccessibleDescription("0");
      expect(
        screen.getByRole("checkbox", { name: "failed" }),
      ).toHaveAccessibleDescription("1");
    });

    it("shows counts only while the result answers the applied query", () => {
      const manual = createManualSource<Row>({
        capabilities: declareCapabilities(collection, {
          filter: { status: true },
          facets: ["status"],
        }),
      });
      const provider = createDataViewsProvider({
        collection,
        source: manual.source,
        facets: ["status"],
      });
      mount(provider);
      /** Answer the latest request with a count of failed machines. */
      const answerWith = (count: number): void => {
        act(() => {
          manual.latest().deliver({
            status: "succeeded",
            page: createPage({
              rows: [],
              facets: {
                status: {
                  kind: "values",
                  values: [
                    { value: "failed", count: { kind: "exact", value: count } },
                  ],
                },
              },
            }),
          });
        });
      };
      answerWith(2);
      const failed = screen.getByRole("checkbox", { name: "failed" });
      expect(failed).toHaveAccessibleDescription("2");
      // Another query is pending: the counts it answers are not yet known.
      fireEvent.click(screen.getByRole("checkbox", { name: "ready" }));
      expect(failed).not.toHaveAttribute("aria-describedby");
      answerWith(1);
      expect(failed).toHaveAccessibleDescription("1");
    });

    it("spells a lower bound on a count, and nothing for a count unknown", () => {
      const answering: Source<Row> = {
        capabilities: declareCapabilities(collection, {
          filter: { status: true },
          facets: ["status"],
        }),
        execute: (_request, deliver) => {
          deliver({
            status: "succeeded",
            page: createPage({
              rows: [],
              facets: {
                status: {
                  kind: "values",
                  values: [
                    { value: "failed", count: { kind: "at-least", value: 5 } },
                    { value: "ready", count: { kind: "unknown" } },
                  ],
                },
              },
            }),
          });
          return () => {};
        },
      };
      mount(
        createDataViewsProvider({
          collection,
          source: answering,
          facets: ["status"],
        }),
      );
      expect(
        screen.getByRole("checkbox", { name: "failed" }),
      ).toHaveAccessibleDescription("at least 5");
      expect(
        screen.getByRole("checkbox", { name: "ready" }),
      ).not.toHaveAttribute("aria-describedby");
    });

    it("offers the least and greatest value beside the bounds, over the field's own bounds lifted", () => {
      mount(createFacetedProvider());
      const from = screen.getByLabelText("cpu from");
      expect(from).toHaveAccessibleDescription("Lowest: 4");
      expect(screen.getByLabelText("cpu to")).toHaveAccessibleDescription(
        "Highest: 16",
      );
      // A bound of its own never narrows the range it is chosen from.
      fireEvent.change(from, { target: { value: "10" } });
      expect(from).toHaveAccessibleDescription("Lowest: 4");
      fireEvent.click(screen.getByRole("checkbox", { name: "ready" }));
      expect(from).toHaveAccessibleDescription("Lowest: 8");
      // The hint stays beside what an invalid edit says.
      fireEvent.change(from, { target: { value: "99" } });
      expect(from).toHaveAccessibleDescription(
        "Lowest: 8 99 is above the maximum of 64. The previous restriction still applies.",
      );
    });

    it("lists a choice's options from the facet where they are the server's, keeping one the set holds", () => {
      type Placed = { readonly id: string; readonly region?: string };
      const places = createCollection({
        identify: (row: Placed) => row.id,
        fields: [{ field: "region", kind: "choices" }],
      });
      const provider = createDataViewsProvider({
        collection: places,
        source: createArraySource<Placed>({
          rows: [
            { id: "a", region: "eu" },
            { id: "b", region: "us" },
            { id: "c", region: "eu" },
          ],
          collection: places,
        }),
        facets: ["region"],
      });
      render(
        <DataViews provider={provider}>
          <Filters />
        </DataViews>,
      );
      expect(
        screen.getByRole("checkbox", { name: "eu" }),
      ).toHaveAccessibleDescription("2");
      expect(
        screen.getByRole("checkbox", { name: "us" }),
      ).toHaveAccessibleDescription("1");
      act(() => {
        readProviderHost(provider).adopt(
          {
            slice: {
              filter: [
                { field: "region", operator: "isAny", operands: ["ap"] },
              ],
              search: null,
              sort: [],
              group: [],
            },
            window: DEFAULT_WINDOW,
          },
          "adopt",
          null,
        );
      });
      // Held by the set though the facet lists no record holding it.
      expect(screen.getByRole("checkbox", { name: "ap" })).toBeChecked();
    });

    it("lists each field's server-owned options from its own facet", () => {
      type Zoned = { readonly id: string };
      const zoned = createCollection({
        identify: (row: Zoned) => row.id,
        fields: [
          { field: "region", kind: "choices" },
          { field: "zone", kind: "choices" },
        ],
      });
      const answering = createManualSource<Zoned>({
        capabilities: declareCapabilities(zoned, {
          filter: { region: true, zone: true },
          facets: ["region", "zone"],
        }),
        answer: () =>
          createPage({
            rows: [],
            facets: {
              region: {
                kind: "values",
                values: [{ value: "eu", count: { kind: "exact", value: 1 } }],
              },
              zone: { kind: "values", values: [] },
            },
          }),
      });
      const { container } = render(
        <DataViews
          provider={createDataViewsProvider({
            collection: zoned,
            source: answering.source,
            facets: ["region", "zone"],
          })}
        >
          <Filters primary={["region"]} />
        </DataViews>,
      );
      expect(
        screen.getAllByRole("checkbox").map((box) => box.getAttribute("name")),
      ).toEqual(["region"]);
      // The zone's facet lists nothing: no control, so nothing to disclose.
      expect(container.querySelector("details")).toBeNull();
    });

    it("keeps the server's options listed, without counts, once a request fails", () => {
      type Placed = { readonly id: string };
      const places = createCollection({
        identify: (row: Placed) => row.id,
        fields: [{ field: "region", kind: "choices" }],
      });
      const manual = createManualSource<Placed>({
        capabilities: declareCapabilities(places, {
          filter: { region: true },
          facets: ["region"],
        }),
      });
      render(
        <DataViews
          provider={createDataViewsProvider({
            collection: places,
            source: manual.source,
            facets: ["region"],
          })}
        >
          <Filters />
        </DataViews>,
      );
      act(() => {
        manual.latest().deliver({
          status: "succeeded",
          page: createPage({
            rows: [],
            facets: {
              region: {
                kind: "values",
                values: [
                  { value: "eu", count: { kind: "exact", value: 2 } },
                  { value: "us", count: { kind: "exact", value: 1 } },
                ],
              },
            },
          }),
        });
      });
      fireEvent.click(screen.getByRole("checkbox", { name: "eu" }));
      act(() => {
        manual.latest().deliver({
          status: "failed",
          failure: { reason: "offline", cause: null, transient: null },
        });
      });
      expect(screen.getByRole("checkbox", { name: "eu" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "us" })).not.toHaveAttribute(
        "aria-describedby",
      );
    });

    it("lists each of the server's options once, and no value that is no option", () => {
      type Placed = { readonly id: string };
      const places = createCollection({
        identify: (row: Placed) => row.id,
        fields: [{ field: "region", kind: "choices" }],
      });
      const listing: Source<Placed> = {
        capabilities: declareCapabilities(places, {
          filter: { region: true },
          facets: ["region"],
        }),
        execute: (_request, deliver) => {
          deliver({
            status: "succeeded",
            page: createPage({
              rows: [],
              facets: {
                region: {
                  kind: "values",
                  values: [
                    { value: "eu", count: { kind: "exact", value: 2 } },
                    // A source may answer a value no choice can hold.
                    { value: true, count: { kind: "exact", value: 1 } },
                  ],
                },
              },
            }),
          });
          return () => {};
        },
      };
      const provider = createDataViewsProvider({
        collection: places,
        source: listing,
        facets: ["region"],
      });
      render(
        <DataViews provider={provider}>
          <Filters />
        </DataViews>,
      );
      fireEvent.click(screen.getByRole("checkbox", { name: "eu" }));
      // Held by the set and listed by the facet: one checkbox, not two.
      expect(screen.getAllByRole("checkbox", { name: "eu" })).toHaveLength(1);
      expect(screen.getByRole("checkbox", { name: "eu" })).toBeChecked();
      expect(screen.queryByRole("checkbox", { name: "true" })).toBeNull();
    });

    it("offers no control for a choice whose options are the server's while nothing lists them", () => {
      type Placed = { readonly id: string };
      const places = createCollection({
        identify: (row: Placed) => row.id,
        fields: [{ field: "region", kind: "choices" }],
      });
      render(
        <DataViews
          provider={createDataViewsProvider({
            collection: places,
            source: createManualSource<Placed>({
              capabilities: declareCapabilities(places, {
                filter: { region: true },
                facets: ["region"],
              }),
            }).source,
            // Asked for, and not yet answered: nothing lists the options.
            facets: ["region"],
          })}
        >
          <Filters />
        </DataViews>,
      );
      expect(
        screen.queryByRole("group", { name: "region is any of" }),
      ).toBeNull();
    });

    it("moves a standing set to none-of and back, each as one step", () => {
      const provider = createFacetedProvider();
      mount(provider);
      // Nothing stands, so nothing moves.
      expect(
        screen.queryByRole("button", { name: "Match none of these instead" }),
      ).toBeNull();
      fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Match none of these instead" }),
      );
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "isNone", operands: ["failed"] },
      ]);
      const excluded = screen.getByRole("group", { name: "status is none of" });
      const failed = within(excluded).getByRole("checkbox", { name: "failed" });
      expect(failed).toBeChecked();
      expect(failed).toHaveAttribute("name", "status__isNone");
      // Any-of stays offered beside it, holding nothing.
      const included = screen.getByRole("group", { name: "status is any of" });
      expect(
        within(included).getByRole("checkbox", { name: "failed" }),
      ).not.toBeChecked();
      // The group that had the set leaves with it; focus is the filters'.
      expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
      fireEvent.click(
        screen.getByRole("button", { name: "Match any of these instead" }),
      );
      expect(provider.state.get().slice.filter).toEqual([
        { field: "status", operator: "isAny", operands: ["failed"] },
      ]);
    });

    it("moves a standing set through its button as one entry of history", () => {
      const recorded = createRecordingLocation({ href: "/machines" });
      mount(
        createDataViewsProvider({
          collection,
          source: createArraySource<Row>({ rows: records, collection }),
          facets: ["status", "cpu"],
          location: recorded.location,
        }),
      );
      fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
      const before = recorded.writes.length;
      fireEvent.click(
        screen.getByRole("button", { name: "Match none of these instead" }),
      );
      expect(recorded.writes.slice(before)).toEqual([
        ["status__isNone=failed&page=1&size=50", "push"],
      ]);
    });

    it("leads with its move link, before any script runs, where its button writes the location", () => {
      /** A provider standing on failed machines with a bound, on page three. */
      const createStanding = () => {
        const location = createMemoryLocation({
          href: "/machines?tab=overview&status=failed&cpu__gte=4&page=3&size=10",
        });
        return {
          location,
          provider: createDataViewsProvider({
            collection,
            source: createManualSource<Row>({ capabilities: everything })
              .source,
            location,
          }),
        };
      };
      /** Parameters as sorted key=value pairs, so spellings compare by content. */
      const listParams = (params: URLSearchParams): readonly string[] =>
        [...params].map(([key, value]) => `${key}=${value}`).sort();
      const server = createStanding();
      const href = /<a class="switch" href="\?([^"]*)">/
        .exec(
          renderToString(
            <DataViews provider={server.provider}>
              <Filters />
            </DataViews>,
          ),
        )
        ?.at(1)
        ?.replaceAll("&amp;", "&");
      expect(href).toBeDefined();
      const client = createStanding();
      mount(client.provider);
      fireEvent.click(
        screen.getByRole("button", { name: "Match none of these instead" }),
      );
      expect(listParams(new URLSearchParams(href))).toEqual(
        listParams(client.location.read()),
      );
    });

    it("lists hundreds of the server's options once each, in first-seen order", () => {
      type Placed = { readonly id: string };
      const places = createCollection({
        identify: (row: Placed) => row.id,
        fields: [{ field: "region", kind: "choices" }],
      });
      // Two hundred options, each listed twice: as the facet spelled it,
      // and again as its text.
      const spelled = Array.from({ length: 200 }, (_unused, at) => ({
        value: at % 2 === 0 ? `r${at}` : at,
        count: { kind: "exact" as const, value: 1 },
      }));
      const listing: Source<Placed> = {
        capabilities: declareCapabilities(places, {
          filter: { region: true },
          facets: ["region"],
        }),
        execute: (_request, deliver) => {
          deliver({
            status: "succeeded",
            page: createPage({
              rows: [],
              facets: {
                region: {
                  kind: "values",
                  values: [
                    ...spelled,
                    ...spelled.map(({ value, count }) => ({
                      value: String(value),
                      count,
                    })),
                  ],
                },
              },
            }),
          });
          return () => {};
        },
      };
      render(
        <DataViews
          provider={createDataViewsProvider({
            collection: places,
            source: listing,
            facets: ["region"],
          })}
        >
          <Filters />
        </DataViews>,
      );
      const values = screen
        .getAllByRole("checkbox")
        .map((checkbox) => checkbox.getAttribute("value"));
      expect(values).toHaveLength(200);
      expect(values.slice(0, 3)).toEqual(["r0", "1", "r2"]);
    });

    it("moves no set onto one already standing, so no restriction is overwritten", () => {
      const provider = createFacetedProvider();
      mount(provider);
      adopt(provider, [
        { field: "status", operator: "isAny", operands: ["ready"] },
        { field: "status", operator: "isNone", operands: ["failed"] },
      ]);
      expect(
        screen.queryByRole("button", { name: "Match none of these instead" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Match any of these instead" }),
      ).toBeNull();
      // Once the other set is gone, the move is offered again.
      const included = screen.getByRole("group", { name: "status is any of" });
      fireEvent.click(
        within(included).getByRole("checkbox", { name: "ready" }),
      );
      expect(
        screen.getByRole("button", { name: "Match any of these instead" }),
      ).toBeInTheDocument();
    });

    it("moves focus to the filters when a set offered only while it stands leaves", () => {
      const provider = createFacetedProvider();
      mount(provider);
      adopt(provider, [
        { field: "status", operator: "isNone", operands: ["failed"] },
      ]);
      const excluded = screen.getByRole("group", { name: "status is none of" });
      const failed = within(excluded).getByRole("checkbox", { name: "failed" });
      failed.focus();
      fireEvent.click(failed);
      expect(provider.state.get().slice.filter).toEqual([]);
      expect(
        screen.queryByRole("group", { name: "status is none of" }),
      ).toBeNull();
      expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
    });

    it("offers none-of on its own where the source declares no any-of", () => {
      mount(
        makeProvider(
          declareCapabilities(collection, { filter: { status: ["isNone"] } }),
        ),
      );
      const excluded = screen.getByRole("group", { name: "status is none of" });
      expect(screen.getByRole("checkbox", { name: "ready" })).toHaveAttribute(
        "name",
        "status__isNone",
      );
      expect(excluded).toBeVisible();
      expect(
        screen.queryByRole("group", { name: "status is any of" }),
      ).toBeNull();
    });

    it("offers a text input for the text a field starts with", () => {
      const provider = makeProvider(withText);
      mount(provider);
      const input = screen.getByRole("textbox", { name: "name starts with" });
      expect(input).toHaveAttribute("name", "name__startsWith");
      fireEvent.change(input, { target: { value: "we" } });
      expect(provider.state.get().slice.filter).toEqual([
        { field: "name", operator: "startsWith", operands: ["we"] },
      ]);
    });
  });

  describe("primary filters", () => {
    /** The filters' disclosure of the fields not shown by default. */
    const findDisclosure = (container: HTMLElement): HTMLDetailsElement => {
      const details = container.querySelector("details");
      if (details === null) {
        throw new Error("expected the More filters disclosure");
      }
      return details;
    };

    it("draws no More filters when every field left over is one the source cannot filter", () => {
      // The source declares every field but the text one, marked or not.
      const { container } = mount(makeProvider(), {
        primary: ["status", "cpu", "updated", "owner"],
      });
      expect(container.querySelector("details")).toBeNull();
    });

    it("shows every declared-filterable field when none is marked primary", () => {
      const { container } = mount(makeProvider(), { primary: [] });
      expect(container.querySelector("details")).toBeNull();
      expect(screen.getByLabelText("cpu from")).toBeVisible();
      expect(screen.getByRole("checkbox", { name: "owner" })).toBeVisible();
    });

    it("shows the primary fields' controls, in the order marked, and the others under More filters", async () => {
      const { container } = mount(makeProvider(), {
        primary: ["owner", "status"],
      });
      const details = findDisclosure(container);
      expect(details.open).toBe(false);
      expect(screen.getByText("More filters").tagName).toBe("SUMMARY");
      const owner = screen.getByRole("checkbox", { name: "owner" });
      const failed = screen.getByRole("checkbox", { name: "failed" });
      expect(owner).toBeVisible();
      expect(failed).toBeVisible();
      // Marked owner first, then status.
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.indexOf(owner)).toBeLessThan(
        checkboxes.indexOf(failed),
      );
      const cpu = screen.getByLabelText("cpu from");
      expect(details).toContainElement(cpu);
      expect(cpu).not.toBeVisible();
      await toggleDisclosure(container, true);
      expect(cpu).toBeVisible();
    });

    it("always shows the control of a field carrying a restriction", () => {
      const provider = makeProvider();
      const { container } = mount(provider, { primary: ["status"] });
      adopt(provider, [{ field: "cpu", operator: "gte", operands: [4] }]);
      const details = findDisclosure(container);
      expect(details).not.toContainElement(screen.getByLabelText("cpu from"));
      expect(screen.getByLabelText("cpu from")).toBeVisible();
      expect(screen.getByLabelText("cpu to")).toBeVisible();
      expect(details).toContainElement(screen.getByLabelText("updated from"));
    });

    it("keeps a control where it is while More filters is open, and brings it out once closed", async () => {
      const provider = makeProvider();
      const { container } = mount(provider, { primary: ["status"] });
      const details = findDisclosure(container);
      await toggleDisclosure(container, true);
      const cpu = screen.getByLabelText("cpu from");
      cpu.focus();
      fireEvent.change(cpu, { target: { value: "4" } });
      expect(provider.state.get().slice.filter).toEqual([
        { field: "cpu", operator: "gte", operands: [4] },
      ]);
      // Neither moved nor replaced while the disclosure is open.
      expect(details).toContainElement(cpu);
      expect(cpu).toHaveFocus();
      await toggleDisclosure(container, false);
      expect(details).not.toContainElement(screen.getByLabelText("cpu from"));
      expect(screen.getByLabelText("cpu from")).toHaveValue(4);
    });

    it("closes More filters when the marks move, since its placement was pinned under the old ones", async () => {
      const provider = makeProvider();
      const { container, rerender } = mount(provider, { primary: ["status"] });
      await toggleDisclosure(container, true);
      rerender(
        <DataViews provider={provider}>
          <Filters primary={["status", "owner"]} />
        </DataViews>,
      );
      expect(findDisclosure(container).open).toBe(false);
      expect(findDisclosure(container)).toContainElement(
        screen.getByLabelText("cpu from"),
      );
    });

    it("moves focus to the filters when a field shown only for its restriction loses it", () => {
      const provider = makeProvider(withText);
      mount(provider, { primary: ["status"] });
      const group = screen.getByRole("group", { name: "Filters" });
      adopt(provider, [{ field: "cpu", operator: "gte", operands: [4] }]);
      fireEvent.click(screen.getByRole("button", { name: "Clear cpu from" }));
      expect(group).toHaveFocus();

      adopt(provider, [{ field: "owner", operator: "isSet", operands: [] }]);
      fireEvent.click(screen.getByRole("checkbox", { name: "owner" }));
      expect(provider.state.get().slice.filter).toEqual([]);
      expect(group).toHaveFocus();

      adopt(provider, [
        { field: "name", operator: "contains", operands: ["web"] },
      ]);
      fireEvent.click(
        screen.getByRole("button", { name: "Clear name contains" }),
      );
      expect(group).toHaveFocus();
    });

    it("keeps focus on a bound whose field keeps another restriction", () => {
      const provider = makeProvider();
      mount(provider, { primary: ["status"] });
      adopt(provider, [
        { field: "cpu", operator: "gte", operands: [4] },
        { field: "cpu", operator: "lte", operands: [32] },
      ]);
      fireEvent.click(screen.getByRole("button", { name: "Clear cpu from" }));
      expect(screen.getByLabelText("cpu from")).toHaveFocus();
    });

    it("moves focus to the filters when a choice set shown only for its restriction is emptied", () => {
      const provider = makeProvider();
      mount(provider, { primary: ["cpu"] });
      adopt(provider, [
        { field: "status", operator: "isAny", operands: ["failed"] },
      ]);
      fireEvent.click(screen.getByRole("checkbox", { name: "failed" }));
      expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
    });

    it("discloses the server's options under More filters once a facet lists them", () => {
      type Placed = { readonly id: string; readonly region: string };
      const places = createCollection({
        identify: (row: Placed) => row.id,
        fields: [
          { field: "status", kind: "choices", options: ["failed", "ready"] },
          { field: "region", kind: "choices" },
        ],
      });
      const { container } = render(
        <DataViews
          provider={createDataViewsProvider({
            collection: places,
            source: createArraySource<Placed>({
              rows: [
                { id: "a", region: "eu" },
                { id: "b", region: "us" },
              ],
              collection: places,
            }),
            facets: ["region"],
          })}
        >
          <Filters primary={["status"]} />
        </DataViews>,
      );
      const details = findDisclosure(container);
      expect(details).toContainElement(
        screen.getByRole("checkbox", { name: "eu" }),
      );
      expect(screen.getByRole("checkbox", { name: "us" })).not.toBeVisible();
    });

    it("refuses a primary mark for a field the collection lacks", () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect(() => mount(makeProvider(), { primary: ["zone"] })).toThrow(
          'the schema has no field "zone" to mark primary',
        );
      } finally {
        errors.mockRestore();
      }
    });

    it("has no axe violations with More filters open", async () => {
      const { container } = mount(makeProvider(), { primary: ["status"] });
      await toggleDisclosure(container, true);
      await expectNoAxeViolations(container);
    });

    it("has no axe violations with a restriction shown beside the primary fields", async () => {
      const provider = makeProvider();
      const { container } = mount(provider, { primary: ["status"] });
      adopt(provider, [{ field: "cpu", operator: "gte", operands: [4] }]);
      await expectNoAxeViolations(container);
    });
  });
});
