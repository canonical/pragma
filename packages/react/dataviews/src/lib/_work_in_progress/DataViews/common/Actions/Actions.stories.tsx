import {
  type ActionCapabilities,
  createArraySource,
  DEFAULT_WINDOW,
  type Source,
} from "@canonical/dataviews-core";
import { Button, type ButtonProps } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement, ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withAppScope } from "../../../../../storybook/decorators.js";
import { consumerCode } from "../../../../../storybook/machines/consumerCode.js";
import {
  type Machine,
  machineCollection,
  machines,
} from "../../../../../storybook/machines/fixtures.js";
import {
  hostName,
  useMachineProvider,
} from "../../../../../storybook/machines/story-utils.js";
import { DataTable, type DataTableColumn } from "../../../DataTable/index.js";
import { useDataViews, useDataViewsValue } from "../../hooks/index.js";
import DataViews from "../../Provider.js";
import Pagination from "../Pagination/Pagination.js";
import Component from "./Actions.js";

const meta = {
  title: "_work_in_progress/DataViews/Actions",
  component: Component,
  decorators: [withAppScope],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "owner", header: "Owner" },
];

/**
 * A source that can archive and delete machines. Both actions take the
 * machines out of the collection, and every live request delivers again.
 */
const createManagedSource = (): Source<Machine> => {
  let remaining: readonly Machine[] = machines;
  const overAnyRows: ActionCapabilities = { targets: "explicit", limit: null };
  const managed = createArraySource<Machine>({
    rows: remaining,
    collection: machineCollection,
    actions: { archive: overAnyRows, delete: overAnyRows },
    runAction: async ({ targets }) => {
      const ids = targets.kind === "explicit" ? targets.ids : [];
      remaining = remaining.filter((row) => !ids.includes(row.id));
      managed.setRows(remaining);
      return ids.map((target) => ({
        target,
        status: "succeeded" as const,
      }));
    },
  });
  return managed;
};

/**
 * One action over the selection: pressed, it runs through the provider,
 * which captures the selection as its targets, calls the source's action
 * and removes the targets that succeed from the selection.
 */
function SelectionAction({
  action,
  ...button
}: Omit<ButtonProps, "onClick"> & {
  readonly action: string;
}): ReactElement {
  const { runAction } = useDataViews(machineCollection);
  return (
    <Button
      {...button}
      type="button"
      importance="tertiary"
      onClick={() => {
        // Targets left out: the action addresses the selection.
        void runAction({ action });
      }}
    />
  );
}

/**
 * The machines over a source that can archive and delete them, five to a
 * page, with the table, the action bar and the pagination bar.
 */
function ManagedMachines({
  select = [],
  indicator,
}: {
  readonly select?: readonly string[] | undefined;
  readonly indicator?: ReactNode;
}): ReactElement {
  const provider = useMachineProvider({
    source: createManagedSource,
    window: { ...DEFAULT_WINDOW, page: 1, size: 5 },
    prepare: (built) => {
      built.selection.add(select);
    },
  });
  return (
    <DataViews provider={provider}>
      <DataTable
        provider={provider}
        columns={columns}
        label="Machines"
        selectable
        rowLabel={hostName}
      />
      <Component indicator={indicator}>
        <SelectionAction action="archive">Archive</SelectionAction>
        <SelectionAction
          action="delete"
          anticipation="destructive"
          icon="delete"
        >
          Delete
        </SelectionAction>
      </Component>
      <Pagination sizes={[5, 10]} />
    </DataViews>
  );
}

const selectionActionCode = `const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
  { id: "owner", header: "Owner" },
];

// Pressed, it runs through the provider, which captures the selection as
// its targets, runs the source's action and removes the ones that succeed.
function SelectionAction({
  action,
  ...button
}: Omit<ButtonProps, "onClick"> & { action: string }) {
  const { runAction } = useDataViews(machineCollection);
  return (
    <Button
      {...button}
      type="button"
      importance="tertiary"
      onClick={() => {
        // Targets left out: the action addresses the selection.
        void runAction({ action });
      }}
    />
  );
}`;

/** A story's consumer code: the collection, its action bar and its actions. */
const actionsCode = ({
  prepare,
  indicator = "",
  declarations = "",
}: {
  readonly prepare?: string | undefined;
  readonly indicator?: string | undefined;
  readonly declarations?: string | undefined;
} = {}) =>
  consumerCode({
    parts: [
      "DataTable",
      "DataViews",
      "type DataTableColumn",
      "useDataViews",
      ...(declarations === "" ? [] : ["useDataViewsValue"]),
    ],
    imports: `import { Button, type ButtonProps } from "@canonical/react-ds-global";
import { archiveMachines, machineCollection, machines } from "./machines.js";`,
    declarations: `${selectionActionCode}${declarations}`,
    // Spelled relative to the `source:` line it follows, as the default is.
    source: `createArraySource({
  rows: machines,
  collection: machineCollection,
  // What each operation may address; nothing else can be run.
  actions: {
    archive: { targets: "explicit", limit: null },
    delete: { targets: "explicit", limit: null },
  },
  // Resolves with one outcome per target: { target, status }.
  runAction: ({ action, targets }) => archiveMachines(action, targets),
})`,
    window: "{ ...DEFAULT_WINDOW, page: 1, size: 5 }",
    prepare,
    render: `<DataViews provider={provider}>
  <DataTable
    provider={provider}
    columns={columns}
    label="Machines"
    selectable
    rowLabel={(row) => row.name}
  />
  <DataViews.Actions${indicator}>
    <SelectionAction action="archive">Archive</SelectionAction>
    <SelectionAction action="delete" anticipation="destructive" icon="delete">
      Delete
    </SelectionAction>
  </DataViews.Actions>
  <DataViews.Pagination sizes={[5, 10]} />
</DataViews>`,
  });

const selectTwo = `provider.selection.add(["m-02", "m-06"]);`;

/**
 * Nothing selected: the table and the pagination bar, and no action bar. It
 * appears with the first selection.
 */
export const NothingSelected: Story = {
  parameters: actionsCode(),
  render: () => <ManagedMachines />,
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–5 out of 12 items",
      ),
    );
    await expect(canvas.queryByRole("group")).toBeNull();
  },
};

/**
 * Two selected: the bar counts them, offers the actions placed in it — a
 * destructive one in the Button's destructive colour — and a deselect named
 * with what it clears. It renders on the design system's contrasted surface.
 */
export const TwoSelected: Story = {
  parameters: actionsCode({ prepare: selectTwo }),
  render: () => <ManagedMachines select={["m-02", "m-06"]} />,
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole("group", { name: "Selection actions" });
    await expect(bar).toHaveTextContent("2 selected");
    await expect(
      canvas.getByRole("button", { name: "Deselect 2 items" }),
    ).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Archive" })).toBeEnabled();
  },
};

/**
 * Selected across pages: birch is on this page and ironwood on the second.
 * The count is the whole selection, not the rows on screen.
 */
export const SelectedAcrossPages: Story = {
  parameters: actionsCode({
    prepare: `provider.selection.add(["m-02", "m-09"]);`,
  }),
  render: () => <ManagedMachines select={["m-02", "m-09"]} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Select birch.example.com" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("group", { name: "Selection actions" }),
    ).toHaveTextContent("2 selected");
  },
};

/** A count that names what is selected, following the selection. */
function MachinesSelected(): ReactElement {
  const { selection } = useDataViews(machineCollection);
  const count = useDataViewsValue(selection.state).ids.size;
  return (
    <span role="status" className="indicator">
      {`${count} ${count === 1 ? "machine" : "machines"} selected`}
    </span>
  );
}

const machinesSelectedCode = `

// Follows the selection, and announces it as the default count does.
function MachinesSelected() {
  const { selection } = useDataViews(machineCollection);
  const count = useDataViewsValue(selection.state).ids.size;
  return (
    <span role="status" className="indicator">
      {\`\${count} \${count === 1 ? "machine" : "machines"} selected\`}
    </span>
  );
}`;

/**
 * A caller's indicator: a count that names what is selected. It reads the
 * selection itself, and announces it as the default count does. When the
 * persistent selection panel ships, its trigger takes this place.
 */
export const CustomIndicator: Story = {
  parameters: actionsCode({
    prepare: selectTwo,
    indicator: " indicator={<MachinesSelected />}",
    declarations: machinesSelectedCode,
  }),
  render: () => (
    <ManagedMachines
      select={["m-02", "m-06"]}
      indicator={<MachinesSelected />}
    />
  ),
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole("group", {
      name: "Selection actions",
    });
    await expect(within(bar).getByRole("status")).toHaveTextContent(
      "2 machines selected",
    );
  },
};

/**
 * Archived: two machines were selected and Archive was pressed. The source
 * archived both, they left the collection and the selection, and with nothing
 * left selected the bar went with them. Ten machines remain.
 */
export const Archived: Story = {
  parameters: actionsCode({ prepare: selectTwo }),
  render: () => <ManagedMachines select={["m-02", "m-06"]} />,
  play: async ({ canvas }) => {
    const archive = await canvas.findByRole("button", { name: "Archive" });
    await userEvent.click(archive);
    await waitFor(() => expect(canvas.queryByRole("group")).toBeNull());
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Showing 1–5 out of 10 items",
      ),
    );
  },
};
