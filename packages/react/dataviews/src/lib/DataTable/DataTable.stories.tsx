import type { RowRecord } from "@canonical/dataviews-core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import type {
  MachineFields,
  SortableField,
} from "../../storybook/dataTable/fixtures.js";
import {
  createEmptySource,
  createFailingSource,
  createPendingSource,
} from "../../storybook/dataTable/fixtures.js";
import type {
  MachineProvider,
  MachineProviderOptions,
} from "../../storybook/dataTable/story-utils.js";
import {
  useMachineProvider,
  withAppScope,
  withFrame,
} from "../../storybook/dataTable/story-utils.js";
import useDataViewsCell from "../DataViews/hooks/useDataViewsCell.js";
import useDataViewsValue from "../DataViews/hooks/useDataViewsValue.js";
import Component from "./DataTable.js";
import type {
  DataTableCellProps,
  DataTableColumn,
  DataTableProps,
} from "./types.js";

const meta = {
  title: "_work_in_progress/DataTable",
  component: Component,
  decorators: [withAppScope],
  args: {
    label: "Machines",
  },
  // Each story supplies its own provider, columns and callbacks: they stay in
  // the API reference, but none of them is a value a control can edit.
  argTypes: {
    provider: { control: false },
    columns: { control: false },
    presentation: { control: false },
    rowLabel: { control: false },
    renderStatus: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

/** The table's own props, less the ones a story's collection supplies. */
type StoryTableProps = Omit<
  DataTableProps<MachineFields, RowRecord>,
  "provider" | "columns" | "rowLabel"
>;

/** Names a record for its selection checkbox: by host, else by identity. */
const hostName = (row: RowRecord, rowId: string): string =>
  typeof row.name === "string" ? row.name : rowId;

/** The table over a provider bound to the story's own source. */
function MachinesTable({
  columns,
  options,
  ...args
}: StoryTableProps & {
  readonly columns: readonly DataTableColumn[];
  readonly options?: MachineProviderOptions;
}): ReactElement {
  const provider = useMachineProvider(options);
  return (
    <Component
      {...args}
      provider={provider}
      columns={columns}
      rowLabel={hostName}
    />
  );
}

/** A story's render: its args, over its own collection and columns. */
const renderMachines =
  (
    columns: readonly DataTableColumn[],
    options?: MachineProviderOptions,
  ): NonNullable<Story["render"]> =>
  (args) => <MachinesTable {...args} columns={columns} options={options} />;

/** A heading that states its column's sizing rule under its name. */
const ruled = (name: string, rule: string): ReactNode => (
  <>
    {name}
    <br />
    <span style={{ fontWeight: "var(--typography-text-primary-font-weight)" }}>
      {rule}
    </span>
  </>
);

const plainColumns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

// A sortable column may only name a field the fixture source declares it can
// order by, and every sortable column below is built through this helper,
// whose type holds it to that: a column offering a sort its source cannot
// execute is a dead control, and no story demonstrates one.
const sortableColumn = (
  id: SortableField,
  header: string,
): DataTableColumn => ({ id, header, sortable: true });

const sortableColumns: readonly DataTableColumn[] = [
  sortableColumn("name", "Host"),
  sortableColumn("status", "Status"),
  { id: "region", header: "Region" },
  sortableColumn("cores", "Cores"),
  { id: "owner", header: "Owner" },
];

const sizedColumns: readonly DataTableColumn[] = [
  {
    id: "name",
    header: ruled("Host", "flex ×2 · min 160"),
    sizing: { kind: "flex", weight: 2, minPx: 160 },
  },
  {
    id: "status",
    header: ruled("Status", "fixed 112"),
    sizing: { kind: "fixed", px: 112 },
  },
  {
    id: "region",
    header: ruled("Region", "flex ×1 · 96–144"),
    sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 144 },
  },
  {
    id: "cores",
    header: ruled("Cores", "fixed 80"),
    sizing: { kind: "fixed", px: 80 },
  },
  {
    id: "owner",
    header: ruled("Owner", "flex ×1 · min 96"),
    sizing: { kind: "flex", weight: 1, minPx: 96 },
  },
];

/** Mark the named columns resizable, leaving the rest as they are. */
const resizing = (
  columns: readonly DataTableColumn[],
  ids: readonly string[],
): readonly DataTableColumn[] =>
  columns.map((column) =>
    ids.includes(column.id) ? { ...column, resizable: true } : column,
  );

const sortBy =
  (field: SortableField, direction: "asc" | "desc") =>
  (provider: MachineProvider): void => {
    provider.setSort([{ field, direction }]);
  };

const sortByStatus = sortBy("status", "asc");

const sortByCoresDescending = sortBy("cores", "desc");

const selectOnAndOffThePage = (provider: MachineProvider): void => {
  provider.selection.add(["m-02", "m-09"]);
};

const searchForNothing = (provider: MachineProvider): void => {
  provider.setSearch("quartz");
};

const consumerImports = `import { createDataViewsProvider } from "@canonical/dataviews-core";
import { DataTable, type DataTableColumn } from "@canonical/dataviews-react";
import { machineSchema, source } from "./machines.js";`;

/**
 * A story's consumer code, as its "Show code" panel shows it: the provider,
 * the columns and the table a consumer writes — never the fixture source,
 * the binding or the effect wiring this file keeps behind them.
 */
const consumer = (
  body: string,
  options: { readonly imports?: string; readonly provider?: string } = {},
): NonNullable<Story["parameters"]> => ({
  docs: {
    source: {
      language: "tsx",
      code: [
        options.imports === undefined
          ? consumerImports
          : `${consumerImports}\n${options.imports}`,
        `const provider = ${options.provider ?? "createDataViewsProvider({ schema: machineSchema, capabilities: source.capabilities })"};`,
        body,
      ].join("\n\n"),
    },
  },
});

/** Press one key on a control, `times` times over. */
const press = async (
  control: HTMLElement,
  key: string,
  times: number,
): Promise<void> => {
  control.focus();
  await userEvent.keyboard(`{${key}>${times}/}`);
};

/** A heading's rendered width, in whole pixels. */
const widthOf = (element: HTMLElement): number =>
  Math.round(element.getBoundingClientRect().width);

/**
 * Default: every column shows the record field its id names, as text. The
 * rows share one track list, so every column lines up without a width on
 * any cell. The header row sits on the second background layer, and a row
 * takes the ghost fill under the pointer.
 */
export const Default: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(plainColumns),
};

/**
 * Sortable: a column marked `sortable` makes its heading a button, and the
 * heading reports the applied order through `aria-sort`. Nothing is sorted
 * yet, so every sortable heading says `none`. Activating a heading cycles
 * ascending, then descending, then back to the source's own order — enabling
 * a sort never lands on descending by accident.
 *
 * Region and Owner are not sortable, so they carry no `aria-sort` at all
 * rather than claiming `none` about an order they cannot change.
 */
export const Sortable: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores", sortable: true },
  { id: "owner", header: "Owner" },
];

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(sortableColumns),
};

/**
 * Sorted ascending: the Status heading reads `ascending`, and the rows fall
 * into failed, pending and running order — machines of one status keep the
 * source's order among themselves.
 */
export const SortedAscending: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores", sortable: true },
  { id: "owner", header: "Owner" },
];

provider.setSort([{ field: "status", direction: "asc" }]);

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(sortableColumns, { prepare: sortByStatus }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("columnheader", { name: "Status" }),
      ).toHaveAttribute("aria-sort", "ascending"),
    );
    await waitFor(() =>
      expect(canvas.getAllByRole("cell")[0]).toHaveTextContent(
        "birch.example.com",
      ),
    );
  },
};

/**
 * Sorted descending: the Cores heading reads `descending`, largest machine
 * first. Activating it once more clears the order rather than starting over
 * at ascending.
 */
export const SortedDescending: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores", sortable: true },
  { id: "owner", header: "Owner" },
];

provider.setSort([{ field: "cores", direction: "desc" }]);

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(sortableColumns, { prepare: sortByCoresDescending }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("columnheader", { name: "Cores" }),
      ).toHaveAttribute("aria-sort", "descending"),
    );
    await waitFor(() =>
      expect(canvas.getAllByRole("cell")[0]).toHaveTextContent(
        "ironwood.example.com",
      ),
    );
  },
};

/**
 * Selectable: a leading column of real checkboxes backed by the provider's
 * selection. Each checkbox is named after its record (`Select
 * alder.example.com`) rather than its position, and each row reports
 * `aria-selected` from the same channel its checkbox reads, so the two
 * cannot disagree. A selected row keeps a tinted fill.
 */
export const Selectable: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

<DataTable
  provider={provider}
  columns={columns}
  label="Machines"
  selectable
  rowLabel={(row) => String(row.name)}
/>;`),
  args: { selectable: true },
  render: renderMachines(plainColumns),
};

/**
 * Select all acts on displayed rows: it governs the page, not the
 * collection. The window shows five machines; two are selected — birch,
 * which is on this page, and ironwood, which is not. The header checkbox is
 * therefore mixed: one of the five rows it governs is selected.
 *
 * Checking it selects the five displayed machines and leaves ironwood
 * selected; unchecking it then removes those five and still leaves ironwood
 * alone. It never reaches a row the reader cannot see.
 */
export const SelectAllActsOnDisplayedRows: Story = {
  parameters: consumer(
    `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

provider.selection.add(["m-02", "m-09"]);

<DataTable
  provider={provider}
  columns={columns}
  label="Machines"
  selectable
  rowLabel={(row) => String(row.name)}
/>;`,
    {
      provider: `createDataViewsProvider({
  schema: machineSchema,
  window: { page: 1, size: 5 },
})`,
    },
  ),
  args: { selectable: true },
  render: renderMachines(plainColumns, {
    window: { page: 1, size: 5 },
    prepare: selectOnAndOffThePage,
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Select birch.example.com" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: "Select all displayed rows" }),
    ).toBePartiallyChecked();
  },
};

/**
 * Fixed and flexible columns: each heading states its rule under its name,
 * and the widths follow from those rules in two steps. First the reserved
 * widths: Status and Cores keep their fixed 112 and 80, and the flexible
 * columns take their minimums — 160, 96 and 96. That is 544 of the 766
 * pixels inside the frame. Then the 222 left over are shared by weight, two
 * to one to one: Host would gain 111, Region and Owner 55.5 each. Region
 * reaches its 144 maximum first and hands its extra 7.5 back, split the same
 * two to one — so Host ends at 276, Region at 144 and Owner at 154. No
 * column is ever squeezed below its minimum to make room.
 */
export const FixedAndFlexibleColumns: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sizing: { kind: "flex", weight: 2, minPx: 160 } },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 112 } },
  { id: "region", header: "Region", sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 144 } },
  { id: "cores", header: "Cores", sizing: { kind: "fixed", px: 80 } },
  { id: "owner", header: "Owner", sizing: { kind: "flex", weight: 1, minPx: 96 } },
];

<div style={{ maxWidth: "48rem" }}>
  <DataTable provider={provider} columns={columns} label="Machines" />
</div>;`),
  decorators: [withFrame("48rem")],
  render: renderMachines(sizedColumns),
};

/**
 * Horizontal scroll: in a frame narrower than the columns' minimum widths
 * added together, the table scrolls sideways rather than compressing,
 * hiding or wrapping a column. Every column sits at its minimum or fixed
 * width, and the row fills and the header's background still span every
 * column when scrolled.
 */
export const HorizontalScroll: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sizing: { kind: "flex", weight: 2, minPx: 160 } },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 112 } },
  { id: "region", header: "Region", sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 144 } },
  { id: "cores", header: "Cores", sizing: { kind: "fixed", px: 80 } },
  { id: "owner", header: "Owner", sizing: { kind: "flex", weight: 1, minPx: 96 } },
];

<div style={{ maxWidth: "24rem" }}>
  <DataTable provider={provider} columns={columns} label="Machines" />
</div>;`),
  decorators: [withFrame("24rem")],
  render: renderMachines(sizedColumns),
};

/**
 * Resizable: Host and Region carry a resize control at their trailing edge.
 * Drag it to set the column's width; the preview is live and nothing is
 * committed until the pointer is released.
 *
 * Resizing never needs a pointer. Tab to the control — it is a focusable
 * separator named after its column, reporting its width and bounds — and
 * the left and right arrow keys step the edge. Escape abandons a drag in
 * progress and restores the width it started from. A width the reader sets
 * is kept: it is never quietly shrunk to suit the viewport afterwards.
 *
 * Owner is marked resizable too, but it is the last column: its trailing
 * edge is the table's own edge, with nothing beyond it to resize against,
 * so it has no control and takes whatever width the others leave.
 */
export const Resizable: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sizing: { kind: "flex", weight: 2, minPx: 160 }, resizable: true },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 112 } },
  { id: "region", header: "Region", sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 144 }, resizable: true },
  { id: "cores", header: "Cores", sizing: { kind: "fixed", px: 80 } },
  { id: "owner", header: "Owner", sizing: { kind: "flex", weight: 1, minPx: 96 }, resizable: true },
];

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  decorators: [withFrame("48rem")],
  render: renderMachines(resizing(sizedColumns, ["name", "region", "owner"])),
  play: async ({ canvas }) => {
    const controls = await canvas.findAllByRole("separator");
    await expect(controls).toHaveLength(2);
    await expect(canvas.queryByRole("separator", { name: /^Owner/ })).toBe(
      null,
    );
  },
};

/**
 * Mixed resizable columns: Host and Region are marked `resizable` and offer
 * a control; Status, Cores and Owner are not, so their edges carry none. A
 * control appears exactly where a column may be resized, and nowhere else.
 */
export const MixedResizableColumns: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", resizable: true },
  { id: "status", header: "Status" },
  { id: "region", header: "Region", resizable: true },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  decorators: [withFrame("48rem")],
  render: renderMachines(resizing(plainColumns, ["name", "region"])),
};

const boundedColumns: readonly DataTableColumn[] = [
  {
    id: "name",
    header: ruled("Host", "resizable · 120–320"),
    sizing: { kind: "flex", weight: 1, minPx: 120, maxPx: 320 },
    resizable: true,
  },
  {
    id: "region",
    header: ruled("Region", "resizable · 96–160"),
    sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 160 },
    resizable: true,
  },
  {
    id: "status",
    header: ruled("Status", "fixed 112"),
    sizing: { kind: "fixed", px: 112 },
  },
  {
    id: "owner",
    header: ruled("Owner", "takes the rest"),
    sizing: { kind: "flex", weight: 1, minPx: 96 },
  },
];

/**
 * Resize within bounds: a resize stops at the column's declared minimum and
 * maximum, by pointer or by keyboard, however many times the column has been
 * resized before. Host starts between its bounds and has been stepped right
 * twenty times, stopping at its 320 maximum; Region starts at its 160
 * maximum and has been stepped left ten times, stopping at its 96 minimum.
 * Each control reports its bounds. Owner, the last column, takes whatever
 * width is left.
 */
export const ResizeWithinBounds: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", resizable: true, sizing: { kind: "flex", weight: 1, minPx: 120, maxPx: 320 } },
  { id: "region", header: "Region", resizable: true, sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 160 } },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 112 } },
  { id: "owner", header: "Owner", sizing: { kind: "flex", weight: 1, minPx: 96 } },
];

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  decorators: [withFrame("48rem")],
  render: renderMachines(boundedColumns),
  play: async ({ canvas }) => {
    const host = await canvas.findByRole("separator", { name: /^Host/ });
    const region = canvas.getByRole("separator", { name: /^Region/ });
    await expect(Number(host.getAttribute("aria-valuenow"))).toBeLessThan(320);
    await press(host, "ArrowRight", 20);
    await expect(host).toHaveAttribute("aria-valuenow", "320");
    await expect(host).toHaveAttribute("aria-valuemax", "320");
    await press(region, "ArrowLeft", 10);
    await expect(region).toHaveAttribute("aria-valuenow", "96");
    await expect(region).toHaveAttribute("aria-valuemin", "96");
  },
};

/**
 * Resize past the container: at first every column fits, with a little to
 * spare. Host has then been stepped right twenty-five times, far past the
 * room the frame has. Nothing is squeezed below its minimum — the flexible
 * columns fall back to theirs — and the table scrolls sideways instead,
 * keeping Host's edge in view so the control being moved never slips under
 * the table's own edge. The last column keeps its minimum once the table
 * scrolls.
 */
export const ResizePastTheContainer: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sizing: { kind: "flex", weight: 2, minPx: 160 }, resizable: true },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 112 } },
  { id: "region", header: "Region", sizing: { kind: "flex", weight: 1, minPx: 96, maxPx: 144 }, resizable: true },
  { id: "cores", header: "Cores", sizing: { kind: "fixed", px: 80 } },
  { id: "owner", header: "Owner", sizing: { kind: "flex", weight: 1, minPx: 96 } },
];

<div style={{ maxWidth: "36rem" }}>
  <DataTable provider={provider} columns={columns} label="Machines" />
</div>;`),
  decorators: [withFrame("36rem")],
  render: renderMachines(resizing(sizedColumns, ["name", "region"])),
  play: async ({ canvas }) => {
    const table = await canvas.findByRole("table");
    const host = await canvas.findByRole("separator", { name: /^Host/ });
    await expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth);
    await press(host, "ArrowRight", 25);
    await expect(table.scrollWidth).toBeGreaterThan(table.clientWidth);
    await expect(table.scrollLeft).toBeGreaterThan(0);
    const view = table.getBoundingClientRect();
    const edge = host.getBoundingClientRect();
    const start = view.left + table.clientLeft;
    await expect(edge.left).toBeGreaterThanOrEqual(start - 0.5);
    await expect(edge.right).toBeLessThanOrEqual(
      start + table.clientWidth + 0.5,
    );
    await expect(
      widthOf(canvas.getByRole("columnheader", { name: /^Owner/ })),
    ).toBe(96);
  },
};

const fixedColumns: readonly DataTableColumn[] = [
  {
    id: "name",
    header: ruled("Host", "resizable · fixed 200"),
    sizing: { kind: "fixed", px: 200 },
    resizable: true,
  },
  {
    id: "status",
    header: ruled("Status", "fixed 112"),
    sizing: { kind: "fixed", px: 112 },
  },
  {
    id: "owner",
    header: ruled("Owner", "fixed 120 · takes the rest"),
    sizing: { kind: "fixed", px: 120 },
  },
];

/**
 * Last column takes the rest: every column here is fixed, and together they
 * are narrower than the frame. Rather than leave a gap at the table's edge,
 * the last column takes whatever width the others leave — Owner declares
 * 120 and shows more. Narrow Host and Owner grows by the same amount; widen
 * Host and Owner gives it back, down to its own 120, after which the table
 * scrolls.
 */
export const LastColumnTakesTheRest: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", resizable: true, sizing: { kind: "fixed", px: 200 } },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 112 } },
  { id: "owner", header: "Owner", sizing: { kind: "fixed", px: 120 } },
];

<div style={{ maxWidth: "48rem" }}>
  <DataTable provider={provider} columns={columns} label="Machines" />
</div>;`),
  decorators: [withFrame("48rem")],
  render: renderMachines(fixedColumns),
  play: async ({ canvas }) => {
    await expect(
      widthOf(await canvas.findByRole("columnheader", { name: /^Owner/ })),
    ).toBeGreaterThan(120);
  },
};

const statusDisplay = {
  running: { label: "Running", tone: "var(--color-icon-success)" },
  failed: { label: "Failed", tone: "var(--color-icon-destructive)" },
  pending: { label: "Pending", tone: "var(--color-icon-muted)" },
} as const;

const isStatus = (value: unknown): value is keyof typeof statusDisplay =>
  typeof value === "string" && Object.hasOwn(statusDisplay, value);

/** A status value as a coloured marker and a label; anything else, nothing. */
function StatusCell({ value }: DataTableCellProps): ReactElement | null {
  if (!isStatus(value)) {
    return null;
  }
  const { label, tone } = statusDisplay[value];
  return (
    <span>
      <span aria-hidden="true" style={{ color: tone }}>
        ●{" "}
      </span>
      {label}
    </span>
  );
}

/**
 * Custom cell renderer: the Status column supplies its own `cell`, which
 * receives the value, the row's id and the column's id, and renders a
 * marker in the status icon colours beside the label. Every other column
 * keeps the default text. One column gets exceptional content without the
 * caller authoring any other header, row or cell.
 */
export const CustomCellRenderer: Story = {
  parameters: consumer(
    `const statusDisplay: Record<string, { label: string; tone: string }> = {
  running: { label: "Running", tone: "var(--color-icon-success)" },
  failed: { label: "Failed", tone: "var(--color-icon-destructive)" },
  pending: { label: "Pending", tone: "var(--color-icon-muted)" },
};

const StatusCell = ({ value }: DataTableCellProps) => {
  const shown = statusDisplay[String(value)];
  return shown ? (
    <span>
      <span aria-hidden="true" style={{ color: shown.tone }}>
        ●{" "}
      </span>
      {shown.label}
    </span>
  ) : null;
};

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status", cell: StatusCell },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

<DataTable provider={provider} columns={columns} label="Machines" />;`,
    {
      imports: `import type { DataTableCellProps } from "@canonical/dataviews-react";`,
    },
  ),
  render: renderMachines(
    plainColumns.map((column) =>
      column.id === "status" ? { ...column, cell: StatusCell } : column,
    ),
  ),
};

/**
 * A Host cell that reads its own cell scope. The scope hook takes the
 * provider as its witness, so the cell is built for one provider.
 */
const hostCellFor = (
  provider: MachineProvider,
): ComponentType<DataTableCellProps> =>
  function HostCell({ value }: DataTableCellProps): ReactElement {
    const scope = useDataViewsCell(provider);
    const record = useDataViewsValue(scope.row);
    const selected = useDataViewsValue(scope.selected);
    const owner =
      typeof record === "object" &&
      record !== null &&
      "owner" in record &&
      typeof record.owner === "string"
        ? record.owner
        : null;
    return (
      <span
        style={{
          fontWeight: selected
            ? "var(--typography-text-primary-bold-font-weight)"
            : undefined,
        }}
      >
        {typeof value === "string" ? value : null}
        {owner === null ? null : (
          <span style={{ color: "var(--color-text-muted)" }}> ({owner})</span>
        )}
      </span>
    );
  };

/** The table whose Host column reads its own cell scope. */
function ScopedHostTable(args: StoryTableProps): ReactElement {
  const provider = useMachineProvider();
  // Built once, in state: the cell renderer's identity must hold for the
  // table's lifetime, which a memo does not promise.
  const [columns] = useState<readonly DataTableColumn[]>(() => [
    { id: "name", header: "Host", cell: hostCellFor(provider) },
    { id: "status", header: "Status" },
    { id: "region", header: "Region" },
    { id: "cores", header: "Cores" },
  ]);
  return (
    <Component
      {...args}
      provider={provider}
      columns={columns}
      rowLabel={hostName}
    />
  );
}

/**
 * Cell reading its scope: the Host cell calls `useDataViewsCell` for the
 * row's channels. It reads the whole record to show the owner — a field no
 * column displays — and the row's selection to set the host in bold once the
 * row is selected. The table never handed the cell a copy of the record.
 * Selecting a row re-renders its checkbox and its Host cell; the row's other
 * cells, and every other row, stay as they are.
 */
export const CellReadingItsScope: Story = {
  parameters: consumer(
    `function HostCell({ value }: DataTableCellProps) {
  const { row, selected } = useDataViewsCell(provider);
  // The cell scope carries the record as the source delivered it.
  const { owner } = useDataViewsValue(row) as Machine;
  const isSelected = useDataViewsValue(selected);
  return (
    <span
      style={{
        fontWeight: isSelected
          ? "var(--typography-text-primary-bold-font-weight)"
          : undefined,
      }}
    >
      {String(value)}
      <span style={{ color: "var(--color-text-muted)" }}> ({owner})</span>
    </span>
  );
}

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", cell: HostCell },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
];

<DataTable
  provider={provider}
  columns={columns}
  label="Machines"
  selectable
  rowLabel={(row) => String(row.name)}
/>;`,
    {
      imports: `import type { DataTableCellProps } from "@canonical/dataviews-react";
import { useDataViewsCell, useDataViewsValue } from "@canonical/dataviews-react";
import type { Machine } from "./machines.js";`,
    },
  ),
  args: { selectable: true },
  render: (args) => <ScopedHostTable {...args} />,
};

/**
 * Loading: the source has been asked and never answers, so the story stays
 * in this state for good. The table says it is loading and reports
 * `aria-busy`, and it does not claim the collection is empty — it does not
 * know yet.
 */
export const Loading: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

// Rendered before the bound source has answered.
<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(plainColumns, { source: createPendingSource }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Loading…")).toBeInTheDocument();
    await expect(canvas.getByRole("table")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

/**
 * Failed: the first request failed, so there are no rows to keep. The table
 * shows the source's own reason in the error text colour. A read that fails
 * is never reported as an empty collection or as a query that matched
 * nothing.
 */
export const Failed: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

// Rendered after the bound source's first read has failed.
<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(plainColumns, { source: createFailingSource }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("The machine inventory could not be reached."),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("table")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  },
};

/**
 * Empty collection: the source answered, with no filter or search applied,
 * and has nothing in it. This is a different message from a query that
 * matched nothing — there is nothing here to find.
 */
export const EmptyCollection: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

// Rendered after the bound source answers with no records.
<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(plainColumns, { source: createEmptySource }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("There is nothing here yet."),
    ).toBeInTheDocument();
  },
};

/**
 * No match: the collection has machines, but the search for `quartz`
 * matches none of their hosts or owners. The table says the query matched
 * nothing, which tells the reader to change the query rather than that the
 * collection is empty.
 */
export const NoMatch: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

provider.setSearch("quartz");

<DataTable provider={provider} columns={columns} label="Machines" />;`),
  render: renderMachines(plainColumns, { prepare: searchForNothing }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("No rows match this query."),
    ).toBeInTheDocument();
  },
};

/**
 * Long values: a note too long for its column is cut with an ellipsis on one
 * line instead of wrapping the row taller or widening the track the solver
 * sized. The full value is still the cell's text, so it is what assistive
 * technology reads and what a copy selects.
 */
export const LongValues: Story = {
  parameters: consumer(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sizing: { kind: "fixed", px: 176 } },
  { id: "status", header: "Status", sizing: { kind: "fixed", px: 96 } },
  { id: "note", header: "Note", sizing: { kind: "flex", weight: 1, minPx: 160 } },
];

<div style={{ maxWidth: "40rem" }}>
  <DataTable provider={provider} columns={columns} label="Machines" />
</div>;`),
  decorators: [withFrame("40rem")],
  render: renderMachines([
    { id: "name", header: "Host", sizing: { kind: "fixed", px: 176 } },
    { id: "status", header: "Status", sizing: { kind: "fixed", px: 96 } },
    {
      id: "note",
      header: "Note",
      sizing: { kind: "flex", weight: 1, minPx: 160 },
    },
  ]),
};
