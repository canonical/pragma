import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import {
  createMockApiLoader,
  createRestHandlers,
} from "../../../storybook/machines/api/index.js";
import { SERVER_BACKED_FACETS } from "../../../storybook/machines/constants.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import { createPendingSource } from "../../../storybook/machines/fixtures.js";
import readPaginationSummary from "../../../storybook/machines/readPaginationSummary.js";
import { createRestMachineSource } from "../../../storybook/machines/sources/index.js";
import {
  type MachineProviderConfig,
  useMachineProvider,
} from "../../../storybook/machines/story-utils.js";
import type { DataTableColumn } from "../DataTable/index.js";
import { FacetBarChart as ConnectedChart } from "../DataViews/common/FacetBarChart/index.js";
import { DataViews } from "../DataViews/index.js";
import Component from "./FacetBarChart.js";

const meta = {
  title: "_work_in_progress/FacetBarChart",
  component: Component,
  decorators: [withAppScope],
  args: {
    field: "status",
    label: "Machines by status",
  },
  argTypes: {
    provider: { control: false },
    renderStatus: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

/** The table beside the chart. */
const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
];

/** The import every story's code shows for a part not yet on the root. */
const prototypeImports = `import { machineCollection, machines } from "./machines.js";
// A work-in-progress prototype: not yet exported from the package root.
import { FacetBarChart } from "./FacetBarChart.js";`;

/** The chart over a provider bound to the story's own source. */
function MachineChart({
  field,
  label,
  options,
}: {
  readonly field: string;
  readonly label: string;
  readonly options?: MachineProviderConfig | undefined;
}): ReactElement {
  const provider = useMachineProvider({ facets: ["status"], ...options });
  return <Component provider={provider} field={field} label={label} />;
}

/**
 * Status counts: a bar per status, as long as the number of machines holding
 * it, counted by the source over every machine the query matches. The numbers
 * are in the table that follows the drawing.
 */
export const StatusCounts: Story = {
  render: ({ field, label }) => <MachineChart field={field} label={label} />,
  parameters: consumerCode({
    // A prototype: nothing of it is exported from the package root to name.
    parts: [],
    imports: prototypeImports,
    facets: ["status"],
    render: `<FacetBarChart provider={provider} field="status" label="Machines by status" />`,
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", {
        name: "Machines by status: a bar chart of how many records hold each value",
      }),
    ).toBeVisible();
  },
};

/** The chart beside the filters, a table and its pagination, over one root. */
function BesideFiltersMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({
    query: "page=1&size=5",
    facets: ["status", "cores"],
  });
  return (
    <DataViews provider={provider}>
      <DataViews.Filters />
      <ConnectedChart field="status" label={label} />
      <DataViews.DataTable
        columns={columns}
        label="Machines"
        rowLabel={(row) => String(row["name"])}
      />
      <DataViews.Pagination sizes={[5, 10]} />
    </DataViews>
  );
}

/**
 * Beside the filters: keeping only the failed machines narrows the table,
 * while the chart keeps every status's count, since a facet lifts its own
 * field's filter. The chart is never drawn from the page of rows on screen.
 */
export const BesideFilters: Story = {
  render: ({ label }) => <BesideFiltersMachines label={label} />,
  parameters: consumerCode({
    parts: ["DataViews", "type DataTableColumn"],
    imports: `import { machineCollection, machines } from "./machines.js";
// A work-in-progress prototype: not yet exported from the package root.
import { FacetBarChart } from "./DataViews/FacetBarChart.js";`,
    query: "page=1&size=5",
    facets: ["status", "cores"],
    declarations: `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
];`,
    render: `<DataViews provider={provider}>
  <DataViews.Filters />
  <FacetBarChart field="status" label="Machines by status" />
  <DataViews.DataTable columns={columns} label="Machines" />
  <DataViews.Pagination sizes={[5, 10]} />
</DataViews>`,
  }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 rows",
      ),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: /^failed/ }));
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–3 out of 3 rows",
      ),
    );
    const table = canvas.getByRole("table", {
      name: "Machines by status, as a table",
    });
    await expect(
      within(table).getByRole("rowheader", { name: "running" })
        .nextElementSibling,
    ).toHaveTextContent("6");
  },
};

/** Loading: the source has not answered, so the chart says so and draws nothing. */
export const Loading: Story = {
  render: ({ field, label }) => (
    <MachineChart
      field={field}
      label={label}
      options={{ source: createPendingSource }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Loading…")).toBeVisible();
  },
};

/** The chart over the REST endpoint, which computes its facets. */
function RestBackedMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({
    source: () => createRestMachineSource("live"),
    query: "page=1&size=5",
    facets: SERVER_BACKED_FACETS,
  });
  return (
    <DataViews provider={provider}>
      <ConnectedChart field="status" label={label} />
    </DataViews>
  );
}

/**
 * REST-backed: the same chart over a REST endpoint reached through TanStack
 * Query. The endpoint counts each status over every machine it matches, and
 * the chart draws what it answers.
 */
export const RestBacked: Story = {
  loaders: [createMockApiLoader(createRestHandlers({ latency: 300 }))],
  render: ({ label }) => <RestBackedMachines label={label} />,
  play: async ({ canvas }) => {
    const table = await canvas.findByRole(
      "table",
      { name: "Machines by status, as a table" },
      { timeout: 3000 },
    );
    await expect(
      within(table)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent),
    ).toEqual(["running", "failed", "pending"]);
  },
};
