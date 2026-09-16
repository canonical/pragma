import {
  createArraySource,
  createDataViewsProvider,
  type DataViewsProvider,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import expectNoAxeViolations from "../../../../testing/expectNoAxeViolations.js";
import { pageOf } from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  type Machine,
  type MachineFields,
  machine,
  machines,
} from "../../../../testing/machines.js";
import silenceRenderErrors from "../../../../testing/silenceRenderErrors.js";
import type {
  DisplayField,
  DisplayFieldCellProps,
} from "../../common/index.js";
import { useDataViewsCell, useDataViewsValue } from "../../hooks/index.js";
import { DataTable } from "../DataTable/index.js";
import Cards from "./Cards.js";
import type { CardsProps } from "./types.js";

type Provider = DataViewsProvider<MachineFields, Machine>;

const fields: readonly DisplayField[] = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
];

const rows: readonly Machine[] = [
  machine("m-1", "alpha", "running", 4),
  machine("m-2", "beta", "failed", 8),
];

/** Cards whose source answers every request at once with `answered`. */
const loadedCards = (
  answered: readonly Machine[] = rows,
  extra: Partial<CardsProps<MachineFields, Machine>> = {},
) => {
  const { provider, source } = createMachineProvider({ rows: answered });
  const view = render(
    <Cards
      provider={provider}
      fields={fields}
      title="name"
      label="Machines"
      {...extra}
    />,
  );
  return { provider, source, view };
};

/** A request the source accepted and could not complete. */
const failure = (reason: string): SourceDelivery<Machine> => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** The cards' list, inside the region their label names. */
const readList = (): HTMLElement =>
  within(screen.getByRole("region", { name: "Machines" })).getByRole("list");

describe("Cards", () => {
  it("refuses a value that is not a provider", () => {
    silenceRenderErrors();
    expect(() =>
      render(
        <Cards
          provider={{} as Provider}
          fields={fields}
          title="name"
          label="Machines"
        />,
      ),
    ).toThrow("Cards requires a provider created by createDataViewsProvider");
  });

  it("refuses a title naming none of its fields", () => {
    silenceRenderErrors();
    const { provider } = createMachineProvider({ rows });
    expect(() =>
      render(
        <Cards
          provider={provider}
          fields={fields}
          title="owner"
          label="Machines"
        />,
      ),
    ).toThrow('Cards names no field "owner" as its title');
  });

  it("renders the design system's cards as a list, one item per record, each named by its title", () => {
    const { view } = loadedCards();
    const list = readList();
    // The design system's Cards group lays the list out; each item is its Card.
    expect(list).toHaveClass("ds", "cards");
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toHaveClass("ds", "card", "data-card");
    }
    expect(within(list).getByRole("listitem", { name: "alpha" })).toBe(
      cards.at(0),
    );
    expect(within(list).getByRole("listitem", { name: "beta" })).toBe(
      cards.at(1),
    );
    // No grid, and no roving focus: a list of cards needs no key of its own.
    expect(view.container.querySelector("[role='grid']")).toBeNull();
    expect(view.container.querySelector("[tabindex]")).toBeNull();
  });

  it("heads each card with its title, and lists the other fields under their headings", () => {
    loadedCards();
    const card = within(readList()).getByRole("listitem", { name: "beta" });
    expect(card.querySelector(".header .title")).toHaveTextContent("beta");
    const listed = [...card.querySelectorAll(".content .field")].map(
      (field) => [
        field.querySelector("dt")?.textContent,
        field.querySelector("dd")?.textContent,
      ],
    );
    expect(listed).toEqual([
      ["Status", "failed"],
      ["Cores", "8"],
    ]);
  });

  it("draws a card with its title alone when it lists no other field", () => {
    loadedCards(rows, { fields: [{ id: "name", header: "Name" }] });
    const card = within(readList()).getByRole("listitem", { name: "alpha" });
    expect(card.querySelector(".content")).toBeNull();
  });

  it("renders a field's own content inside that value's cell scope", () => {
    const Badge = ({ value, rowId, columnId }: DisplayFieldCellProps) => {
      const cell = useDataViewsCell(machines);
      const record = useDataViewsValue(cell.record);
      return (
        <span data-testid={`${rowId}-${columnId}`}>
          {String(value)} of {record.name}
        </span>
      );
    };
    loadedCards(rows, {
      fields: [
        { id: "name", header: "Name" },
        { id: "state", header: "State", field: "status", cell: Badge },
      ],
    });
    expect(screen.getByTestId("m-2-state")).toHaveTextContent("failed of beta");
  });

  it("offers a checkbox per card, and the page's own, only where selectable", () => {
    const plain = loadedCards();
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
    plain.view.unmount();
    loadedCards(rows, { selectable: true });
    // One per card, and one for the page.
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("selects a record from its card's checkbox, named for its title", () => {
    const { provider } = loadedCards(rows, { selectable: true });
    const beta = screen.getByRole("checkbox", { name: "Select beta" });
    fireEvent.click(beta);
    expect([...provider.selection.state.get().ids]).toEqual(["m-2"]);
    expect(beta).toBeChecked();
    fireEvent.click(beta);
    expect([...provider.selection.state.get().ids]).toEqual([]);
  });

  it("names a card's checkbox by the caller's label over its title", () => {
    loadedCards(rows, {
      selectable: true,
      rowLabel: (row, rowId) => `${row.name} (${rowId})`,
    });
    expect(
      screen.getByRole("checkbox", { name: "Select alpha (m-1)" }),
    ).toBeInTheDocument();
  });

  it("names a card's checkbox by a title that is not a string, spelled", () => {
    const Blank = () => null;
    loadedCards(rows, {
      selectable: true,
      fields: [{ id: "name", header: "Name", field: "cores", cell: Blank }],
    });
    expect(
      screen.getByRole("checkbox", { name: "Select 4" }),
    ).toBeInTheDocument();
  });

  it("names a card's checkbox by its identity when its title holds no text", () => {
    const Blank = () => null;
    loadedCards(rows, {
      selectable: true,
      fields: [{ id: "name", header: "Name", field: "config", cell: Blank }],
    });
    expect(
      screen.getByRole("checkbox", { name: "Select m-1" }),
    ).toBeInTheDocument();
  });

  it("selects every card on the page at once, keeping a selection made elsewhere", () => {
    const { provider } = loadedCards(rows, { selectable: true });
    act(() => {
      provider.selection.add(["elsewhere"]);
    });
    const all = screen.getByRole<HTMLInputElement>("checkbox", {
      name: "Select all displayed rows",
    });
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(false);
    fireEvent.click(all);
    expect([...provider.selection.state.get().ids].sort()).toEqual([
      "elsewhere",
      "m-1",
      "m-2",
    ]);
    expect(all.checked).toBe(true);
    fireEvent.click(all);
    expect([...provider.selection.state.get().ids]).toEqual(["elsewhere"]);
  });

  it("shows part of the page selected as mixed", () => {
    const { provider } = loadedCards(rows, { selectable: true });
    act(() => {
      provider.selection.add(["m-1"]);
    });
    const all = screen.getByRole<HTMLInputElement>("checkbox", {
      name: "Select all displayed rows",
    });
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
  });

  it("shares one selection with a table over the same provider", () => {
    const { provider } = createMachineProvider({ rows });
    render(
      <>
        <Cards
          provider={provider}
          fields={fields}
          title="name"
          label="Machines"
          selectable
          rowLabel={(row) => row.name}
        />
        <DataTable
          provider={provider}
          columns={fields}
          label="Machine table"
          selectable
          rowLabel={(row) => row.name}
        />
      </>,
    );
    const [onCard, inTable] = screen.getAllByRole("checkbox", {
      name: "Select alpha",
    });
    fireEvent.click(onCard as HTMLElement);
    expect(inTable).toBeChecked();
  });

  it("says it is loading while nothing has arrived, busy and silent", () => {
    const { provider } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    const region = screen.getByRole("region", { name: "Machines" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region.querySelector("[data-status='pending']")).toHaveTextContent(
      "Loading…",
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(within(readList()).queryAllByRole("listitem")).toEqual([]);
  });

  it("says why a failed request left no cards, politely", () => {
    const { provider, source } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    act(() => {
      source.latest().deliver(failure("the inventory is unreachable"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "These rows could not be loaded: the inventory is unreachable",
    );
    expect(within(readList()).queryAllByRole("listitem")).toEqual([]);
    expect(screen.getByRole("region", { name: "Machines" })).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });

  it("keeps the cards of an earlier query under stale, and says so", () => {
    const { provider, source } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    act(() => {
      source.latest().deliver({ status: "succeeded", page: pageOf(rows) });
    });
    act(() => {
      provider.setSearch("alp");
    });
    act(() => {
      source.latest().deliver(failure("the inventory is unreachable"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: the inventory is unreachable",
    );
    expect(
      within(readList())
        .getAllByRole("listitem")
        .map((card) => card.querySelector(".title")?.textContent),
    ).toEqual(["alpha", "beta"]);
  });

  it("says the collection holds nothing, in the caller's own words", () => {
    loadedCards([], { renderStatus: (status) => `nothing: ${status.status}` });
    expect(screen.getByRole("status")).toHaveTextContent("nothing: no-data");
  });

  it("says a query matched nothing, apart from a collection holding nothing", () => {
    const { provider, source } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
        renderStatus={(status) => `nothing: ${status.status}`}
      />,
    );
    act(() => {
      provider.setSearch("nothing-at-all");
    });
    act(() => {
      source.latest().deliver({ status: "succeeded", page: pageOf([]) });
    });
    expect(screen.getByRole("status")).toHaveTextContent("nothing: no-results");
  });

  it("keeps the cards a failed refresh could not replace, and says so", () => {
    const { provider, source } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    act(() => {
      source.latest().deliver({ status: "succeeded", page: pageOf(rows) });
    });
    act(() => {
      provider.refresh();
    });
    act(() => {
      source.latest().deliver(failure("the inventory is unreachable"));
    });
    // The cards still answer the query the reader asked, so they stay.
    expect(screen.getByRole("status")).toHaveTextContent(
      "These rows could not be refreshed: the inventory is unreachable",
    );
    expect(
      within(readList())
        .getAllByRole("listitem")
        .map((card) => card.querySelector(".title")?.textContent),
    ).toEqual(["alpha", "beta"]);
  });

  it("holds one status element across the results that keep it", () => {
    const { provider, source } = createMachineProvider();
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    act(() => {
      source.latest().deliver({ status: "succeeded", page: pageOf(rows) });
    });
    act(() => {
      provider.setSearch("alp");
    });
    act(() => {
      source.latest().deliver(failure("the inventory is unreachable"));
    });
    const said = screen.getByRole("status");
    // A re-render while the same status stands keeps the element it stands
    // in, so a settled outcome is announced once and not again.
    act(() => {
      provider.selection.add(["m-1"]);
    });
    expect(screen.getByRole("status")).toBe(said);
  });

  it("names its root by its label, spreading and merging the caller's props", () => {
    const ref = createRef<HTMLElement>();
    const { provider } = createMachineProvider({ rows });
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
        className="mine"
        data-testid="cards"
        ref={ref}
      />,
    );
    const root = screen.getByTestId("cards");
    expect(root.tagName).toBe("SECTION");
    expect(root).toHaveAccessibleName("Machines");
    expect(root).toHaveClass("ds", "data-cards", "mine");
    expect(root).toHaveAttribute("aria-busy", "false");
    expect(ref.current).toBe(root);
  });

  it("re-renders no value for a field list rebuilt with the same fields, nor for a selection", () => {
    const renders: string[] = [];
    const Probe = ({ rowId }: DisplayFieldCellProps) => {
      renders.push(rowId);
      return null;
    };
    const { provider } = createMachineProvider({ rows });
    let rerenderHost: (() => void) | null = null;
    function Host() {
      const [, setTick] = useState(0);
      rerenderHost = () => {
        setTick((tick) => tick + 1);
      };
      return (
        <Cards
          provider={provider}
          // A new array on every render, saying the same thing.
          fields={[
            { id: "name", header: "Name" },
            { id: "probe", header: "Probe", field: "status", cell: Probe },
          ]}
          title="name"
          label="Machines"
          selectable
        />
      );
    }
    render(<Host />);
    // The probe drew both cards: what follows is measured against that.
    expect(renders).toEqual(["m-1", "m-2"]);
    renders.length = 0;
    act(() => {
      rerenderHost?.();
    });
    expect(renders).toEqual([]);
    act(() => {
      provider.selection.toggle("m-2");
    });
    expect(renders).toEqual([]);
  });

  it("has no axe violation, selectable", async () => {
    const { view } = loadedCards(rows, { selectable: true });
    await expectNoAxeViolations(view.container);
  });

  it("has no axe violation with a status standing over kept cards", async () => {
    const { provider, source } = createMachineProvider();
    const view = render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
        selectable
      />,
    );
    act(() => {
      source.latest().deliver({ status: "succeeded", page: pageOf(rows) });
    });
    act(() => {
      provider.setSearch("alp");
    });
    act(() => {
      source.latest().deliver(failure("the inventory is unreachable"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    await expectNoAxeViolations(view.container);
  });
});

describe("Cards hydrating what the server drew", () => {
  it("draws the cards and checkboxes the server drew, with no mismatch", async () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const build = () => {
      const provider = createDataViewsProvider({
        collection: machines,
        source: createArraySource({ rows, collection: machines }),
      });
      provider.refresh();
      return (
        <Cards
          provider={provider}
          fields={fields}
          title="name"
          label="Machines"
          selectable
        />
      );
    };
    const container = document.createElement("div");
    container.innerHTML = renderToString(build());
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const drawn = container.innerHTML;
    expect(drawn).toContain("alpha");
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
    expect(
      within(container)
        .getAllByRole("listitem")
        .map((card) => card.querySelector(".title")?.textContent),
    ).toEqual(["alpha", "beta"]);
  });
});
