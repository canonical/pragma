import { EMPTY_SLICE, type Slice } from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { withAppScope } from "../../../../../storybook/decorators.js";
import { consumerCode } from "../../../../../storybook/machines/consumerCode.js";
import { createSourceWithoutCores } from "../../../../../storybook/machines/fixtures.js";
import {
  type MachineProviderConfig,
  useMachineProvider,
} from "../../../../../storybook/machines/story-utils.js";
import { DataTable, type DataTableColumn } from "../../../DataTable/index.js";
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
  readonly options?: MachineProviderConfig | undefined;
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

/** The query the provider starts on: only failed machines. */
const onlyFailed: Slice = {
  ...EMPTY_SLICE,
  filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
};

const onlyFailedCode = `{
    ...EMPTY_SLICE,
    filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
  }`;

/** The query the provider starts on: machines with at least sixteen cores. */
const atLeastSixteenCores: Slice = {
  ...EMPTY_SLICE,
  filter: [{ field: "cores", operator: "gte", operands: [16] }],
};

const atLeastSixteenCoresCode = `{
    ...EMPTY_SLICE,
    filter: [{ field: "cores", operator: "gte", operands: [16] }],
  }`;

/**
 * Default: one control per filterable field in the collection's schema — a
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
 * A choice applied: the provider started on a query of only failed
 * machines, and the checkbox shows it. The checkbox is the applied query,
 * not a draft of it — there is no second query to apply or keep in step.
 */
export const ChoiceApplied: Story = {
  parameters: consumerCode({
    parts,
    declarations: columnsCode,
    slice: onlyFailedCode,
    render: composition,
  }),
  render: renderWith({ slice: onlyFailed }),
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
    slice: atLeastSixteenCoresCode,
    render: composition,
  }),
  render: renderWith({ slice: atLeastSixteenCores }),
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
    slice: atLeastSixteenCoresCode,
    render: composition,
  }),
  render: renderWith({ slice: atLeastSixteenCores }),
  play: async ({ canvas }) => {
    const bound = canvas.getByLabelText("Cores from");
    await expect(bound).toHaveValue("16");
    await userEvent.clear(bound);
    await userEvent.type(bound, "lots");
    await expect(bound).toHaveAttribute("aria-invalid", "true");
    await expect(bound).toHaveAccessibleDescription(
      /The previous restriction still applies\.$/,
    );
    await waitFor(() => expect(recordRows(canvas)).toBe(4));
  },
};

/**
 * A field the source cannot filter: this source declares no filter on
 * cores, so the filters offer none, though the collection has the field. A
 * control for a restriction the source would refuse would be a control that
 * does nothing.
 */
export const UndeclaredField: Story = {
  parameters: consumerCode({
    parts,
    coreTypes: ["Source"],
    imports: `import { type Machine, machineCollection, machines } from "./machines.js";`,
    declarations: `${columnsCode}

// What a source declares is what the filters offer. An endpoint that cannot
// filter or order by cores leaves the field out of its declaration; this
// takes it out of the local source's, which declares every schema field.
const withoutCores = (source: Source<Machine>): Source<Machine> => {
  const { cores: _cores, ...filter } = source.capabilities.filter;
  return {
    ...source,
    capabilities: {
      ...source.capabilities,
      filter,
      sort: {
        ...source.capabilities.sort,
        fields: source.capabilities.sort.fields.filter(
          (field) => field !== "cores",
        ),
      },
    },
  };
};`,
    source: `withoutCores(
  createArraySource({ rows: machines, collection: machineCollection }),
)`,
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
