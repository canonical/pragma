import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../storybook/decorators.js";
import {
  createMockApiLoader,
  createRestHandlers,
} from "../../../storybook/machines/api/index.js";
import { consumerCode } from "../../../storybook/machines/consumerCode.js";
import {
  createEmptySource,
  createFailingSource,
  createPendingSource,
  type Machine,
  type MachineFields,
  machineCollection,
} from "../../../storybook/machines/fixtures.js";
import readPaginationSummary from "../../../storybook/machines/readPaginationSummary.js";
import { createRestMachineSource } from "../../../storybook/machines/sources/index.js";
import {
  hostName,
  type MachineProviderConfig,
  useMachineProvider,
} from "../../../storybook/machines/story-utils.js";
import type {
  DisplayField,
  DisplayFieldCellProps,
} from "../../common/index.js";
import { useDataViewsCell, useDataViewsValue } from "../../hooks/index.js";
import { Cards as ConnectedCards } from "../DataViews/common/Cards/index.js";
import { DataViews } from "../DataViews/index.js";
import { RendererSwitch } from "../RendererSwitch/index.js";
import Component from "./Cards.js";
import type { CardsProps } from "./types.js";

const meta = {
  title: "_work_in_progress/Cards",
  component: Component,
  decorators: [withAppScope],
  args: {
    label: "Machines",
    title: "name",
  },
  // Each story supplies its own provider, fields and callbacks: they stay in
  // the API reference, but none of them is a value a control can edit.
  argTypes: {
    provider: { control: false },
    fields: { control: false },
    rowLabel: { control: false },
    renderStatus: { control: false },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

/** The cards' own props, less the ones a story's collection supplies. */
type StoryCardsProps = Omit<
  CardsProps<MachineFields, Machine>,
  "provider" | "fields" | "rowLabel"
>;

const fields: readonly DisplayField[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];

const fieldsCode = `const fields: readonly DisplayField[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "region", header: "Region" },
  { id: "cores", header: "Cores" },
  { id: "owner", header: "Owner" },
];`;

/** The import every story's code shows for a part not yet on the root. */
const spikeImports = `import { machineCollection, machines } from "./machines.js";
// A work-in-progress spike: not yet exported from the package root.
import { Cards } from "./Cards.js";`;

/** The cards over a provider bound to the story's own source. */
function MachineCards({
  cardFields = fields,
  options,
  ...args
}: StoryCardsProps & {
  readonly cardFields?: readonly DisplayField[] | undefined;
  readonly options?: MachineProviderConfig | undefined;
}): ReactElement {
  const provider = useMachineProvider(options);
  return (
    <Component
      {...args}
      provider={provider}
      fields={cardFields}
      rowLabel={hostName}
    />
  );
}

/**
 * Default: one card per machine, headed and named by its host, with the
 * other fields listed beneath it. The cards are the design system's own, laid
 * out by its Cards group; they are a list, read in order.
 */
export const Default: Story = {
  render: (args) => <MachineCards {...args} />,
  parameters: consumerCode({
    parts: ["type DisplayField"],
    imports: spikeImports,
    declarations: fieldsCode,
    render: `<Cards provider={provider} fields={fields} title="name" label="Machines" />`,
  }),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("listitem", { name: "alder.example.com" }),
    ).toBeVisible();
  },
};

/**
 * Selectable: each card carries a checkbox named for its host, and one above
 * the cards selects every card on the page, or clears them.
 */
export const Selectable: Story = {
  args: { selectable: true },
  render: (args) => <MachineCards {...args} />,
  parameters: consumerCode({
    parts: ["type DisplayField"],
    imports: spikeImports,
    declarations: fieldsCode,
    render: `<Cards
  provider={provider}
  fields={fields}
  title="name"
  label="Machines"
  selectable
  rowLabel={(machine) => machine.name}
/>`,
  }),
  play: async ({ canvas }) => {
    const alder = await canvas.findByRole("checkbox", {
      name: "Select alder.example.com",
    });
    await userEvent.click(alder);
    await expect(alder).toBeChecked();
    const all = canvas.getByRole<HTMLInputElement>("checkbox", {
      name: "Select all displayed rows",
    });
    await waitFor(() => expect(all.indeterminate).toBe(true));
  },
};

/** A status field drawn by its own cell, reading the record through its scope. */
function StatusCell({ value }: DisplayFieldCellProps): ReactElement {
  const cell = useDataViewsCell(machineCollection);
  const note = useDataViewsValue(cell.record, (record) => record.note);
  return <span title={note}>{String(value).toUpperCase()}</span>;
}

/**
 * A field's own cell: the status is drawn by a cell of its own, which reads
 * the record through the same scope a table cell installs, so one cell works
 * in a table and on a card.
 */
export const CustomCell: Story = {
  render: (args) => (
    <MachineCards
      {...args}
      cardFields={[
        { id: "name", header: "Host" },
        { id: "status", header: "Status", cell: StatusCell },
        { id: "cores", header: "Cores" },
      ]}
    />
  ),
  parameters: consumerCode({
    parts: [
      "useDataViewsCell",
      "useDataViewsValue",
      "type DisplayFieldCellProps",
    ],
    imports: spikeImports,
    declarations: `function StatusCell({ value }: DisplayFieldCellProps) {
  const cell = useDataViewsCell(machineCollection);
  const note = useDataViewsValue(cell.record, (record) => record.note);
  return <span title={note}>{String(value).toUpperCase()}</span>;
}

const fields: readonly DisplayField[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status", cell: StatusCell },
  { id: "cores", header: "Cores" },
];`,
    render: `<Cards provider={provider} fields={fields} title="name" label="Machines" />`,
  }),
  play: async ({ canvas }) => {
    const birch = await canvas.findByRole("listitem", {
      name: "birch.example.com",
    });
    await expect(within(birch).getByText("FAILED")).toBeVisible();
  },
};

/** Loading: the source has not answered, so the cards say so and draw none. */
export const Loading: Story = {
  render: (args) => (
    <MachineCards {...args} options={{ source: createPendingSource }} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Loading…")).toBeVisible();
  },
};

/** Failed: the request failed, and the cards say why, politely. */
export const Failed: Story = {
  render: (args) => (
    <MachineCards {...args} options={{ source: createFailingSource }} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "the machine inventory could not be reached",
    );
  },
};

/** No data: the collection is empty, which the cards say rather than draw nothing. */
export const NoData: Story = {
  render: (args) => (
    <MachineCards {...args} options={{ source: createEmptySource }} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "There is nothing here yet.",
    );
  },
};

/** Cards in a root, beside the sort panel and the pagination bar. */
function SortedAndPagedMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({ query: "page=1&size=5" });
  return (
    <DataViews provider={provider}>
      <DataViews.SortPanel />
      <ConnectedCards
        fields={fields}
        title="name"
        label={label}
        selectable
        rowLabel={(row) => String(row["name"])}
      />
      <DataViews.Pagination sizes={[5, 10]} />
    </DataViews>
  );
}

/**
 * Sorted and paged: the cards show nothing of the ordering or the paging
 * themselves. The sort panel orders them and the pagination bar pages them,
 * both placed beside the cards in one root, as they are beside a table.
 */
export const SortedAndPaged: Story = {
  render: ({ label }) => <SortedAndPagedMachines label={label} />,
  parameters: consumerCode({
    parts: ["DataViews", "type DisplayField"],
    imports: `import { machineCollection, machines } from "./machines.js";
// A work-in-progress spike: not yet exported from the package root.
import { Cards } from "./DataViews/Cards.js";`,
    query: "page=1&size=5",
    declarations: fieldsCode,
    render: `<DataViews provider={provider}>
  <DataViews.SortPanel />
  <Cards fields={fields} title="name" label="Machines" selectable />
  <DataViews.Pagination sizes={[5, 10]} />
</DataViews>`,
  }),
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 rows",
      ),
    );
    await expect(canvas.getAllByRole("listitem")).toHaveLength(5);
  },
};

/** A table and cards over one root, through the renderer switch. */
function TableOrCardsMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({ query: "page=1&size=5" });
  return (
    <DataViews provider={provider}>
      <RendererSwitch
        label="Show machines as"
        renderers={[
          {
            id: "table",
            label: "Table",
            content: (
              <DataViews.DataTable
                columns={fields}
                label={label}
                selectable
                rowLabel={(row) => String(row["name"])}
              />
            ),
          },
          {
            id: "cards",
            label: "Cards",
            content: (
              <ConnectedCards
                fields={fields}
                title="name"
                label={label}
                selectable
                rowLabel={(row) => String(row["name"])}
              />
            ),
          },
        ]}
      />
      <DataViews.Pagination sizes={[5, 10]} />
    </DataViews>
  );
}

/**
 * Table or cards: one query, one page and one selection, shown as a table or
 * as cards. A machine selected in the table is selected on its card, and the
 * page stays where it was. Without scripting the table and the cards are
 * drawn in turn.
 */
export const TableOrCards: Story = {
  render: ({ label }) => <TableOrCardsMachines label={label} />,
  parameters: consumerCode({
    parts: ["DataViews", "type DisplayField"],
    imports: `import { machineCollection, machines } from "./machines.js";
// Work-in-progress spikes: not yet exported from the package root.
import { Cards } from "./DataViews/Cards.js";
import { RendererSwitch } from "./RendererSwitch.js";`,
    query: "page=1&size=5",
    declarations: fieldsCode,
    render: `<DataViews provider={provider}>
  <RendererSwitch
    label="Show machines as"
    renderers={[
      {
        id: "table",
        label: "Table",
        content: <DataViews.DataTable columns={fields} label="Machines" selectable />,
      },
      {
        id: "cards",
        label: "Cards",
        content: <Cards fields={fields} title="name" label="Machines" selectable />,
      },
    ]}
  />
  <DataViews.Pagination sizes={[5, 10]} />
</DataViews>`,
  }),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Select alder.example.com" }),
    );
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Show machines as" }),
      "cards",
    );
    const card = await canvas.findByRole("listitem", {
      name: "alder.example.com",
    });
    await expect(
      within(card).getByRole("checkbox", { name: "Select alder.example.com" }),
    ).toBeChecked();
  },
};

/** Cards over the REST endpoint, with the pagination bar reaching it too. */
function RestBackedMachines({
  label,
}: {
  readonly label: string;
}): ReactElement {
  const provider = useMachineProvider({
    source: () => createRestMachineSource("live"),
    query: "page=1&size=5",
  });
  return (
    <DataViews provider={provider}>
      <ConnectedCards
        fields={fields}
        title="name"
        label={label}
        rowLabel={(row) => String(row["name"])}
      />
      <DataViews.Pagination sizes={[5, 10]} />
    </DataViews>
  );
}

/**
 * REST-backed: the same cards over a REST endpoint reached through TanStack
 * Query. The endpoint pages and counts; the cards draw the page it answers,
 * and say they are loading until it does.
 */
export const RestBacked: Story = {
  loaders: [createMockApiLoader(createRestHandlers({ latency: 300 }))],
  render: ({ label }) => <RestBackedMachines label={label} />,
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(readPaginationSummary(canvas)).toHaveTextContent(
        "Showing 1–5 out of 12 rows",
      ),
    );
    await expect(canvas.getAllByRole("listitem")).toHaveLength(5);
  },
};
