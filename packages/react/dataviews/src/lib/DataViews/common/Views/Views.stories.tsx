import type { ViewDraft, ViewStore } from "@canonical/dataviews-core";
import {
  createLocationBinding,
  createMemoryLocation,
  DEFAULT_WINDOW,
} from "@canonical/dataviews-core";
import type { IndexedDBFactory } from "@canonical/dataviews-core/indexeddb";
import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { consumerCode } from "../../../../storybook/machines/consumerCode.js";
import type { MachineProvider } from "../../../../storybook/machines/story-utils.js";
import {
  useMachineProvider,
  useStoryViewStore,
  withAppScope,
} from "../../../../storybook/machines/story-utils.js";
import DataTable from "../../../DataTable/DataTable.js";
import type { DataTableColumn } from "../../../DataTable/types.js";
import DataViews from "../../Provider.js";
import Component from "./Views.js";

const meta = {
  title: "_work_in_progress/DataViews/Views",
  component: Component,
  decorators: [withAppScope],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", resizable: true },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

const columnsCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", resizable: true },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];`;

const composition = `<DataViews provider={provider}>
  <DataViews.Views />
  <DataViews.Filters labels={{ status: "Status", cores: "Cores" }} />
  <DataTable provider={provider} columns={columns} label="Machines" />
  <DataViews.Pagination sizes={[5, 10, 25]} />
</DataViews>`;

const failedMachines: ViewDraft = {
  id: "failed-machines",
  name: "Failed machines",
  query: "as=table&status=failed",
};

/** The store's scope as every story's consumer code declares it. */
const parameters = consumerCode({
  parts: ["DataTable", "DataViews", "type DataTableColumn"],
  declarations: columnsCode,
  window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
  views: true,
  render: composition,
});

/** The root, its views control and the parts the views act on. */
function Collection({
  provider,
  children,
}: {
  readonly provider: MachineProvider;
  readonly children?: ReactNode;
}): ReactElement {
  return (
    <DataViews provider={provider}>
      <Component />
      <DataViews.Filters labels={{ status: "Status", cores: "Cores" }} />
      {children}
      <DataTable provider={provider} columns={columns} label="Machines" />
      <DataViews.Pagination sizes={[5, 10, 25]} />
    </DataViews>
  );
}

/** The machines over a story's own saved-view store, seeded as given. */
function SavedMachines({
  seed,
  indexedDB,
}: {
  readonly seed?: readonly ViewDraft[];
  readonly indexedDB?: IndexedDBFactory;
}): ReactElement {
  const { store } = useStoryViewStore({ seed, indexedDB });
  const provider = useMachineProvider({
    window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
    views: store,
  });
  return <Collection provider={provider} />;
}

type Canvas = ReturnType<typeof within>;

const views = (canvas: Canvas) =>
  within(canvas.getByRole("group", { name: "Saved views" }));

/** The views control's operation status. */
const outcome = (canvas: Canvas): HTMLElement | null =>
  canvas
    .getByRole("group", { name: "Saved views" })
    .querySelector('.status[role="status"]');

/** The pagination bar's summary. */
const summary = (canvas: Canvas): HTMLElement =>
  within(canvas.getByRole("navigation", { name: "Pagination" })).getByRole(
    "status",
  );

/** Open a view by name, once the store has listed it. */
const open = async (canvas: Canvas, name: string): Promise<void> => {
  const select = views(canvas).getByRole("combobox", { name: "View" });
  await within(select).findByRole("option", { name });
  await userEvent.selectOptions(select, name);
  await waitFor(() =>
    expect(outcome(canvas)).toHaveTextContent(`Opened "${name}".`),
  );
};

/**
 * Saved views: choosing a view applies its query — the filters, the table
 * and the pagination bar all follow it.
 */
export const SavedViews: Story = {
  parameters,
  render: () => <SavedMachines seed={[failedMachines]} />,
  play: async ({ canvas }) => {
    await open(canvas, "Failed machines");
    await waitFor(() =>
      expect(summary(canvas)).toHaveTextContent("Showing 1–3 out of 3 items"),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "failed" }),
    ).toBeChecked();
  },
};

/**
 * Saving as a new view: a name another view already has is refused beside
 * the input, before anything is written. A name that is free saves the live
 * query under it and opens the new view.
 */
export const SaveAsANewView: Story = {
  parameters,
  render: () => <SavedMachines seed={[failedMachines]} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "running" }));
    await waitFor(() =>
      expect(
        views(canvas).getByRole("button", { name: "Save as…" }),
      ).toBeEnabled(),
    );
    await userEvent.click(
      views(canvas).getByRole("button", { name: "Save as…" }),
    );
    const name = views(canvas).getByRole("textbox", { name: "Name" });
    await userEvent.type(name, "failed machines{Enter}");
    await waitFor(() =>
      expect(name).toHaveAccessibleDescription(
        'A view named "Failed machines" already exists.',
      ),
    );
    await expect(name).toHaveAttribute("aria-invalid", "true");
  },
};

/** Change a view as another tab would, from beside the collection. */
function AnotherTab({
  openAnotherTab,
}: {
  readonly openAnotherTab: () => ViewStore;
}): ReactElement {
  const [other] = useState(openAnotherTab);
  return (
    <Button
      type="button"
      importance="secondary"
      onClick={async () => {
        const found = await other.get(failedMachines.id);
        if (found.status === "found") {
          await other.update(found.view, { query: "as=table&status=pending" });
        }
      }}
    >
      Change it in another tab
    </Button>
  );
}

/**
 * Two tabs editing one view: the other tab saved the view first, so saving
 * here conflicts rather than overwriting it. The stored view is now the open
 * one: Overwrite saves this tab's query over it, and Discard changes applies
 * the stored query.
 */
export const AConflictBetweenTabs: Story = {
  parameters,
  render: function Render() {
    const { store, openAnotherTab } = useStoryViewStore({
      seed: [failedMachines],
    });
    const provider = useMachineProvider({
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
      views: store,
    });
    return (
      <Collection provider={provider}>
        <AnotherTab openAnotherTab={openAnotherTab} />
      </Collection>
    );
  },
  play: async ({ canvas }) => {
    await open(canvas, "Failed machines");
    await userEvent.click(
      canvas.getByRole("button", { name: "Change it in another tab" }),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "running" }));
    await userEvent.click(views(canvas).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(outcome(canvas)).toHaveTextContent(
        'Not saved: "Failed machines" was changed elsewhere.',
      ),
    );
    await expect(
      views(canvas).getByRole("button", { name: "Overwrite" }),
    ).toBeEnabled();
    await expect(
      views(canvas).getByRole("button", { name: "Discard changes" }),
    ).toBeEnabled();
  },
};

/**
 * Deleting a view asks first, naming it, with the focus on Cancel so a stray
 * Enter deletes nothing. Once deleted, the view goes and its query stays.
 */
export const DeletingAView: Story = {
  parameters,
  render: () => <SavedMachines seed={[failedMachines]} />,
  play: async ({ canvas }) => {
    await open(canvas, "Failed machines");
    await userEvent.click(
      views(canvas).getByRole("button", { name: "Delete…" }),
    );
    const confirm = views(canvas).getByRole("group", {
      name: 'Delete "Failed machines"? This cannot be undone.',
    });
    await expect(
      within(confirm).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
  },
};

/** A view saved with its own column widths. */
const wideHosts: ViewDraft = {
  id: "wide-hosts",
  name: "Wide hosts",
  query: "as=table",
  presentation: { "table.width.name": 320 },
};

/**
 * A view's arrangement: this view was saved with the Host column 320 pixels
 * wide, so opening it sets that width over the one the column declares.
 */
export const AViewsArrangement: Story = {
  parameters,
  render: () => <SavedMachines seed={[wideHosts]} />,
  play: async ({ canvas }) => {
    await open(canvas, "Wide hosts");
    await waitFor(() =>
      expect(
        Math.round(
          canvas
            .getByRole("columnheader", { name: /Host/ })
            .getBoundingClientRect().width,
        ),
      ).toBe(320),
    );
  },
};

/** Storage the browser refuses, as a private window or a site setting can. */
const refusedStorage: IndexedDBFactory = {
  open() {
    throw new DOMException(
      "the browser refused storage for this site",
      "SecurityError",
    );
  },
};

/**
 * Storage the browser refuses: the control says views are unavailable and
 * why, with a way to try again. The query, the filters and the table work as
 * before; nothing is kept in memory and passed off as saved.
 */
export const StorageUnavailable: Story = {
  parameters,
  render: () => <SavedMachines indexedDB={refusedStorage} />,
  play: async ({ canvas }) => {
    await views(canvas).findByText(
      "Saved views are unavailable: view storage is unavailable: the browser refused storage for this site.",
    );
    await expect(
      views(canvas).getByRole("button", { name: "Try again" }),
    ).toBeEnabled();
    await expect(
      views(canvas).getByRole("combobox", { name: "View" }),
    ).toBeDisabled();
  },
};

/** The query the location carries, shown the way an address bar would. */
function QueryInTheLocation({
  provider,
}: {
  readonly provider: MachineProvider;
}): ReactElement {
  // A memory location stands in for the browser's here, so the story never
  // rewrites the page's own address.
  const [location] = useState(() =>
    createMemoryLocation({ href: "/machines" }),
  );
  const binding = useMemo(
    () => createLocationBinding({ host: provider, location }),
    [provider, location],
  );
  useEffect(() => binding.observe(), [binding]);
  const query = useSyncExternalStore(location.subscribe, () =>
    location.read().toString(),
  );
  return (
    <p>
      <output aria-label="Location">{`/machines?${query}`}</output>
    </p>
  );
}

/**
 * The query in the URL: opening a view applies its query, and the location
 * binding writes that query to the location like any other edit. The query
 * travels in the link; the view itself stays in this browser.
 */
export const WithTheQueryInTheUrl: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "DataViews", "type DataTableColumn"],
    core: ["createLocationBinding", "createPlatformLocation"],
    coreTypes: ["DataViewsProvider"],
    imports: `import { machineSchema, machines } from "./machines.js";
import { platform } from "./router.js";`,
    hooks: ["useMemo"],
    declarations: `${columnsCode}

/** The URL as the query's other home: opening a view writes its query there. */
function UrlQuery({
  provider,
}: {
  provider: DataViewsProvider<typeof machineSchema.fields>;
}) {
  const binding = useMemo(
    () =>
      createLocationBinding({
        host: provider,
        location: createPlatformLocation(platform),
      }),
    [provider],
  );
  useEffect(() => binding.observe(), [binding]);
  return null;
}`,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    views: true,
    render: composition.replace(
      "  <DataViews.Views />",
      "  <UrlQuery provider={provider} />\n  <DataViews.Views />",
    ),
  }),
  render: function Render() {
    const { store } = useStoryViewStore({ seed: [failedMachines] });
    const provider = useMachineProvider({
      window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
      views: store,
    });
    return (
      <Collection provider={provider}>
        <QueryInTheLocation provider={provider} />
      </Collection>
    );
  },
  play: async ({ canvas }) => {
    await open(canvas, "Failed machines");
    await waitFor(() =>
      expect(canvas.getByLabelText("Location")).toHaveTextContent(
        "/machines?status=failed&page=1&size=5",
      ),
    );
  },
};
