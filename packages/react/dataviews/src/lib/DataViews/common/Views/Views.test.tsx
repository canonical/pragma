/**
 * The connected views control over a store kept in memory — a test double,
 * which the shipped store never falls back to — so every outcome can be
 * brought about on cue: a conflict, a rejection, an unreadable record.
 */
import type {
  DataViewsProvider,
  SavedView,
  ViewStore,
} from "@canonical/dataviews-core";
import {
  createArraySource,
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
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
import DataViews from "../../Provider.js";
import Views from "./Views.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

type Fields = typeof schema.fields;

const capabilities = createArraySource({ rows: [], schema }).capabilities;

const stamp = "2026-09-11T00:00:00.000Z";

const viewNamed = (id: string, name: string, query: string): SavedView => ({
  id,
  name,
  query,
  presentation: null,
  revision: 1,
  pinned: false,
  createdAt: stamp,
  updatedAt: stamp,
});

/** A view store in memory: the contract's outcomes, with none of its storage. */
const memoryStore = (seed: readonly SavedView[] = []) => {
  const records = new Map(seed.map((view) => [view.id, view]));
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };
  const store: ViewStore = {
    list: async () => ({ views: [...records.values()], unreadable: [] }),
    get: async (id) => {
      const view = records.get(id);
      return view === undefined
        ? { status: "missing" }
        : { status: "found", view };
    },
    create: async (draft) => {
      const view: SavedView = {
        ...viewNamed(draft.id, draft.name, draft.query),
        presentation: draft.presentation ?? null,
      };
      records.set(view.id, view);
      notify();
      return { status: "saved", view };
    },
    update: async ({ id, revision }, changes) => {
      const view = records.get(id);
      if (view === undefined) {
        return { status: "missing" };
      }
      if (view.revision !== revision) {
        return { status: "conflict", view };
      }
      const next = { ...view, ...changes, revision: revision + 1 };
      records.set(id, next);
      notify();
      return { status: "saved", view: next };
    },
    remove: async ({ id, revision }) => {
      const view = records.get(id);
      if (view !== undefined && view.revision !== revision) {
        return { status: "conflict", view };
      }
      records.delete(id);
      notify();
      return { status: "removed" };
    },
    pin: async () => ({ status: "saved" }),
    unpin: async () => ({ status: "saved" }),
    readPresentation: async () => ({}),
    patchPresentation: async () => ({ status: "saved" }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {},
  };
  /** Change a record as another tab would, and tell this one. */
  const elsewhere = (id: string, changes: Partial<SavedView>): void => {
    const view = records.get(id);
    if (view !== undefined) {
      records.set(id, { ...view, ...changes, revision: view.revision + 1 });
    }
    notify();
  };
  const drop = (id: string): void => {
    records.delete(id);
    notify();
  };
  return { store, elsewhere, drop };
};

const failed = viewNamed("v-failed", "Failed", "as=table&status=failed");
const running = viewNamed("v-running", "Running", "as=table&status=running");

const providerOver = (store: ViewStore): DataViewsProvider<Fields> =>
  createDataViewsProvider<Fields>({ schema, capabilities, views: store });

const mount = (store: ViewStore, props: { label?: string } = {}) => {
  const provider = providerOver(store);
  const rendered = render(
    <StrictMode>
      <DataViews provider={provider}>
        <Views {...props} />
      </DataViews>
    </StrictMode>,
  );
  return { provider, ...rendered };
};

/** The control once its views are listed. */
const listed = async (store: ViewStore) => {
  const mounted = mount(store);
  await waitFor(() => {
    expect(select()).toBeEnabled();
  });
  return mounted;
};

const group = () => screen.getByRole("group", { name: "Saved views" });
const select = () =>
  screen.getByRole<HTMLSelectElement>("combobox", {
    name: "View",
  });
const button = (name: string) => screen.getByRole("button", { name });
const status = () => group().querySelector('.status[role="status"]');
const notices = () => group().querySelector('.notices[role="status"]');

const choose = async (view: SavedView): Promise<void> => {
  // A view is offered once the store has listed it.
  await within(select()).findByRole("option", { name: view.name });
  fireEvent.change(select(), { target: { value: view.id } });
  await waitFor(() => {
    expect(select()).toHaveValue(view.id);
  });
};

describe("DataViews.Views", () => {
  it("is reachable as the composition's Views part", () => {
    expect(DataViews.Views).toBe(Views);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<Views />)).toThrow(
      "DataViews.Views must be used inside a DataViews root",
    );
  });

  it("fails clearly over a provider given no store", () => {
    const provider = createDataViewsProvider<Fields>({ schema });
    expect(() =>
      render(
        <DataViews provider={provider}>
          <Views />
        </DataViews>,
      ),
    ).toThrow(
      "DataViews.Views requires a provider given a view store; pass one to createDataViewsProvider",
    );
  });

  it("is a named group that takes its root's native props and focus handlers", async () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const provider = providerOver(memoryStore().store);
    render(
      <DataViews provider={provider}>
        <Views
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
    expect(root).toHaveClass("ds", "data-views-views", "toolbar");
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
    mount(memoryStore([failed]).store);
    expect(notices()).toHaveTextContent("Loading saved views…");
    expect(select()).toBeDisabled();
    await waitFor(() => {
      expect(select()).toBeEnabled();
    });
    expect(notices()).toHaveTextContent("");
  });

  it("offers every view, and shows none open until one is chosen", async () => {
    await listed(memoryStore([running, failed]).store);
    expect(select()).toHaveValue("");
    expect(
      within(select())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["No saved view", "Failed", "Running"]);
    expect(button("Save")).toBeDisabled();
    expect(button("Rename…")).toBeDisabled();
    expect(button("Delete…")).toBeDisabled();
    expect(button("Save as…")).toBeEnabled();
  });

  it("opens a chosen view: its query applies, and it is the one shown", async () => {
    const { provider } = await listed(memoryStore([failed, running]).store);
    await choose(failed);
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    await waitFor(() => {
      expect(status()).toHaveTextContent('Opened "Failed".');
    });
    // The placeholder goes once a view is open.
    expect(within(select()).queryByText("No saved view")).toBeNull();
  });

  it("marks the view modified once the query moves, and saves or resets it", async () => {
    const { provider } = await listed(memoryStore([failed]).store);
    await choose(failed);
    expect(screen.queryByText("Modified")).toBeNull();
    act(() => {
      provider.fields.status.eq.set(["failed", "running"]);
    });
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(select()).toHaveAccessibleDescription("Modified");
    // The open confirmation is no longer true, so it goes.
    expect(status()).toHaveTextContent("");
    fireEvent.click(button("Reset"));
    expect(screen.queryByText("Modified")).toBeNull();
    act(() => {
      provider.fields.status.eq.set(["running"]);
    });
    button("Save").focus();
    fireEvent.click(button("Save"));
    await waitFor(() => {
      expect(status()).toHaveTextContent('Saved "Failed".');
    });
    // Save is unavailable once saved: the focus moves to the view select.
    await waitFor(() => {
      expect(select()).toHaveFocus();
    });
    expect(screen.queryByText("Modified")).toBeNull();
    expect(button("Save")).toBeDisabled();
  });

  it("says it is saving, with every command held, until the store answers", async () => {
    const { store } = memoryStore([failed]);
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
    const { provider } = await listed(gated);
    await choose(failed);
    act(() => {
      provider.fields.status.eq.set(["running"]);
    });
    fireEvent.click(button("Save"));
    await waitFor(() => {
      expect(status()).toHaveTextContent("Saving…");
    });
    for (const name of ["Save", "Reset", "Save as…", "Rename…", "Delete…"]) {
      expect(button(name)).toBeDisabled();
    }
    act(() => {
      answer();
    });
    await waitFor(() => {
      expect(status()).toHaveTextContent('Saved "Failed".');
    });
  });

  it("saves the query as a new view, refusing an empty or taken name beside the input", async () => {
    const { provider } = await listed(memoryStore([failed]).store);
    act(() => {
      provider.fields.status.eq.set(["running"]);
    });
    fireEvent.click(button("Save as…"));
    const form = screen.getByRole("form", { name: "Save as a new view" });
    const name = within(form).getByRole("textbox", { name: "Name" });
    expect(name).toHaveFocus();

    fireEvent.click(within(form).getByRole("button", { name: "Save view" }));
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription("A view needs a name.");
    });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveFocus();

    fireEvent.change(name, { target: { value: " failed " } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription(
        'A view named "Failed" already exists.',
      );
    });

    fireEvent.change(name, { target: { value: "Running machines" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(status()).toHaveTextContent('Saved "Running machines".');
    });
    await waitFor(() => {
      expect(button("Save as…")).toHaveFocus();
    });
    expect(screen.queryByRole("form")).toBeNull();
    expect(select().selectedOptions[0]).toHaveTextContent("Running machines");
  });

  it("cancels a panel with Escape, returning the focus to its command", async () => {
    await listed(memoryStore([failed]).store);
    await choose(failed);
    fireEvent.click(button("Save as…"));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("form")).toBeNull();
    await waitFor(() => {
      expect(button("Save as…")).toHaveFocus();
    });

    fireEvent.click(button("Delete…"));
    const cancel = button("Cancel");
    fireEvent.keyDown(cancel, { key: "Enter" });
    expect(cancel).toBeInTheDocument();
    fireEvent.keyDown(cancel, { key: "Escape" });
    await waitFor(() => {
      expect(button("Delete…")).toHaveFocus();
    });

    fireEvent.click(button("Rename…"));
    const name = screen.getByRole("textbox", { name: "Name" });
    fireEvent.keyDown(name, { key: "a" });
    fireEvent.click(button("Cancel"));
    await waitFor(() => {
      expect(button("Rename…")).toHaveFocus();
    });
  });

  it("renames the open view", async () => {
    await listed(memoryStore([failed, running]).store);
    await choose(failed);
    fireEvent.click(button("Rename…"));
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
      expect(status()).toHaveTextContent('Renamed to "Failures".');
    });
    expect(select().selectedOptions[0]).toHaveTextContent("Failures");
    await waitFor(() => {
      expect(button("Rename…")).toHaveFocus();
    });
  });

  it("asks before deleting, with the focus on Cancel, and keeps the query", async () => {
    const { provider } = await listed(memoryStore([failed]).store);
    await choose(failed);
    fireEvent.click(button("Delete…"));
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
      expect(status()).toHaveTextContent("View deleted.");
    });
    expect(select()).toHaveValue("");
    expect(select()).toHaveFocus();
    expect(provider.state.get().slice.filter).toHaveLength(1);
  });

  it("returns the focus to Delete when the deletion fails", async () => {
    const { store } = memoryStore([failed]);
    await listed({
      ...store,
      remove: async () => {
        throw new Error("view storage failed: quota exceeded");
      },
    });
    await choose(failed);
    fireEvent.click(button("Delete…"));
    fireEvent.click(button("Delete view"));
    await waitFor(() => {
      expect(status()).toHaveTextContent(
        "Not deleted: view storage failed: quota exceeded.",
      );
    });
    await waitFor(() => {
      expect(button("Delete…")).toHaveFocus();
    });
  });

  it("recovers from a conflict by overwriting the stored view", async () => {
    const memory = memoryStore([failed]);
    const { provider } = await listed(memory.store);
    await choose(failed);
    memory.elsewhere(failed.id, { query: "as=table&status=running" });
    act(() => {
      provider.fields.status.eq.set(["failed", "running"]);
    });
    fireEvent.click(button("Save"));
    await waitFor(() => {
      expect(status()).toHaveTextContent(
        'Not saved: "Failed" was changed elsewhere.',
      );
    });
    fireEvent.click(button("Overwrite"));
    await waitFor(() => {
      expect(status()).toHaveTextContent('Saved "Failed".');
    });
    expect(button("Save")).toBeDisabled();
  });

  it("recovers from a conflict by discarding the changes, which settles it", async () => {
    const memory = memoryStore([failed]);
    const { provider } = await listed(memory.store);
    await choose(failed);
    memory.elsewhere(failed.id, { query: "as=table&status=running" });
    act(() => {
      provider.fields.status.eq.set(["failed", "running"]);
    });
    fireEvent.click(button("Save"));
    await waitFor(() => {
      expect(button("Discard changes")).toBeEnabled();
    });
    fireEvent.click(button("Discard changes"));
    expect(provider.state.get().slice.filter[0].operands).toEqual(["running"]);
    expect(screen.queryByText("Modified")).toBeNull();
    expect(status()).toHaveTextContent("");
    expect(button("Save")).toBeDisabled();
    expect(button("Reset")).toBeDisabled();
  });

  it("keeps the rename form open through a conflict, for a second try", async () => {
    const memory = memoryStore([failed]);
    await listed(memory.store);
    await choose(failed);
    memory.elsewhere(failed.id, { name: "Theirs" });
    fireEvent.click(button("Rename…"));
    const form = screen.getByRole("form");
    fireEvent.change(within(form).getByRole("textbox"), {
      target: { value: "Mine" },
    });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(status()).toHaveTextContent(
        'Not renamed: "Theirs" was changed elsewhere.',
      );
    });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(status()).toHaveTextContent('Renamed to "Mine".');
    });
  });

  it("closes a panel whose view was deleted elsewhere, and keeps the focus", async () => {
    const memory = memoryStore([failed]);
    await listed(memory.store);
    await choose(failed);
    fireEvent.click(button("Rename…"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    act(() => {
      memory.drop(failed.id);
    });
    await waitFor(() => {
      expect(screen.queryByRole("form")).toBeNull();
    });
    expect(select()).toHaveFocus();
    // Opening a view later does not bring the old panel back.
    await act(() =>
      memory.store.create({
        id: running.id,
        name: running.name,
        query: running.query,
      }),
    );
    await choose(running);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("says when views are unavailable, and tries again when asked", async () => {
    const { store } = memoryStore([failed]);
    let blocked = true;
    mount({
      ...store,
      list: () =>
        blocked
          ? Promise.reject(new Error("view storage is unavailable: blocked"))
          : store.list(),
    });
    await waitFor(() => {
      expect(notices()).toHaveTextContent(
        "Saved views are unavailable: view storage is unavailable: blocked.",
      );
    });
    expect(select()).toBeDisabled();
    expect(button("Save as…")).toBeDisabled();
    blocked = false;
    fireEvent.click(button("Try again"));
    await waitFor(() => {
      expect(select()).toBeEnabled();
    });
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("counts the records it cannot read, and says when column widths are not saved", async () => {
    const { store } = memoryStore([failed]);
    const { provider } = await listed({
      ...store,
      list: async () => ({
        views: [failed],
        unreadable: [
          { id: "old", reason: "record version 2 is not supported" },
        ],
      }),
      patchPresentation: async () => {
        throw new Error("view storage failed: quota exceeded");
      },
    });
    expect(notices()).toHaveTextContent("1 saved view cannot be read.");
    act(() => {
      provider.views?.arrange({ "table.width.name": 120 });
    });
    await waitFor(() => {
      expect(notices()).toHaveTextContent(
        "Column widths are not being saved: view storage failed: quota exceeded.",
      );
    });
    expect(button("Try again")).toBeEnabled();
  });

  it("hands the focus to Try again when the views become unavailable under it", async () => {
    const memory = memoryStore([failed]);
    let blocked = false;
    await listed({
      ...memory.store,
      list: () =>
        blocked
          ? Promise.reject(new Error("view storage is unavailable: blocked"))
          : memory.store.list(),
    });
    await choose(failed);
    button("Rename…").focus();
    blocked = true;
    act(() => {
      memory.elsewhere("nothing", {});
    });
    await waitFor(() => {
      expect(button("Try again")).toHaveFocus();
    });
  });

  it("takes back only focus that was lost, never from another element the user moved it to", async () => {
    const { provider } = await listed(memoryStore([failed]).store);
    await choose(failed);
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    onTestFinished(() => {
      elsewhere.remove();
    });
    for (const moved of [false, true]) {
      act(() => {
        provider.fields.status.eq.set(["running"]);
      });
      act(() => {
        button("Save").focus();
        // Focus leaving for nowhere, as a browser blurs a control it removes.
        button("Save").blur();
        if (moved) {
          elsewhere.focus();
        }
      });
      act(() => {
        provider.fields.status.eq.set(["failed"]);
      });
      expect(moved ? elsewhere : select()).toHaveFocus();
    }
  });

  it("sends the focus nowhere later once a deletion has placed it", async () => {
    const { provider } = await listed(memoryStore([failed]).store);
    await choose(failed);
    fireEvent.click(button("Delete…"));
    fireEvent.click(button("Delete view"));
    await waitFor(() => {
      expect(select()).toHaveFocus();
    });
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    onTestFinished(() => {
      elsewhere.remove();
    });
    elsewhere.focus();
    act(() => {
      provider.fields.status.eq.set(["running"]);
    });
    expect(elsewhere).toHaveFocus();
  });

  it("stops hearing the store once unmounted", async () => {
    const memory = memoryStore([failed]);
    const unsubscribe = vi.fn();
    const { unmount } = await listed({
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
