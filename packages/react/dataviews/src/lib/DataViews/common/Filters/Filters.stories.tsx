import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, waitFor } from "storybook/test";
import { consumerCode } from "../../../../storybook/machines/consumerCode.js";
import { createSourceWithoutCores } from "../../../../storybook/machines/fixtures.js";
import type {
  MachineProvider,
  MachineProviderConfig,
} from "../../../../storybook/machines/story-utils.js";
import {
  useMachineProvider,
  withAppScope,
} from "../../../../storybook/machines/story-utils.js";
import DataTable from "../../../DataTable/DataTable.js";
import type { DataTableColumn } from "../../../DataTable/types.js";
import DataViews from "../../Provider.js";
import Component from "./Filters.js";
import type { DataViewsFiltersProps } from "./types.js";

const meta = {
  title: "_work_in_progress/DataViews/Filters",
  component: Component,
  decorators: [withAppScope],
  args: {
    labels: { status: "Status", cores: "Cores" },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

const columnsCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];`;

const composition = `<DataViews provider={provider}>
  <DataViews.Filters labels={{ status: "Status", cores: "Cores" }} />
  <DataTable provider={provider} columns={columns} label="Machines" />
</DataViews>`;

const parts = ["DataTable", "DataViews", "type DataTableColumn"];

/** A composed collection: a root, its filters and its table. */
function FilteredMachines({
  options,
  ...args
}: DataViewsFiltersProps & {
  readonly options?: MachineProviderConfig;
}): ReactElement {
  const provider = useMachineProvider(options);
  return (
    <DataViews provider={provider}>
      <Component {...args} />
      <DataTable provider={provider} columns={columns} label="Machines" />
    </DataViews>
  );
}

const renderWith =
  (options?: MachineProviderConfig): NonNullable<Story["render"]> =>
  (args) => <FilteredMachines {...args} options={options} />;

/** The table's record rows: every row but the header's. */
const recordRows = (canvas: {
  getAllByRole: (role: string) => HTMLElement[];
}) => canvas.getAllByRole("row").length - 1;

const onlyFailed = (provider: MachineProvider): void => {
  provider.fields.status.eq.set(["failed"]);
};

const atLeastSixteenCores = (provider: MachineProvider): void => {
  provider.fields.cores.gte.edit("16");
};

const thenAnInvalidEdit = (provider: MachineProvider): void => {
  atLeastSixteenCores(provider);
  provider.fields.cores.gte.edit("lots");
};

/**
 * Default: one control per filterable field in the provider's schema — a
 * checkbox per status, and a from and a to bound for cores. Nothing is
 * applied, so every machine shows.
 */
export const Default: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    render: composition,
  }),
  render: renderWith(),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "Filters" })).toBeVisible();
    await waitFor(() => expect(recordRows(canvas)).toBe(12));
    await expect(canvas.getByLabelText("Cores from")).toHaveValue("");
  },
};

/**
 * A choice applied: only failed machines. The checkbox is the applied query,
 * not a draft of it — there is no second query to apply or keep in step.
 */
export const ChoiceApplied: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    prepare: `provider.fields.status.eq.set(["failed"]);`,
    render: composition,
  }),
  render: renderWith({ prepare: onlyFailed }),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: "failed" }),
    ).toBeChecked();
    await waitFor(() => expect(recordRows(canvas)).toBe(3));
  },
};

/** A bound applied: machines with at least sixteen cores. */
export const BoundApplied: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    prepare: `provider.fields.cores.gte.edit("16");`,
    render: composition,
  }),
  render: renderWith({ prepare: atLeastSixteenCores }),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Cores from")).toHaveValue("16");
    await waitFor(() => expect(recordRows(canvas)).toBe(4));
  },
};

/**
 * An invalid edit keeps the restriction: sixteen cores was applied, then the
 * bound was edited to text that is not a number. The edit is refused, the
 * sixteen-core restriction stays in force, and the message beside the input
 * says so — the text on screen is not what is filtering the rows.
 */
export const InvalidEditKeepsTheRestriction: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    prepare: `provider.fields.cores.gte.edit("16");
provider.fields.cores.gte.edit("lots");`,
    render: composition,
  }),
  render: renderWith({ prepare: thenAnInvalidEdit }),
  play: async ({ canvas }) => {
    const bound = canvas.getByLabelText("Cores from");
    await expect(bound).toHaveAttribute("aria-invalid", "true");
    await expect(bound).toHaveAccessibleDescription(
      /The previous restriction still applies\.$/,
    );
    await waitFor(() => expect(recordRows(canvas)).toBe(4));
  },
};

/**
 * A field the source cannot filter: this source declares no filter on
 * cores, so the filters offer none. A control for a restriction the source
 * would refuse would be a control that does nothing.
 */
export const UndeclaredField: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    source: `createArraySource({
      rows: machines,
      // No "cores": this source can neither filter nor order by it.
      fields: ["name", "status", "region", "owner"],
    })`,
    render: composition,
  }),
  render: renderWith({ source: createSourceWithoutCores }),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: "failed" }),
    ).toBeVisible();
    await expect(canvas.queryByLabelText("Cores from")).toBeNull();
  },
};
