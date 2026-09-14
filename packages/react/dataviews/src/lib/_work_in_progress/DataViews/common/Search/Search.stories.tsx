import {
  createMemoryLocation,
  type QueryLocation,
} from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { withAppScope } from "../../../../../storybook/decorators.js";
import { consumerCode } from "../../../../../storybook/machines/consumerCode.js";
import {
  type MachineProviderConfig,
  useMachineProvider,
} from "../../../../../storybook/machines/story-utils.js";
import { DataTable, type DataTableColumn } from "../../../DataTable/index.js";
import DataViews from "../../Provider.js";
import Component from "./Search.js";
import type { DataViewsSearchProps } from "./types.js";

const meta = {
  title: "_work_in_progress/DataViews/Search",
  component: Component,
  decorators: [withAppScope],
  args: {
    label: "Search machines",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "owner", header: "Owner" },
];

const columnsCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "owner", header: "Owner" },
];`;

const composition = `<DataViews provider={provider}>
  <DataViews.Search label="Search machines" />
  <DataTable provider={provider} columns={columns} label="Machines" />
</DataViews>`;

const parts = ["DataTable", "DataViews", "type DataTableColumn"];

/** The query the location carries, shown the way an address bar would. */
function QueryInTheLocation({
  location,
}: {
  readonly location: QueryLocation;
}): ReactElement {
  const query = useSyncExternalStore(location.subscribe, () =>
    location.read().toString(),
  );
  return (
    <p>
      <output aria-label="Location">{`/machines?${query}`}</output>
    </p>
  );
}

/** A composed collection: a root, its search and its table. */
function SearchedMachines({
  options,
  location,
  ...args
}: DataViewsSearchProps & {
  readonly options?: MachineProviderConfig | undefined;
  readonly location?: QueryLocation | undefined;
}): ReactElement {
  const provider = useMachineProvider({ ...options, location });
  return (
    <DataViews provider={provider}>
      <Component {...args} />
      {location === undefined ? null : (
        <QueryInTheLocation location={location} />
      )}
      <DataTable provider={provider} columns={columns} label="Machines" />
    </DataViews>
  );
}

const renderWith =
  (options?: MachineProviderConfig): NonNullable<Story["render"]> =>
  (args) => <SearchedMachines {...args} options={options} />;

/** The table's record rows: every row but the header's. */
const recordRows = (canvas: {
  getAllByRole: (role: string) => HTMLElement[];
}) => canvas.getAllByRole("row").length - 1;

/** The query the provider starts on: hosts and owners matching "ex:a". */
const searchingAna = "q=ex:a";

/**
 * Default: one labelled search input over the collection's search, which
 * this source reads across host names and owners. Nothing is applied, so
 * every machine shows.
 */
export const Default: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    render: composition,
  }),
  render: renderWith(),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("searchbox", { name: "Search machines" });
    await expect(input).toHaveValue("");
    await waitFor(() => expect(recordRows(canvas)).toBe(12));
    // Scripting is enabled here, so the baseline's submit control is hidden
    // and every edit applies as it is typed.
    await expect(
      canvas.getByRole("button", { name: "Search", hidden: true }),
    ).not.toBeVisible();
    await userEvent.type(input, "birch");
    await waitFor(() => expect(recordRows(canvas)).toBe(1));
  },
};

/**
 * A search applied: the provider started on a query searching for `ex:a`,
 * and the input shows it. The input is the applied search, not a draft of
 * it — there is no second query to apply or keep in step.
 */
export const SearchApplied: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    query: searchingAna,
    render: composition,
  }),
  render: renderWith({ query: searchingAna }),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("searchbox", { name: "Search machines" }),
    ).toHaveValue("ex:a");
    await waitFor(() => expect(recordRows(canvas)).toBe(1));
  },
};

/**
 * The search in the URL: with a location, every keystroke applies at once
 * and is written to the query string, each write replacing the entry rather
 * than pushing one — a memory location stands in for the browser's here, so
 * the writes show and the history stack does not — and Back restores the
 * applied search into the input, because the input shows the applied search
 * and nothing else.
 */
export const SearchInTheUrl: Story = {
  parameters: consumerCode({
    parts,
    core: ["createPlatformLocation"],
    imports: `import { machineCollection, machines } from "./machines.js";
import { platform } from "./router.js";`,
    declarations: columnsCode,
    location: "createPlatformLocation(platform)",
    render: composition,
  }),
  render: function Render(args) {
    // A memory location stands in for the browser's here, so the story
    // never rewrites the page's own address.
    const [location] = useState(() =>
      createMemoryLocation({ href: "/machines" }),
    );
    return <SearchedMachines {...args} location={location} />;
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("searchbox", { name: "Search machines" });
    await userEvent.type(input, "elm");
    await waitFor(() =>
      expect(canvas.getByLabelText("Location")).toHaveTextContent(
        "/machines?q=elm&page=1&size=50",
      ),
    );
    await waitFor(() => expect(recordRows(canvas)).toBe(1));
  },
};
