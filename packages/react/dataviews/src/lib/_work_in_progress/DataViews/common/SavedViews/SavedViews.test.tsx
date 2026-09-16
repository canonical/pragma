/**
 * The connected saved-views control over a store kept in memory — a test
 * double, which the shipped store never falls back to — so every outcome
 * can be brought about on cue: a conflict, a rejection, an unreadable
 * record.
 */
import {
  createArraySource,
  createCollection,
  createDataViewsProvider,
  type DataViewsProvider,
  type PresentationStore,
  type SavedView,
  type ViewStore,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import createMemoryViewStore from "../../../../../../testing/createMemoryViewStore.js";
import { createStandInPresentationStore } from "../../../../../../testing/createStandInStores.js";
import { buildStoredView } from "../../../../../../testing/fixtures.js";
import DataViews from "../../Provider.js";
import SavedViews from "./SavedViews.js";

/** One record of the collection; no case reads a row. */
type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

type Fields = typeof collection.schema.fields;

/** Restrict the query by status, as a filter control would. */
const setStatus = (
  provider: DataViewsProvider<Fields, Row>,
  operands: readonly ("failed" | "running")[],
): void => {
  act(() => {
    readProviderHost(provider).setPredicate({
      field: "status",
      operator: "isAny",
      operands,
    });
  });
};

const failed = buildStoredView({
  id: "v-failed",
  name: "Failed",
  query: "status=failed",
});
const running = buildStoredView({
  id: "v-running",
  name: "Running",
  query: "status=running",
});

/**
 * A provider over an empty local source, with its views in `store` and its
 * arrangement in `presentation`, or in memory.
 */
const createProviderOver = (
  store: ViewStore,
  presentation?: PresentationStore,
): DataViewsProvider<Fields, Row> =>
  createDataViewsProvider({
    collection,
    source: createArraySource<Row>({ rows: [], collection }),
    views: store,
    ...(presentation === undefined ? {} : { presentation }),
  });

const mount = (
  store: ViewStore,
  props: { label?: string } = {},
  presentation?: PresentationStore,
) => {
  const provider = createProviderOver(store, presentation);
  const rendered = render(
    <StrictMode>
      <DataViews provider={provider}>
        <SavedViews {...props} />
      </DataViews>
    </StrictMode>,
  );
  return { provider, ...rendered };
};

/** The control once its views are listed. */
const mountListed = async (
  store: ViewStore,
  presentation?: PresentationStore,
) => {
  const mounted = mount(store, {}, presentation);
  await waitFor(() => {
    expect(getSelect()).toBeEnabled();
  });
  return mounted;
};

const getGroup = () => screen.getByRole("group", { name: "Saved views" });
const getSelect = () =>
  screen.getByRole<HTMLSelectElement>("combobox", {
    name: "View",
  });
const getButton = (name: string) => screen.getByRole("button", { name });
const queryStatus = () => getGroup().querySelector('.status[role="status"]');
const queryNotices = () => getGroup().querySelector('.notices[role="status"]');

const choose = async (view: SavedView): Promise<void> => {
  // A view is offered once the store has listed it.
  await within(getSelect()).findByRole("option", { name: view.name });
  fireEvent.change(getSelect(), { target: { value: view.id } });
  await waitFor(() => {
    expect(getSelect()).toHaveValue(view.id);
  });
};

describe("DataViews.SavedViews", () => {
  it("is reachable as the composition's SavedViews part", () => {
    expect(DataViews.SavedViews).toBe(SavedViews);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<SavedViews />)).toThrow(
      "DataViews.SavedViews must be used inside a DataViews root",
    );
  });

  it("fails clearly over a provider given no store", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createArraySource<Row>({ rows: [], collection }),
    });
    expect(() =>
      render(
        <DataViews provider={provider}>
          <SavedViews />
        </DataViews>,
      ),
    ).toThrow(
      "DataViews.SavedViews requires a provider given a view store; pass one to createDataViewsProvider",
    );
  });

  it("is a named group that takes its root's native props and focus handlers", async () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const provider = createProviderOver(createMemoryViewStore().store);
    render(
      <DataViews provider={provider}>
        <SavedViews
          label="Machine views"
          className="toolbar"
          data-testid="views"
          style={{ order: 1 }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </DataViews>,
    );
    const root = screen.getByRole("group", { name: "Machine views" });
    expect(root).toHaveClass("ds", "data-views-saved-views", "toolbar");
    expect(root).toHaveAttribute("data-testid", "views");
    expect(root).toHaveStyle({ order: "1" });
    const picker = within(root).getByRole("combobox");
    await waitFor(() => {
      expect(picker).toBeEnabled();
    });
    act(() => {
      picker.focus();
      picker.blur();
    });
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
  it("says it is loading until the views are listed", async () => {
    mount(createMemoryViewStore([failed]).store);
    expect(queryNotices()).toHaveTextContent("Loading saved views…");
    expect(getSelect()).toBeDisabled();
    await waitFor(() => {
      expect(getSelect()).toBeEnabled();
    });
    expect(queryNotices()).toHaveTextContent("");
  });

  it("offers every view, and shows none open until one is chosen", async () => {
    await mountListed(createMemoryViewStore([running, failed]).store);
    expect(getSelect()).toHaveValue("");
    expect(
      within(getSelect())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["No saved view", "Failed", "Running"]);
    expect(getButton("Save")).toBeDisabled();
    expect(getButton("Rename…")).toBeDisabled();
    expect(getButton("Delete…")).toBeDisabled();
    expect(getButton("Save as…")).toBeEnabled();
  });

  it("opens a chosen view: its query applies, and it is the one shown", async () => {
    const { provider } = await mountListed(
      createMemoryViewStore([failed, running]).store,
    );
    await choose(failed);
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Opened "Failed".');
    });
    // The placeholder goes once a view is open.
    expect(within(getSelect()).queryByText("No saved view")).toBeNull();
  });

  it("marks the view modified once the query moves, and saves or reverts it", async () => {
    const { provider } = await mountListed(
      createMemoryViewStore([failed]).store,
    );
    await choose(failed);
    expect(screen.queryByText("Modified")).toBeNull();
    setStatus(provider, ["failed", "running"]);
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(getSelect()).toHaveAccessibleDescription("Modified");
    // The open confirmation is no longer true, so it goes.
    expect(queryStatus()).toHaveTextContent("");
    fireEvent.click(getButton("Revert"));
    expect(screen.queryByText("Modified")).toBeNull();
    setStatus(provider, ["running"]);
    getButton("Save").focus();
    fireEvent.click(getButton("Save"));
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Saved "Failed".');
    });
    // Save is unavailable once saved: the focus moves to the view select.
    await waitFor(() => {
      expect(getSelect()).toHaveFocus();
    });
    expect(screen.queryByText("Modified")).toBeNull();
    expect(getButton("Save")).toBeDisabled();
  });

  it("holds the name form's submit while a command is in flight", async () => {
    const { store } = createMemoryViewStore([failed]);
    let answer = (): void => {};
    const gated: ViewStore = {
      ...store,
      create: (draft) =>
        new Promise((settle) => {
          answer = () => {
            void store.create(draft).then(settle);
          };
        }),
    };
    await mountListed(gated);
    fireEvent.click(getButton("Save as…"));
    const form = screen.getByRole("form", { name: "Save as a new view" });
    const name = within(form).getByRole("textbox", { name: "Name" });
    fireEvent.change(name, { target: { value: "Running machines" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(
        within(form).getByRole("button", { name: "Save view" }),
      ).toBeDisabled();
    });
    act(() => {
      answer();
    });
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Saved "Running machines".');
    });
  });

  it("says it is saving, with every command held, until the store answers", async () => {
    const { store } = createMemoryViewStore([failed]);
    let answer = (): void => {};
    const gated: ViewStore = {
      ...store,
      update: (view, changes) =>
        new Promise((settle) => {
          answer = () => {
            void store.update(view, changes).then(settle);
          };
        }),
    };
    const { provider } = await mountListed(gated);
    await choose(failed);
    setStatus(provider, ["running"]);
    fireEvent.click(getButton("Save"));
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent("Saving…");
    });
    for (const name of ["Save", "Revert", "Save as…", "Rename…", "Delete…"]) {
      expect(getButton(name)).toBeDisabled();
    }
    act(() => {
      answer();
    });
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Saved "Failed".');
    });
  });

  it("saves the query as a new view, refusing an empty or taken name beside the input", async () => {
    const { provider } = await mountListed(
      createMemoryViewStore([failed]).store,
    );
    setStatus(provider, ["running"]);
    fireEvent.click(getButton("Save as…"));
    const form = screen.getByRole("form", { name: "Save as a new view" });
    const name = within(form).getByRole<HTMLInputElement>("textbox", {
      name: "Name",
    });
    expect(name).toHaveFocus();
    // A name is required natively, and nothing bypasses the check: an
    // empty one never reaches the store.
    expect(form).not.toHaveAttribute("novalidate");
    expect(name).toBeRequired();
    expect(name).toBeInvalid();
    fireEvent.click(within(form).getByRole("button", { name: "Save view" }));
    expect(queryStatus()).toHaveTextContent("");
    expect(getSelect().options).toHaveLength(2);

    // A blank name passes the native check and is refused by the
    // collection, which the input reports as its own validity.
    fireEvent.change(name, { target: { value: "   " } });
    expect(name).toBeValid();
    fireEvent.submit(form);
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription("A view needs a name.");
    });
    expect(name).toBeInvalid();
    expect(name.validationMessage).toBe("A view needs a name.");
    expect(name).toHaveFocus();

    // Editing the name clears the refusal, until the next answer.
    fireEvent.change(name, { target: { value: " failed " } });
    expect(name).toBeValid();
    expect(name).not.toHaveAccessibleDescription();
    fireEvent.submit(form);
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription(
        'A view named "Failed" already exists.',
      );
    });
    expect(name.validationMessage).toBe(
      'A view named "Failed" already exists.',
    );

    fireEvent.change(name, { target: { value: "Running machines" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Saved "Running machines".');
    });
    await waitFor(() => {
      expect(getButton("Save as…")).toHaveFocus();
    });
    expect(screen.queryByRole("form")).toBeNull();
    expect(getSelect().selectedOptions[0]).toHaveTextContent(
      "Running machines",
    );
  });

  it("cancels a panel with Escape, returning the focus to its command", async () => {
    await mountListed(createMemoryViewStore([failed]).store);
    await choose(failed);
    fireEvent.click(getButton("Save as…"));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("form")).toBeNull();
    await waitFor(() => {
      expect(getButton("Save as…")).toHaveFocus();
    });

    fireEvent.click(getButton("Delete…"));
    const cancel = getButton("Cancel");
    fireEvent.keyDown(cancel, { key: "Enter" });
    expect(cancel).toBeInTheDocument();
    fireEvent.keyDown(cancel, { key: "Escape" });
    await waitFor(() => {
      expect(getButton("Delete…")).toHaveFocus();
    });

    fireEvent.click(getButton("Rename…"));
    const name = screen.getByRole("textbox", { name: "Name" });
    fireEvent.keyDown(name, { key: "a" });
    fireEvent.click(getButton("Cancel"));
    await waitFor(() => {
      expect(getButton("Rename…")).toHaveFocus();
    });
  });

  it("renames the open view", async () => {
    await mountListed(createMemoryViewStore([failed, running]).store);
    await choose(failed);
    fireEvent.click(getButton("Rename…"));
    const form = screen.getByRole("form", { name: 'Rename "Failed"' });
    const name = within(form).getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("Failed");
    fireEvent.change(name, { target: { value: "Running" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription(
        'A view named "Running" already exists.',
      );
    });
    fireEvent.change(name, { target: { value: "Failures" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Renamed to "Failures".');
    });
    expect(getSelect().selectedOptions[0]).toHaveTextContent("Failures");
    await waitFor(() => {
      expect(getButton("Rename…")).toHaveFocus();
    });
  });

  it("asks before deleting, with the focus on Cancel, and keeps the query", async () => {
    const { provider } = await mountListed(
      createMemoryViewStore([failed]).store,
    );
    await choose(failed);
    fireEvent.click(getButton("Delete…"));
    const confirm = screen.getByRole("group", {
      name: 'Delete "Failed"? This cannot be undone.',
    });
    expect(
      within(confirm).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Delete view" }),
    );
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent("View deleted.");
    });
    expect(getSelect()).toHaveValue("");
    expect(getSelect()).toHaveFocus();
    expect(provider.state.get().slice.filter).toHaveLength(1);
  });

  it("returns the focus to Delete when the deletion fails", async () => {
    const { store } = createMemoryViewStore([failed]);
    await mountListed({
      ...store,
      remove: async () => {
        throw new Error("view storage failed: quota exceeded");
      },
    });
    await choose(failed);
    fireEvent.click(getButton("Delete…"));
    fireEvent.click(getButton("Delete view"));
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent(
        "Not deleted: view storage failed: quota exceeded.",
      );
    });
    await waitFor(() => {
      expect(getButton("Delete…")).toHaveFocus();
    });
  });

  it("recovers from a conflict by overwriting the stored view", async () => {
    const memory = createMemoryViewStore([failed]);
    const { provider } = await mountListed(memory.store);
    await choose(failed);
    memory.elsewhere(failed.id, { query: "status=running" });
    setStatus(provider, ["failed", "running"]);
    fireEvent.click(getButton("Save"));
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent(
        'Not saved: "Failed" was changed elsewhere.',
      );
    });
    fireEvent.click(getButton("Overwrite"));
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Saved "Failed".');
    });
    expect(getButton("Save")).toBeDisabled();
  });

  it("recovers from a conflict by discarding the changes, which settles it", async () => {
    const memory = createMemoryViewStore([failed]);
    const { provider } = await mountListed(memory.store);
    await choose(failed);
    memory.elsewhere(failed.id, { query: "status=running" });
    setStatus(provider, ["failed", "running"]);
    fireEvent.click(getButton("Save"));
    await waitFor(() => {
      expect(getButton("Discard changes")).toBeEnabled();
    });
    fireEvent.click(getButton("Discard changes"));
    expect(provider.state.get().slice.filter[0]?.operands).toEqual(["running"]);
    expect(screen.queryByText("Modified")).toBeNull();
    expect(queryStatus()).toHaveTextContent("");
    expect(getButton("Save")).toBeDisabled();
    expect(getButton("Revert")).toBeDisabled();
  });

  it("keeps the rename form open through a conflict, for a second try", async () => {
    const memory = createMemoryViewStore([failed]);
    await mountListed(memory.store);
    await choose(failed);
    memory.elsewhere(failed.id, { name: "Theirs" });
    fireEvent.click(getButton("Rename…"));
    const form = screen.getByRole("form");
    fireEvent.change(within(form).getByRole("textbox"), {
      target: { value: "Mine" },
    });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent(
        'Not renamed: "Theirs" was changed elsewhere.',
      );
    });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(queryStatus()).toHaveTextContent('Renamed to "Mine".');
    });
  });

  it("closes a panel whose view was deleted elsewhere, and keeps the focus", async () => {
    const memory = createMemoryViewStore([failed]);
    await mountListed(memory.store);
    await choose(failed);
    fireEvent.click(getButton("Rename…"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    act(() => {
      memory.drop(failed.id);
    });
    await waitFor(() => {
      expect(screen.queryByRole("form")).toBeNull();
    });
    expect(getSelect()).toHaveFocus();
    // Opening a view later does not bring the old panel back.
    await act(() =>
      memory.store.create({
        id: running.id,
        name: running.name,
        query: running.query,
        presentation: running.presentation,
      }),
    );
    await choose(running);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("says when views are unavailable, and tries again when asked", async () => {
    const { store } = createMemoryViewStore([failed]);
    let blocked = true;
    mount({
      ...store,
      list: () =>
        blocked
          ? Promise.reject(new Error("view storage is unavailable: blocked"))
          : store.list(),
    });
    await waitFor(() => {
      expect(queryNotices()).toHaveTextContent(
        "Saved views are unavailable: view storage is unavailable: blocked.",
      );
    });
    expect(getSelect()).toBeDisabled();
    expect(getButton("Save as…")).toBeDisabled();
    blocked = false;
    fireEvent.click(getButton("Try again"));
    await waitFor(() => {
      expect(getSelect()).toBeEnabled();
    });
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("counts the records it cannot read, and says when the arrangement is not saved", async () => {
    const { store } = createMemoryViewStore([failed]);
    const { provider } = await mountListed(
      {
        ...store,
        list: async () => ({
          views: [failed],
          unreadable: [
            { id: "old", reason: "record version 2 is not supported" },
          ],
        }),
      },
      createStandInPresentationStore({
        patchPresentation: vi
          .fn<PresentationStore["patchPresentation"]>()
          .mockRejectedValueOnce(
            new Error("view storage failed: quota exceeded"),
          )
          .mockResolvedValue({ status: "saved" }),
      }),
    );
    expect(queryNotices()).toHaveTextContent("1 saved view cannot be read.");
    act(() => {
      provider.presentation.arrange({ "table.width.name": 120 });
    });
    await waitFor(() => {
      expect(queryNotices()).toHaveTextContent(
        "The arrangement is not being saved: view storage failed: quota exceeded.",
      );
    });
    // Try again writes the change again; once it lands, the notice goes.
    fireEvent.click(getButton("Try again"));
    await waitFor(() => {
      expect(queryNotices()).not.toHaveTextContent(
        "The arrangement is not being saved",
      );
    });
  });

  it("hands the focus to Try again when the views become unavailable under it", async () => {
    const memory = createMemoryViewStore([failed]);
    let blocked = false;
    await mountListed({
      ...memory.store,
      list: () =>
        blocked
          ? Promise.reject(new Error("view storage is unavailable: blocked"))
          : memory.store.list(),
    });
    await choose(failed);
    getButton("Rename…").focus();
    blocked = true;
    act(() => {
      memory.elsewhere("nothing", {});
    });
    await waitFor(() => {
      expect(getButton("Try again")).toHaveFocus();
    });
  });

  it("takes back only focus that was lost, never from another element the user moved it to", async () => {
    const { provider } = await mountListed(
      createMemoryViewStore([failed]).store,
    );
    await choose(failed);
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    onTestFinished(() => {
      elsewhere.remove();
    });
    for (const moved of [false, true]) {
      setStatus(provider, ["running"]);
      act(() => {
        getButton("Save").focus();
        // Focus leaving for nowhere, as a browser blurs a control it removes.
        getButton("Save").blur();
        if (moved) {
          elsewhere.focus();
        }
      });
      setStatus(provider, ["failed"]);
      expect(moved ? elsewhere : getSelect()).toHaveFocus();
    }
  });

  it("sends the focus nowhere later once a deletion has placed it", async () => {
    const { provider } = await mountListed(
      createMemoryViewStore([failed]).store,
    );
    await choose(failed);
    fireEvent.click(getButton("Delete…"));
    fireEvent.click(getButton("Delete view"));
    await waitFor(() => {
      expect(getSelect()).toHaveFocus();
    });
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    onTestFinished(() => {
      elsewhere.remove();
    });
    elsewhere.focus();
    setStatus(provider, ["running"]);
    expect(elsewhere).toHaveFocus();
  });

  it("stops hearing the store once unmounted", async () => {
    const memory = createMemoryViewStore([failed]);
    const unsubscribe = vi.fn();
    const { unmount } = await mountListed({
      ...memory.store,
      subscribe: (listener) => {
        const stop = memory.store.subscribe(listener);
        return () => {
          unsubscribe();
          stop();
        };
      },
    });
    unmount();
    // StrictMode's rehearsal released once already; the kept mount now too.
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });
});
