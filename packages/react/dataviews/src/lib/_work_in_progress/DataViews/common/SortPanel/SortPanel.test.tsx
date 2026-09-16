/**
 * The rough sort panel: the reader's terms in precedence order, each moved
 * or removed through `setSort`, focus never stranded on a control that
 * disables or disappears, and what orders the rows said when the reader
 * states no term.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Profiler } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import expectNoAxeViolations from "../../../../../../testing/expectNoAxeViolations.js";
import {
  createMachineProvider,
  declareMachineOrdering,
  type MachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import readAnnouncements from "../../../../../../testing/readAnnouncements.js";
import DataViews from "../../Provider.js";
import SortPanel from "./SortPanel.js";

/** A panel inside a root over a source ordering by all three fields. */
const mount = (
  sort: Parameters<MachineProvider["setSort"]>[0] = [],
  defaultSort: Parameters<MachineProvider["setSort"]>[0] = [],
) => {
  const { provider } = createMachineProvider({
    rows: [machine("m-1", "alpha")],
    capabilities: declareMachineOrdering(null, defaultSort),
  });
  provider.setSort(sort);
  const view = render(
    <DataViews provider={provider}>
      <SortPanel />
    </DataViews>,
  );
  return { provider, view };
};

const findPanel = (): HTMLElement =>
  screen.getByRole("region", { name: "Sort" });

/** The listed terms, as the panel states each. */
const listTerms = (): readonly (string | null)[] =>
  within(findPanel())
    .queryAllByRole("listitem")
    .map((item) => item.querySelector("span")?.textContent ?? null);

/** One term's control, by the term it describes and its visible name. */
const findControl = (term: string, name: string): HTMLElement => {
  const item = within(findPanel())
    .getAllByRole("listitem")
    .find((entry) => entry.textContent?.startsWith(term));
  if (item === undefined) {
    throw new Error(`no term "${term}" is listed`);
  }
  return within(item).getByRole("button", { name });
};

const statusFirst = [
  { field: "status", direction: "asc" },
  { field: "cores", direction: "desc" },
  { field: "name", direction: "asc" },
] as const;

describe("DataViews.SortPanel", () => {
  /** Server markup of the panel hydrated in the document, with its links focusable first. */
  const hydratePanel = async (focusControl: string | null) => {
    const build = () => {
      const { provider } = createMachineProvider({
        rows: [machine("m-1", "alpha")],
        capabilities: declareMachineOrdering(null),
        location: createMemoryLocation({ href: "/machines" }),
      });
      provider.setSort(statusFirst);
      return (
        <DataViews provider={provider}>
          <SortPanel />
        </DataViews>
      );
    };
    const container = document.createElement("div");
    container.innerHTML = renderToString(build());
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    if (focusControl !== null) {
      container
        .querySelector<HTMLElement>(`a[data-control="${focusControl}"]`)
        ?.focus();
    }
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
    });
    const root = await act(async () => hydrateRoot(container, build()));
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
    });
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelector("a")).toBeNull();
    return container;
  };

  it("hands a focused link's focus to the button that replaces it", async () => {
    const container = await hydratePanel("cores:up");
    expect(document.activeElement).toBe(
      container.querySelector('button[data-control="cores:up"]'),
    );
  });

  it("takes no focus on hydration when no link had it", async () => {
    await hydratePanel(null);
    expect(document.activeElement).toBe(document.body);
  });

  it("is reachable as the composition's SortPanel part", () => {
    expect(DataViews.SortPanel).toBe(SortPanel);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<SortPanel />)).toThrow(
      "DataViews.SortPanel must be used inside a DataViews root",
    );
  });

  it("lists the reader's terms in precedence order, each with its direction", () => {
    mount(statusFirst);
    expect(listTerms()).toEqual([
      "status, ascending",
      "cores, descending",
      "name, ascending",
    ]);
    // Each control is described by the term it acts on.
    expect(findControl("cores", "Move up")).toHaveAccessibleDescription(
      "cores, descending",
    );
  });

  it("lists a term whose column a table hides, since hiding orders nothing", () => {
    const { provider } = mount(statusFirst);
    act(() => {
      provider.presentation.arrange({ "table.hidden": ["status", "cores"] });
    });
    expect(listTerms()).toEqual([
      "status, ascending",
      "cores, descending",
      "name, ascending",
    ]);
    expect(findControl("status", "Move down")).toBeEnabled();
  });

  it("names the panel by its label and each term by its field", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    provider.setSort([{ field: "cores", direction: "asc" }]);
    render(
      <DataViews provider={provider}>
        <SortPanel label="Order" />
      </DataViews>,
    );
    expect(
      within(screen.getByRole("region", { name: "Order" })).getByText(
        "cores, ascending",
      ),
    ).toBeInTheDocument();
  });

  it("moves a term up and down through setSort, every other term in place", () => {
    const { provider } = mount(statusFirst);
    fireEvent.click(findControl("name", "Move up"));
    expect(provider.state.get().slice.sort).toEqual([
      { field: "status", direction: "asc" },
      { field: "name", direction: "asc" },
      { field: "cores", direction: "desc" },
    ]);
    fireEvent.click(findControl("status", "Move down"));
    expect(listTerms()).toEqual([
      "name, ascending",
      "status, ascending",
      "cores, descending",
    ]);
  });

  it("offers no move past either end of the ordering", () => {
    mount(statusFirst);
    expect(findControl("status", "Move up")).toBeDisabled();
    expect(findControl("status", "Move down")).toBeEnabled();
    expect(findControl("name", "Move down")).toBeDisabled();
  });

  it("removes a term, promoting the terms after it", () => {
    const { provider } = mount(statusFirst);
    fireEvent.click(findControl("status", "Remove"));
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cores", direction: "desc" },
      { field: "name", direction: "asc" },
    ]);
  });

  it("moves focus to the term's Remove when the control it was on disables", () => {
    mount(statusFirst);
    const moveUp = findControl("cores", "Move up");
    moveUp.focus();
    fireEvent.click(moveUp);
    // Cores is first now, so its Move up is disabled under the focus.
    expect(listTerms().at(0)).toBe("cores, descending");
    expect(document.activeElement).toBe(findControl("cores", "Remove"));
  });

  it("moves focus to the next term's Remove, then to the panel, as terms leave", () => {
    mount([
      { field: "status", direction: "asc" },
      { field: "cores", direction: "desc" },
    ]);
    const remove = findControl("status", "Remove");
    remove.focus();
    fireEvent.click(remove);
    expect(document.activeElement).toBe(findControl("cores", "Remove"));
    fireEvent.click(findControl("cores", "Remove"));
    expect(document.activeElement).toBe(findPanel());
  });

  it("hands focus to the Remove standing where a removed term stood", () => {
    mount(statusFirst);
    const middle = findControl("cores", "Remove");
    middle.focus();
    fireEvent.click(middle);
    expect(document.activeElement).toBe(findControl("name", "Remove"));
    // The last term leaves: the Remove now last takes focus.
    fireEvent.click(findControl("name", "Remove"));
    expect(document.activeElement).toBe(findControl("status", "Remove"));
  });

  it("leaves focus alone once it has moved out of the panel", () => {
    const { provider } = mount(statusFirst);
    findControl("cores", "Remove").focus();
    const outside = document.createElement("button");
    document.body.append(outside);
    onTestFinished(() => {
      outside.remove();
    });
    outside.focus();
    act(() => {
      provider.setSort([]);
    });
    expect(document.activeElement).toBe(outside);
  });

  it("leaves focus alone when it is elsewhere as the ordering changes", () => {
    const { provider } = mount(statusFirst);
    const outside = document.createElement("button");
    document.body.append(outside);
    onTestFinished(() => {
      outside.remove();
    });
    outside.focus();
    act(() => {
      provider.setSort([]);
    });
    expect(document.activeElement).toBe(outside);
  });

  it("says the source's own order orders the rows while the reader states no term", () => {
    mount([], [{ field: "cores", direction: "desc" }]);
    expect(within(findPanel()).queryByRole("list")).not.toBeInTheDocument();
    expect(findPanel()).toHaveTextContent(
      "Sorted by the source's own order: cores, descending.",
    );
  });

  it("says nothing orders the rows when the source documents no order", () => {
    mount();
    expect(findPanel()).toHaveTextContent(
      "Not sorted: the source documents no order.",
    );
  });

  it("spreads native props onto its section and merges its class", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    render(
      <DataViews provider={provider}>
        <SortPanel className="aside" data-testid="panel" />
      </DataViews>,
    );
    expect(screen.getByTestId("panel")).toHaveClass(
      "ds",
      "data-views-sort-panel",
      "aside",
    );
  });

  it("has no axe violation over a list of terms", async () => {
    const { view } = mount(statusFirst);
    await expectNoAxeViolations(view.container);
  });

  it("has no axe violation while it says what orders the rows", async () => {
    const ordered = mount([], [{ field: "cores", direction: "desc" }]);
    await expectNoAxeViolations(ordered.view.container);
    ordered.view.unmount();
    const unordered = mount();
    await expectNoAxeViolations(unordered.view.container);
  });

  it("renders nothing again for a publication that leaves the terms alone", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    provider.setSort([{ field: "status", direction: "asc" }]);
    let commits = 0;
    render(
      <DataViews provider={provider}>
        <Profiler
          id="panel"
          onRender={() => {
            commits += 1;
          }}
        >
          <SortPanel />
        </Profiler>
      </DataViews>,
    );
    commits = 0;
    // A refresh publishes pending, then the rows: neither moves the terms.
    act(() => {
      provider.refresh();
    });
    expect(commits).toBe(0);
    // A search publishes a copied slice whose terms read the same.
    act(() => {
      provider.setSearch("alpha");
    });
    expect(commits).toBe(0);
    act(() => {
      provider.setSort([{ field: "cores", direction: "desc" }]);
    });
    expect(commits).toBeGreaterThan(0);
  });

  it("says through the root's announcer the ordering a move leaves", async () => {
    mount(statusFirst);
    fireEvent.click(findControl("name", "Move up"));
    expect(await readAnnouncements()).toEqual([
      "Sorted by status, ascending; then name, ascending; then cores, descending.",
    ]);
  });

  it("says the source's own order once the last term is removed, or that nothing orders the rows", async () => {
    const ordered = mount(
      [{ field: "status", direction: "asc" }],
      [{ field: "cores", direction: "desc" }],
    );
    fireEvent.click(findControl("status", "Remove"));
    expect(await readAnnouncements()).toEqual([
      "Sorted by the source's own order: cores, descending.",
    ]);
    ordered.view.unmount();
    mount([{ field: "status", direction: "asc" }]);
    fireEvent.click(findControl("status", "Remove"));
    expect(await readAnnouncements()).toEqual([
      "Not sorted: the source documents no order.",
    ]);
  });

  it("says why the source refused a change, which changes nothing", async () => {
    const { provider } = mount(statusFirst);
    const limited = createMachineProvider({
      capabilities: declareMachineOrdering(1),
    }).provider;
    const [refusal] = limited.setSort(statusFirst);
    if (refusal === undefined) {
      throw new Error("a source ordering by one term accepted three");
    }
    const setSort = vi
      .spyOn(provider, "setSort")
      .mockReturnValue([{ ...refusal, reason: "this source is busy" }]);
    onTestFinished(() => {
      setSort.mockRestore();
    });
    fireEvent.click(findControl("cores", "Move up"));
    expect(await readAnnouncements()).toEqual([
      "Sort unchanged: this source is busy.",
    ]);
    expect(listTerms()).toEqual([
      "status, ascending",
      "cores, descending",
      "name, ascending",
    ]);
  });

  it("speaks its root's words", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    provider.setSort([{ field: "cores", direction: "asc" }]);
    render(
      <DataViews
        provider={provider}
        messages={{
          sortPanel: "Tri",
          sortTerm: (name) => `terme ${name}`,
          removeSortTerm: "Retirer",
        }}
      >
        <SortPanel />
      </DataViews>,
    );
    const panel = screen.getByRole("region", { name: "Tri" });
    expect(within(panel).getByText("terme cores")).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Retirer" }),
    ).toHaveAccessibleDescription("terme cores");
  });
});
