import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../../../storybook/decorators.js";
import { consumerCode } from "../../../../../storybook/machines/consumerCode.js";
import {
  type MachineProvider,
  useMachineProvider,
} from "../../../../../storybook/machines/story-utils.js";
import type { DataTableColumn } from "../../../DataTable/index.js";
import DataViews from "../../Provider.js";
import Component from "./SortPanel.js";

const meta = {
  title: "_work_in_progress/DataViews/SortPanel",
  component: Component,
  decorators: [withAppScope],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
  { id: "owner", header: "Owner" },
];

const columnsCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
  { id: "owner", header: "Owner" },
];`;

/**
 * Sort the story's provider by status, cores and host before it renders.
 *
 * @note Impure: sets the provider's ordering.
 */
const sortByThree = (provider: MachineProvider): void => {
  provider.setSort([
    { field: "status", direction: "asc" },
    { field: "cores", direction: "desc" },
    { field: "name", direction: "asc" },
  ]);
};

/** The panel beside the table it orders, over one root. */
function SortedCollection({
  prepare,
}: {
  readonly prepare?: (provider: MachineProvider) => void;
}): ReactElement {
  const provider = useMachineProvider({ prepare });
  return (
    <DataViews provider={provider}>
      <Component />
      <DataViews.DataTable columns={columns} label="Machines" />
    </DataViews>
  );
}

/**
 * Default: the reader's ordering as a list — status, then cores largest
 * first, then host — each term named by its field, with its direction.
 * Move a term up or down to change its precedence, or remove it; the
 * table's headers follow, and only the first term's heading reports the
 * sort. It is the path to an ordering of several terms that needs no Shift
 * key, and it is deliberately rough: its design comes later.
 */
export const Default: Story = {
  parameters: consumerCode({
    parts: ["DataViews", "type DataTableColumn"],
    declarations: columnsCode,
    prepare: `provider.setSort([
  { field: "status", direction: "asc" },
  { field: "cores", direction: "desc" },
  { field: "name", direction: "asc" },
]);`,
    render: `<DataViews provider={provider}>
  <DataViews.SortPanel />
  <DataViews.DataTable columns={columns} label="Machines" />
</DataViews>`,
  }),
  render: () => <SortedCollection prepare={sortByThree} />,
  play: async ({ canvas }) => {
    const panel = canvas.getByRole("region", { name: "Sort" });
    const hostTerm = within(panel)
      .getAllByRole("listitem")
      .find((item) => item.textContent?.startsWith("name"));
    if (hostTerm === undefined) {
      throw new Error("no name term listed");
    }
    await userEvent.click(
      within(hostTerm).getByRole("button", { name: "Move up" }),
    );
    await waitFor(() =>
      expect(
        within(panel)
          .getAllByRole("listitem")
          .map((item) => item.firstChild?.textContent),
      ).toEqual(["status, ascending", "name, ascending", "cores, descending"]),
    );
    await expect(
      canvas.getByRole("columnheader", { name: "Status" }),
    ).toHaveAttribute("aria-sort", "ascending");
  },
};

/**
 * Nothing stated: while the reader states no term, the panel says what
 * orders the rows — here nothing, since this source documents no order —
 * rather than showing an empty list.
 */
export const NothingStated: Story = {
  parameters: consumerCode({
    parts: ["DataViews"],
    render: `<DataViews provider={provider}>
  <DataViews.SortPanel />
</DataViews>`,
  }),
  render: () => <SortedCollection />,
};
