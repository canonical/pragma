import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import { useMachineProvider } from "../../../storybook/machines/story-utils.js";
import type { DataTableColumn } from "../DataTable/index.js";
import { DataViews } from "../DataViews/index.js";
import Component from "./RendererSwitch.js";

const meta = {
  title: "_work_in_progress/RendererSwitch",
  component: Component,
  decorators: [withAppScope],
  args: {
    label: "Show machines as",
  },
  argTypes: {
    renderers: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const detailColumns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

const summaryColumns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
];

/** Two renderers over one root: every machine's details, or a summary. */
function TableOrSummaryMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider();
  return (
    <DataViews provider={provider}>
      <Component
        label={label}
        renderers={[
          {
            id: "table",
            label: "Table",
            content: (
              <DataViews.DataTable
                columns={detailColumns}
                label="Machines"
                selectable
                rowLabel={(row) => String(row["name"])}
              />
            ),
          },
          {
            id: "summary",
            label: "Summary",
            content: (
              <DataViews.DataTable
                columns={summaryColumns}
                label="Machines, summarised"
                selectable
                rowLabel={(row) => String(row["name"])}
              />
            ),
          },
        ]}
      />
    </DataViews>
  );
}

/**
 * Table or summary: one collection, two renderers the reader chooses
 * between. Both read the same root, so a machine selected in one stays
 * selected in the other, and choosing asks the source for nothing. The
 * choice lasts while the switch is mounted; it is not written to the URL or
 * to a saved view. Without scripting both renderers are drawn in turn.
 */
export const TableOrSummary: Story = {
  render: ({ label = "Show machines as" }) => (
    <TableOrSummaryMachines label={label} />
  ),
  parameters: consumerCode({
    parts: ["DataViews", "type DataTableColumn"],
    imports: `import { machineCollection, machines } from "./machines.js";
// A work-in-progress spike: not yet exported from the package root.
import { RendererSwitch } from "./RendererSwitch.js";`,
    declarations: `const detailColumns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

const summaryColumns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
];`,
    render: `<DataViews provider={provider}>
  <RendererSwitch
    label="Show machines as"
    renderers={[
      {
        id: "table",
        label: "Table",
        content: <DataViews.DataTable columns={detailColumns} label="Machines" selectable />,
      },
      {
        id: "summary",
        label: "Summary",
        content: <DataViews.DataTable columns={summaryColumns} label="Machines, summarised" selectable />,
      },
    ]}
  />
</DataViews>`,
  }),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Select alder.example.com" }),
    );
    const choice = canvas.getByRole("combobox", { name: "Show machines as" });
    await userEvent.selectOptions(choice, "summary");
    const summary = await canvas.findByRole("table", {
      name: "Machines, summarised",
    });
    await waitFor(() =>
      expect(
        within(summary).getByRole("checkbox", {
          name: "Select alder.example.com",
        }),
      ).toBeChecked(),
    );
    await userEvent.selectOptions(choice, "table");
    await canvas.findByRole("table", { name: "Machines" });
  },
};
