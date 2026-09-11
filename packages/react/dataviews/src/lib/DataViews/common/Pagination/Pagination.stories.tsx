import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, waitFor } from "storybook/test";
import { consumerCode } from "../../../../storybook/machines/consumerCode.js";
import type {
  MachineProvider,
  MachineProviderOptions,
} from "../../../../storybook/machines/story-utils.js";
import {
  useMachineProvider,
  withAppScope,
} from "../../../../storybook/machines/story-utils.js";
import DataTable from "../../../DataTable/DataTable.js";
import type { DataTableColumn } from "../../../DataTable/types.js";
import DataViews from "../../Provider.js";
import Component from "./Pagination.js";
import type { PaginationProps } from "./types.js";

const meta = {
  title: "_work_in_progress/DataViews/Pagination",
  component: Component,
  decorators: [withAppScope],
  args: {
    sizes: [5, 10, 25],
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
  <DataTable provider={provider} columns={columns} label="Machines" />
  <DataViews.Pagination sizes={[5, 10, 25]} />
</DataViews>`;

/** A composed collection: a root, its table and its pagination part. */
function ComposedMachines({
  options,
  ...args
}: PaginationProps & {
  readonly options?: MachineProviderOptions;
}): ReactElement {
  const provider = useMachineProvider({
    window: { page: 1, size: 5 },
    ...options,
  });
  return (
    <DataViews provider={provider}>
      <DataTable provider={provider} columns={columns} label="Machines" />
      <Component {...args} />
    </DataViews>
  );
}

const onlyFailed = (provider: MachineProvider): void => {
  provider.fields.status.eq.set(["failed"]);
};

/**
 * In a composition: the part pages the root's provider and takes no provider
 * of its own. It renders exactly what `PaginationBar` renders for that
 * provider.
 */
export const InAComposition: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "DataViews", "type DataTableColumn"],
    declarations: columnsCode,
    window: "{ page: 1, size: 5 }",
    render: composition,
  }),
  render: (args) => <ComposedMachines {...args} />,
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    await expect(canvas.getByText("of 3 pages")).toBeInTheDocument();
  },
};

/**
 * A filtered total: with only failed machines applied, the source counts
 * three, and the part offers the one page they fill. The total it shows is
 * always the current query's.
 */
export const AFilteredTotal: Story = {
  parameters: consumerCode({
    parts: ["DataTable", "DataViews", "type DataTableColumn"],
    declarations: columnsCode,
    window: "{ page: 1, size: 5 }",
    prepare: `provider.fields.status.eq.set(["failed"]);`,
    render: composition,
  }),
  render: (args) => (
    <ComposedMachines {...args} options={{ prepare: onlyFailed }} />
  ),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–3 out of 3 items",
      ),
    );
    await expect(canvas.getByText("of 1 page")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
  },
};
